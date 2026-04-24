import { prisma } from '../../lib/prisma'
import { createLog, type LogActor } from '../logs/log.service'

const NUMERIC_FIELDS = ['phone', 'document', 'zipCode']
const strip = (val: unknown) => typeof val === 'string' ? val.replace(/\D/g, '') : val

function stripClientData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data }
  for (const field of NUMERIC_FIELDS) {
    if (field in result && result[field] != null) result[field] = strip(result[field])
  }
  return result
}

interface ListClientsQuery {
  page: number
  limit: number
  search?: string
  searchFields?: 'nameOrDocument'
  statusIds?: number[]
  userIds?: number[]
  dateFrom?: string
  dateTo?: string
  appointmentDateFrom?: string
  appointmentDateTo?: string
}

interface ClientInput {
  name: string
  email?: string | null
  phone: string
  document?: string | null
  documentType?: string | null
  address?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  statusId?: number | null
  userId?: number | null
}

export async function listClientsService(query: ListClientsQuery, companyId: number) {
  const { page, limit, search, searchFields, statusIds, userIds, dateFrom, dateTo, appointmentDateFrom, appointmentDateTo } = query
  const skip = (page - 1) * limit

  const strippedSearch = search ? search.replace(/\D/g, '') : ''

  const searchOR = search
    ? searchFields === 'nameOrDocument'
      ? [
          { name: { contains: search, mode: 'insensitive' as const } },
          ...(strippedSearch ? [{ document: { contains: strippedSearch, mode: 'insensitive' as const } }] : []),
        ]
      : [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
          ...(strippedSearch ? [{ document: { contains: strippedSearch, mode: 'insensitive' as const } }] : []),
        ]
    : undefined

  const where = {
    companyId,
    deletedAt: null,
    ...(searchOR && { OR: searchOR }),
    ...(statusIds && statusIds.length > 0 && { statusId: { in: statusIds } }),
    ...(userIds && userIds.length > 0 && { userId: { in: userIds } }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
    ...((appointmentDateFrom || appointmentDateTo) && {
      appointments: {
        some: {
          deletedAt: null,
          startAt: {
            ...(appointmentDateFrom && { gte: new Date(appointmentDateFrom) }),
            ...(appointmentDateTo && { lte: new Date(appointmentDateTo) }),
          },
        },
      },
    }),
  }

  const include = {
    user: { select: { id: true, name: true, avatar: true } },
    clientStatus: { select: { id: true, name: true, color: true } },
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({ where, skip, take: limit, orderBy: { name: 'asc' }, include }),
    prisma.client.count({ where }),
  ])

  return {
    data: clients,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export async function getClientByIdService(id: number, companyId: number) {
  const client = await prisma.client.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      clientStatus: { select: { id: true, name: true, color: true } },
    },
  })

  if (!client) {
    throw { statusCode: 404, message: 'Cliente não encontrado.' }
  }

  return client
}

export async function createClientService(data: ClientInput, companyId: number, actor: LogActor) {
  const client = await prisma.client.create({
    data: { ...stripClientData(data as Record<string, unknown>) as ClientInput, companyId },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      clientStatus: { select: { id: true, name: true, color: true } },
    },
  })
  await createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'clients',
    action: 'create',
    entityId: client.id,
    entityName: client.name,
    description: `Cadastrou o cliente ${client.name}`,
    metadata: { name: client.name, phone: client.phone, email: client.email },
  })
  return client
}

export async function updateClientService(id: number, data: Partial<ClientInput>, companyId: number, actor: LogActor) {
  const client = await prisma.client.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!client) {
    throw { statusCode: 404, message: 'Cliente não encontrado.' }
  }

  const strippedData = stripClientData(data as Record<string, unknown>) as Partial<ClientInput>

  const updated = await prisma.client.update({
    where: { id },
    data: strippedData,
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      clientStatus: { select: { id: true, name: true, color: true } },
    },
  })

  const changedKeys = Object.keys(strippedData).filter((k) => {
    const newVal = (strippedData as any)[k]
    const oldVal = NUMERIC_FIELDS.includes(k) ? strip((client as any)[k]) : (client as any)[k]
    return newVal !== oldVal
  })

  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}

  for (const k of changedKeys) {
    const prevVal = NUMERIC_FIELDS.includes(k) ? strip((client as any)[k]) : (client as any)[k]
    const nextVal = (strippedData as any)[k]

    if (k === 'statusId') {
      const [prevStatus, nextStatus] = await Promise.all([
        prevVal != null ? prisma.clientStatus.findUnique({ where: { id: prevVal }, select: { name: true } }) : null,
        nextVal != null ? prisma.clientStatus.findUnique({ where: { id: nextVal }, select: { name: true } }) : null,
      ])
      before['status'] = prevStatus?.name ?? null
      after['status'] = nextStatus?.name ?? null
    } else if (k === 'userId') {
      const [prevUser, nextUser] = await Promise.all([
        prevVal != null ? prisma.user.findUnique({ where: { id: prevVal }, select: { name: true } }) : null,
        nextVal != null ? prisma.user.findUnique({ where: { id: nextVal }, select: { name: true } }) : null,
      ])
      before['colaborador'] = prevUser?.name ?? null
      after['colaborador'] = nextUser?.name ?? null
    } else {
      before[k] = prevVal
      after[k] = nextVal
    }
  }

  if (changedKeys.length > 0) {
    await createLog({
      companyId,
      userId: actor.userId,
      userName: actor.userName,
      module: 'clients',
      action: 'edit',
      entityId: updated.id,
      entityName: updated.name,
      description: `Editou o cliente ${updated.name}`,
      metadata: { before, after },
    })
  }

  return updated
}

export async function deleteClientService(id: number, companyId: number, actor: LogActor) {
  const client = await prisma.client.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!client) {
    throw { statusCode: 404, message: 'Cliente não encontrado.' }
  }

  await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  await createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'clients',
    action: 'delete',
    entityId: client.id,
    entityName: client.name,
    description: `Excluiu o cliente ${client.name}`,
  })
}
