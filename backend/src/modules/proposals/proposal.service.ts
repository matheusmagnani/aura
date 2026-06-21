import { prisma } from '../../lib/prisma'
import { createLog, type LogActor } from '../logs/log.service'

const PROPOSAL_STATUS_LABELS: Record<number, string> = {
  1: 'Pendente',
  2: 'Enviada',
  3: 'Aceita',
  4: 'Recusada',
}

interface ListProposalsQuery {
  page: number
  limit: number
  search?: string
  clientId?: number
  collaboratorId?: number
  idStatus?: number
  statuses?: number[]
  dateFrom?: string
  dateTo?: string
  statusChangedFrom?: string
  statusChangedTo?: string
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  money: 'Dinheiro',
  pix: 'Pix',
  boleto: 'Boleto',
  card: 'Cartão',
}

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  business: 'úteis',
  calendar: 'corridos',
}

function formatDeadline(days: number | null | undefined, type: string | null | undefined): string {
  if (!days) return ''
  const typeLabel = type ? (DEADLINE_TYPE_LABELS[type] ?? type) : 'dias'
  return `${days} dia${days !== 1 ? 's' : ''} ${typeLabel}`
}

interface ProposalInput {
  value: number
  description?: string | null
  clientObservation?: string | null
  idStatus?: number
  clientId: number
  collaboratorId?: number | null
  deadlineDays?: number | null
  deadlineType?: string | null
  signalValue?: number | null
  signalPaymentMethod?: string | null
  remainingPaymentMethod?: string | null
}

const proposalInclude = {
  client: { select: { id: true, name: true } },
  collaborator: { select: { id: true, name: true, avatar: true, color: true } },
}

const PROPOSAL_ID_STATUSES = [1, 2, 3, 4] as const

export async function getProposalStatusStatsService(
  query: {
    collaboratorId?: number
    clientId?: number
    dateFrom?: string
    dateTo?: string
    statusChangedFrom?: string
    statusChangedTo?: string
  },
  companyId: number,
) {
  const { collaboratorId, clientId, dateFrom, dateTo, statusChangedFrom, statusChangedTo } = query
  const where = {
    companyId,
    deletedAt: null,
    ...(collaboratorId && { collaboratorId }),
    ...(clientId && { clientId }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
    ...((statusChangedFrom || statusChangedTo) && {
      statusChangedAt: {
        ...(statusChangedFrom && { gte: new Date(statusChangedFrom) }),
        ...(statusChangedTo && { lte: new Date(statusChangedTo) }),
      },
    }),
  }

  const grouped = await prisma.proposal.groupBy({
    by: ['idStatus'],
    where,
    _count: { id: true },
    _sum: { value: true },
  })

  return PROPOSAL_ID_STATUSES.map(idStatus => {
    const row = grouped.find(g => g.idStatus === idStatus)
    return {
      idStatus,
      count: row?._count.id ?? 0,
      totalValue: Number(row?._sum.value ?? 0),
    }
  })
}

export async function listProposalsService(query: ListProposalsQuery, companyId: number) {
  const { page, limit, search, clientId, collaboratorId, idStatus, statuses, dateFrom, dateTo, statusChangedFrom, statusChangedTo } = query
  const skip = (page - 1) * limit

  const activeStatuses = statuses && statuses.length > 0 ? statuses : idStatus ? [idStatus] : undefined

  const where: Record<string, unknown> = {
    companyId,
    deletedAt: null,
    ...(clientId && { clientId }),
    ...(collaboratorId && { collaboratorId }),
    ...(activeStatuses && { idStatus: activeStatuses.length === 1 ? activeStatuses[0] : { in: activeStatuses } }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
    ...((statusChangedFrom || statusChangedTo) && {
      statusChangedAt: {
        ...(statusChangedFrom && { gte: new Date(statusChangedFrom) }),
        ...(statusChangedTo && { lte: new Date(statusChangedTo) }),
      },
    }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  }

  const [proposals, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: proposalInclude,
    }),
    prisma.proposal.count({ where }),
  ])

  return {
    data: proposals,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export async function getProposalByIdService(id: number, companyId: number) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, companyId, deletedAt: null },
    include: proposalInclude,
  })

  if (!proposal) {
    throw { statusCode: 404, message: 'Proposta não encontrada.' }
  }

  return proposal
}

export async function createProposalService(data: ProposalInput, companyId: number, actor: LogActor) {
  const proposal = await prisma.proposal.create({
    data: {
      value: data.value,
      description: data.description ?? null,
      clientObservation: data.clientObservation ?? null,
      idStatus: data.idStatus ?? 1,
      statusChangedAt: new Date(),
      companyId,
      clientId: data.clientId,
      collaboratorId: data.collaboratorId ?? null,
      deadlineDays: data.deadlineDays ?? null,
      deadlineType: data.deadlineType ?? null,
      signalValue: data.signalValue ?? null,
      signalPaymentMethod: data.signalPaymentMethod ?? null,
      remainingPaymentMethod: data.remainingPaymentMethod ?? null,
    },
    include: proposalInclude,
  })

  createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'clients',
    action: 'create',
    entityId: proposal.client.id,
    entityName: proposal.client.name,
    description: `Criou proposta de ${Number(proposal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para ${proposal.client.name}`,
    metadata: { value: Number(proposal.value), idStatus: proposal.idStatus, clientId: proposal.clientId },
  }).catch(() => {})

  return proposal
}

export async function updateProposalService(
  id: number,
  data: Partial<Omit<ProposalInput, 'clientId'>>,
  companyId: number,
  actor: LogActor,
) {
  const existing = await prisma.proposal.findFirst({
    where: { id, companyId, deletedAt: null },
    include: proposalInclude,
  })

  if (!existing) {
    throw { statusCode: 404, message: 'Proposta não encontrada.' }
  }

  const updateData: Record<string, unknown> = {}
  if (data.value !== undefined) updateData.value = data.value
  if (data.description !== undefined) updateData.description = data.description ?? null
  if (data.clientObservation !== undefined) updateData.clientObservation = data.clientObservation ?? null
  if (data.idStatus !== undefined) {
    updateData.idStatus = data.idStatus
    if (data.idStatus !== existing.idStatus) updateData.statusChangedAt = new Date()
  }
  if (data.collaboratorId !== undefined) updateData.collaboratorId = data.collaboratorId ?? null
  if (data.deadlineDays !== undefined) updateData.deadlineDays = data.deadlineDays ?? null
  if (data.deadlineType !== undefined) updateData.deadlineType = data.deadlineType ?? null
  if (data.signalValue !== undefined) updateData.signalValue = data.signalValue ?? null
  if (data.signalPaymentMethod !== undefined) updateData.signalPaymentMethod = data.signalPaymentMethod ?? null
  if (data.remainingPaymentMethod !== undefined) updateData.remainingPaymentMethod = data.remainingPaymentMethod ?? null

  const updated = await prisma.proposal.update({
    where: { id },
    data: updateData,
    include: proposalInclude,
  })

  const DECIMAL_FIELDS = new Set(['value', 'signalValue'])
  const changedKeys = Object.keys(updateData).filter((k) => {
    if (k === 'statusChangedAt') return false
    const newVal = DECIMAL_FIELDS.has(k) ? Number(updateData[k]) : updateData[k]
    const oldVal = DECIMAL_FIELDS.has(k) ? Number((existing as any)[k]) : (existing as any)[k]
    return newVal !== oldVal
  })

  if (changedKeys.length > 0) {
    const before: Record<string, unknown> = {}
    const after: Record<string, unknown> = {}
    for (const k of changedKeys) {
      if (k === 'idStatus') {
        before['statusProposta'] = PROPOSAL_STATUS_LABELS[(existing as any)[k]] ?? String((existing as any)[k])
        after['statusProposta'] = PROPOSAL_STATUS_LABELS[(updateData as any)[k]] ?? String((updateData as any)[k])
      } else if (k === 'signalPaymentMethod' || k === 'remainingPaymentMethod') {
        before[k] = (existing as any)[k] ? (PAYMENT_METHOD_LABELS[(existing as any)[k]] ?? (existing as any)[k]) : null
        after[k] = updateData[k] ? (PAYMENT_METHOD_LABELS[updateData[k] as string] ?? updateData[k]) : null
      } else if (k === 'deadlineType') {
        before[k] = (existing as any)[k] ? (DEADLINE_TYPE_LABELS[(existing as any)[k]] ?? (existing as any)[k]) : null
        after[k] = updateData[k] ? (DEADLINE_TYPE_LABELS[updateData[k] as string] ?? updateData[k]) : null
      } else {
        before[k] = k === 'value' || k === 'signalValue' ? Number((existing as any)[k]) : (existing as any)[k]
        after[k] = k === 'value' || k === 'signalValue' ? Number(updateData[k]) : updateData[k]
      }
    }

    createLog({
      companyId,
      userId: actor.userId,
      userName: actor.userName,
      module: 'clients',
      action: 'edit',
      entityId: updated.client.id,
      entityName: updated.client.name,
      description: `Editou proposta de ${Number(existing.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      metadata: { before, after },
    }).catch(() => {})
  }

  return updated
}

export async function deleteProposalService(id: number, companyId: number, actor: LogActor) {
  const proposal = await prisma.proposal.findFirst({
    where: { id, companyId, deletedAt: null },
    include: proposalInclude,
  })

  if (!proposal) {
    throw { statusCode: 404, message: 'Proposta não encontrada.' }
  }

  await prisma.proposal.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'clients',
    action: 'delete',
    entityId: proposal.client.id,
    entityName: proposal.client.name,
    description: `Excluiu proposta de ${Number(proposal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
  }).catch(() => {})
}
