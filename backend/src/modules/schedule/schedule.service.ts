import { prisma } from '../../lib/prisma'
import { createLog, type LogActor } from '../logs/log.service'

const APPOINTMENT_STATUS_LABELS: Record<number, string> = {
  1: 'Pendente',
  2: 'Concluído',
  3: 'Cancelado',
}

interface ListAppointmentsQuery {
  dateFrom?: string
  dateTo?: string
  clientId?: number
  collaboratorId?: number
  page?: number
  limit?: number
}

interface AppointmentInput {
  title: string
  description?: string | null
  startAt: string
  idStatus?: number
  clientId?: number
  collaboratorId?: number | null
}

const appointmentInclude = {
  client: { select: { id: true, name: true } },
  collaborator: { select: { id: true, name: true, avatar: true } },
}

export async function listAppointmentsService(query: ListAppointmentsQuery, companyId: number) {
  const { dateFrom, dateTo, clientId, collaboratorId, page, limit } = query

  const where = {
    companyId,
    deletedAt: null,
    ...(clientId && { clientId }),
    ...(collaboratorId && { collaboratorId }),
    ...((dateFrom || dateTo) && {
      startAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
  }

  if (page !== undefined && limit !== undefined) {
    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { startAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ])
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  return prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: { startAt: 'asc' },
  })
}

export async function getAppointmentByIdService(id: number, companyId: number) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, companyId, deletedAt: null },
    include: appointmentInclude,
  })

  if (!appointment) {
    throw { statusCode: 404, message: 'Agendamento não encontrado.' }
  }

  return appointment
}

export async function createAppointmentService(data: AppointmentInput, companyId: number, actor: LogActor) {
  const appointment = await prisma.appointment.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      startAt: new Date(data.startAt),
      companyId,
      clientId: data.clientId ?? null,
      collaboratorId: data.collaboratorId ?? null,
    },
    include: appointmentInclude,
  })

  createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'clients',
    action: 'create',
    entityId: appointment.client!.id,
    entityName: appointment.client!.name,
    description: `Criou o agendamento "${appointment.title}" para ${appointment.client!.name}`,
    metadata: { title: appointment.title, startAt: appointment.startAt },
  }).catch(() => {})

  return appointment
}

export async function updateAppointmentService(
  id: number,
  data: Partial<AppointmentInput>,
  companyId: number,
  actor: LogActor,
) {
  const existing = await prisma.appointment.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!existing) {
    throw { statusCode: 404, message: 'Agendamento não encontrado.' }
  }

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description ?? null
  if (data.startAt !== undefined) updateData.startAt = new Date(data.startAt)
  if (data.collaboratorId !== undefined) updateData.collaboratorId = data.collaboratorId ?? null
  if (data.idStatus !== undefined && data.idStatus !== (existing as any).idStatus) {
    updateData.idStatus = data.idStatus
    updateData.statusChangedAt = new Date()
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: appointmentInclude,
  })

  const SKIP_LOG_KEYS = new Set(['statusChangedAt'])

  const changedKeys = Object.keys(updateData).filter((k) => {
    if (SKIP_LOG_KEYS.has(k)) return false
    const newVal = k === 'startAt' ? (updateData[k] as Date).toISOString() : updateData[k]
    const oldVal = k === 'startAt' ? (existing as any)[k].toISOString() : (existing as any)[k]
    return newVal !== oldVal
  })

  if (changedKeys.length > 0) {
    const onlyStartAt = changedKeys.length === 1 && changedKeys[0] === 'startAt'
    const onlyStatus = changedKeys.length === 1 && changedKeys[0] === 'idStatus'

    const oldStatusLabel = APPOINTMENT_STATUS_LABELS[(existing as any).idStatus] ?? String((existing as any).idStatus)
    const newStatusLabel = APPOINTMENT_STATUS_LABELS[data.idStatus!] ?? String(data.idStatus)

    const description = onlyStartAt
      ? `Reagendou "${updated.title}"`
      : onlyStatus
        ? `Alterou status do agendamento "${updated.title}" de ${oldStatusLabel} para ${newStatusLabel}`
        : `Editou o agendamento "${updated.title}"`

    const before: Record<string, unknown> = {}
    const after: Record<string, unknown> = {}
    for (const k of changedKeys) {
      if (k === 'startAt') {
        before['Data/hora'] = (existing as any)[k].toISOString()
        after['Data/hora'] = (updateData[k] as Date).toISOString()
      } else if (k === 'idStatus') {
        const statusKey = `Status do agendamento "${updated.title}"`
        before[statusKey] = oldStatusLabel
        after[statusKey] = newStatusLabel
      } else {
        before[k] = (existing as any)[k]
        after[k] = updateData[k]
      }
    }

    createLog({
      companyId,
      userId: actor.userId,
      userName: actor.userName,
      module: 'clients',
      action: 'edit',
      entityId: updated.client!.id,
      entityName: updated.client!.name,
      description,
      metadata: { before, after },
    }).catch(() => {})
  }

  return updated
}

export async function deleteAppointmentService(id: number, companyId: number, actor: LogActor) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, companyId, deletedAt: null },
    include: appointmentInclude,
  })

  if (!appointment) {
    throw { statusCode: 404, message: 'Agendamento não encontrado.' }
  }

  await prisma.appointment.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'clients',
    action: 'delete',
    entityId: appointment.client!.id,
    entityName: appointment.client!.name,
    description: `Excluiu o agendamento "${appointment.title}"`,
  }).catch(() => {})
}
