import { prisma } from '../../lib/prisma'
import { createLog, type LogActor } from '../logs/log.service'

interface ListAppointmentsQuery {
  dateFrom?: string
  dateTo?: string
  clientId?: number
  collaboratorId?: number
}

interface AppointmentInput {
  title: string
  description?: string | null
  startAt: string
  clientId?: number
  collaboratorId?: number | null
}

const appointmentInclude = {
  client: { select: { id: true, name: true } },
  collaborator: { select: { id: true, name: true, avatar: true } },
}

export async function listAppointmentsService(query: ListAppointmentsQuery, companyId: number) {
  const { dateFrom, dateTo, clientId, collaboratorId } = query

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

  const appointments = await prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: { startAt: 'asc' },
  })

  return appointments
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
    description: `Criou o agendamento "${appointment.title}"`,
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

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: appointmentInclude,
  })

  const changedKeys = Object.keys(updateData).filter((k) => {
    const newVal = k === 'startAt' ? (updateData[k] as Date).toISOString() : updateData[k]
    const oldVal = k === 'startAt' ? (existing as any)[k].toISOString() : (existing as any)[k]
    return newVal !== oldVal
  })

  if (changedKeys.length > 0) {
    const onlyStartAtChanged = changedKeys.length === 1 && changedKeys[0] === 'startAt'
    const description = onlyStartAtChanged
      ? `Reagendou "${updated.title}"`
      : `Editou o agendamento "${updated.title}"`

    const before: Record<string, unknown> = {}
    const after: Record<string, unknown> = {}
    for (const k of changedKeys) {
      before[k] = k === 'startAt' ? (existing as any)[k].toISOString() : (existing as any)[k]
      after[k] = k === 'startAt' ? (updateData[k] as Date).toISOString() : updateData[k]
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
