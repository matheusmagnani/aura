import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import {
  listAppointmentsService,
  createAppointmentService,
  updateAppointmentService,
  deleteAppointmentService,
} from '../schedule/schedule.service'
import {
  listClientsService,
  getClientStatusStatsService,
  createClientService,
  updateClientService,
  deleteClientService,
} from '../clients/client.service'
import {
  listProposalsService,
  getProposalStatusStatsService,
  createProposalService,
  updateProposalService,
  deleteProposalService,
} from '../proposals/proposal.service'
import { listClientStatusesService } from '../client-statuses/client-status.service'
import { listLogsService, getActorName } from '../logs/log.service'

async function isAdmin(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { roleId: true },
  })
  return user?.roleId === null
}

export async function dashboardAppointmentsController(request: FastifyRequest, reply: FastifyReply) {
  const { dateFrom, dateTo, collaboratorId, clientId } = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    collaboratorId: z.coerce.number().optional(),
    clientId: z.coerce.number().optional(),
  }).parse(request.query)

  const { userId, companyId } = request.user as { userId: number; companyId: number }
  const admin = await isAdmin(userId)

  const result = await listAppointmentsService(
    {
      dateFrom,
      dateTo,
      clientId,
      collaboratorId: admin ? (collaboratorId || undefined) : userId,
    },
    companyId,
  )
  return reply.send(result)
}

export async function dashboardClientsController(request: FastifyRequest, reply: FastifyReply) {
  const query = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(10),
    search: z.string().optional(),
    statusIds: z.string().optional().transform(v => v ? v.split(',').map(Number) : undefined),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    appointmentDateFrom: z.string().optional(),
    appointmentDateTo: z.string().optional(),
  }).parse(request.query)

  const { userId, companyId } = request.user as { userId: number; companyId: number }
  const admin = await isAdmin(userId)

  const result = await listClientsService(
    {
      ...query,
      userIds: admin ? undefined : [userId],
    },
    companyId,
  )
  return reply.send(result)
}

export async function dashboardClientStatsController(request: FastifyRequest, reply: FastifyReply) {
  const query = z.object({
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    appointmentDateFrom: z.string().optional(),
    appointmentDateTo: z.string().optional(),
  }).parse(request.query)

  const { userId, companyId } = request.user as { userId: number; companyId: number }
  const admin = await isAdmin(userId)

  const result = await getClientStatusStatsService(
    {
      ...query,
      userIds: admin ? undefined : [userId],
    },
    companyId,
  )
  return reply.send(result)
}

export async function dashboardProposalsController(request: FastifyRequest, reply: FastifyReply) {
  const query = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(10),
    search: z.string().optional(),
    clientId: z.coerce.number().optional(),
    collaboratorId: z.coerce.number().optional(),
    statuses: z.string().optional().transform(v => v ? v.split(',') : undefined),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    statusChangedFrom: z.string().optional(),
    statusChangedTo: z.string().optional(),
  }).parse(request.query)

  const { userId, companyId } = request.user as { userId: number; companyId: number }
  const admin = await isAdmin(userId)

  // Non-admins always scoped to self. Admins respect explicit collaboratorId if provided.
  const resolvedCollaboratorId = admin
    ? (query.collaboratorId ?? undefined)
    : userId

  const result = await listProposalsService(
    {
      ...query,
      collaboratorId: resolvedCollaboratorId,
    },
    companyId,
  )
  return reply.send(result)
}

export async function dashboardProposalStatsController(request: FastifyRequest, reply: FastifyReply) {
  const query = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    statusChangedFrom: z.string().optional(),
    statusChangedTo: z.string().optional(),
  }).parse(request.query)

  const { userId, companyId } = request.user as { userId: number; companyId: number }
  const admin = await isAdmin(userId)

  const result = await getProposalStatusStatsService(
    {
      ...query,
      collaboratorId: admin ? undefined : userId,
    },
    companyId,
  )
  return reply.send(result)
}

export async function dashboardGetClientByIdController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { userId, companyId } = request.user as { userId: number; companyId: number }
  const admin = await isAdmin(userId)

  const client = await prisma.client.findFirst({
    where: {
      id,
      companyId,
      deletedAt: null,
      ...(!admin && { userId }),
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      clientStatus: { select: { id: true, name: true, color: true } },
    },
  })

  if (!client) return reply.status(404).send({ message: 'Cliente não encontrado.' })
  return reply.send(client)
}

// ── Appointments mutations ────────────────────────────────────────────────────

export async function dashboardCreateAppointmentController(request: FastifyRequest, reply: FastifyReply) {
  const data = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().nullable().optional(),
    startAt: z.string().min(1, 'Data/hora é obrigatória'),
    clientId: z.number({ required_error: 'Cliente é obrigatório' }).int().positive(),
    collaboratorId: z.number().nullable().optional(),
  }).parse(request.body)

  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const userName = await getActorName(userId)
  const appointment = await createAppointmentService(data, companyId, { userId, userName, companyId })
  return reply.status(201).send(appointment)
}

export async function dashboardUpdateAppointmentController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const data = z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    startAt: z.string().optional(),
    collaboratorId: z.number().nullable().optional(),
  }).parse(request.body)

  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const admin = await isAdmin(userId)

  if (!admin) {
    const appt = await prisma.appointment.findFirst({ where: { id, companyId, deletedAt: null }, select: { collaboratorId: true } })
    if (!appt) return reply.status(404).send({ message: 'Agendamento não encontrado.' })
    if (appt.collaboratorId !== userId) return reply.status(403).send({ message: 'Sem permissão para editar este agendamento.' })
  }

  const userName = await getActorName(userId)
  const updated = await updateAppointmentService(id, data, companyId, { userId, userName, companyId })
  return reply.send(updated)
}

export async function dashboardDeleteAppointmentController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const admin = await isAdmin(userId)

  if (!admin) {
    const appt = await prisma.appointment.findFirst({ where: { id, companyId, deletedAt: null }, select: { collaboratorId: true } })
    if (!appt) return reply.status(404).send({ message: 'Agendamento não encontrado.' })
    if (appt.collaboratorId !== userId) return reply.status(403).send({ message: 'Sem permissão para excluir este agendamento.' })
  }

  const userName = await getActorName(userId)
  await deleteAppointmentService(id, companyId, { userId, userName, companyId })
  return reply.status(204).send()
}

// ── Clients mutations ─────────────────────────────────────────────────────────

export async function dashboardCreateClientController(request: FastifyRequest, reply: FastifyReply) {
  const data = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido').nullable().optional().or(z.literal('')),
    phone: z.string().min(1, 'Telefone é obrigatório'),
    document: z.string().nullable().optional(),
    documentType: z.enum(['CPF', 'CNPJ']).nullable().optional(),
    address: z.string().nullable().optional(),
    addressNumber: z.string().nullable().optional(),
    addressComplement: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zipCode: z.string().nullable().optional(),
    statusId: z.number().nullable().optional(),
    userId: z.number().nullable().optional(),
  }).parse(request.body)

  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const userName = await getActorName(userId)
  const client = await createClientService(data, companyId, { userId, userName, companyId })
  return reply.status(201).send(client)
}

export async function dashboardUpdateClientController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const data = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().nullable().optional().or(z.literal('')),
    phone: z.string().min(1).optional(),
    document: z.string().nullable().optional(),
    documentType: z.enum(['CPF', 'CNPJ']).nullable().optional(),
    address: z.string().nullable().optional(),
    addressNumber: z.string().nullable().optional(),
    addressComplement: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zipCode: z.string().nullable().optional(),
    statusId: z.number().nullable().optional(),
    userId: z.number().nullable().optional(),
  }).parse(request.body)

  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const admin = await isAdmin(userId)

  if (!admin) {
    const cli = await prisma.client.findFirst({ where: { id, companyId, deletedAt: null }, select: { userId: true } })
    if (!cli) return reply.status(404).send({ message: 'Cliente não encontrado.' })
    if (cli.userId !== userId) return reply.status(403).send({ message: 'Sem permissão para editar este cliente.' })
  }

  const userName = await getActorName(userId)
  const updated = await updateClientService(id, data, companyId, { userId, userName, companyId })
  return reply.send(updated)
}

export async function dashboardDeleteClientController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const admin = await isAdmin(userId)

  if (!admin) {
    const cli = await prisma.client.findFirst({ where: { id, companyId, deletedAt: null }, select: { userId: true } })
    if (!cli) return reply.status(404).send({ message: 'Cliente não encontrado.' })
    if (cli.userId !== userId) return reply.status(403).send({ message: 'Sem permissão para excluir este cliente.' })
  }

  const userName = await getActorName(userId)
  await deleteClientService(id, companyId, { userId, userName, companyId })
  return reply.status(204).send()
}

// ── Client logs ──────────────────────────────────────────────────────────────

export async function dashboardClientLogsController(request: FastifyRequest, reply: FastifyReply) {
  const { entityId } = z.object({ entityId: z.coerce.number() }).parse(request.params)
  const { page, limit } = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(30),
  }).parse(request.query)

  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const admin = await isAdmin(userId)

  const client = await prisma.client.findFirst({
    where: { id: entityId, companyId, deletedAt: null, ...(!admin && { userId }) },
    select: { id: true },
  })
  if (!client) return reply.status(404).send({ message: 'Cliente não encontrado.' })

  const result = await listLogsService({ entityId, companyId, page, limit })
  return reply.send(result)
}

// ── Lookup endpoints ─────────────────────────────────────────────────────────

export async function dashboardClientStatusesController(request: FastifyRequest, reply: FastifyReply) {
  const { companyId } = request.user as { companyId: number }
  const statuses = await listClientStatusesService(companyId)
  return reply.send(statuses)
}

export async function dashboardCollaboratorsSelectController(request: FastifyRequest, reply: FastifyReply) {
  const { companyId } = request.user as { companyId: number }
  const collaborators = await prisma.user.findMany({
    where: { companyId, deletedAt: null, active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return reply.send(collaborators)
}

// ── Proposals mutations ───────────────────────────────────────────────────────

export async function dashboardCreateProposalController(request: FastifyRequest, reply: FastifyReply) {
  const data = z.object({
    value: z.number({ required_error: 'Valor é obrigatório' }).positive('Valor deve ser positivo'),
    description: z.string().nullable().optional(),
    clientObservation: z.string().nullable().optional(),
    status: z.enum(['pending', 'sent', 'accepted', 'refused']).default('pending'),
    clientId: z.number({ required_error: 'Cliente é obrigatório' }).int().positive(),
    collaboratorId: z.number().nullable().optional(),
  }).parse(request.body)

  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const userName = await getActorName(userId)
  const proposal = await createProposalService(data, companyId, { userId, userName, companyId })
  return reply.status(201).send(proposal)
}

export async function dashboardUpdateProposalController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const data = z.object({
    value: z.number().positive().optional(),
    description: z.string().nullable().optional(),
    clientObservation: z.string().nullable().optional(),
    status: z.enum(['pending', 'sent', 'accepted', 'refused']).optional(),
    collaboratorId: z.number().nullable().optional(),
  }).parse(request.body)

  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const admin = await isAdmin(userId)

  if (!admin) {
    const prop = await prisma.proposal.findFirst({ where: { id, companyId, deletedAt: null }, select: { collaboratorId: true } })
    if (!prop) return reply.status(404).send({ message: 'Proposta não encontrada.' })
    if (prop.collaboratorId !== userId) return reply.status(403).send({ message: 'Sem permissão para editar esta proposta.' })
  }

  const userName = await getActorName(userId)
  const updated = await updateProposalService(id, data, companyId, { userId, userName, companyId })
  return reply.send(updated)
}

export async function dashboardDeleteProposalController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const admin = await isAdmin(userId)

  if (!admin) {
    const prop = await prisma.proposal.findFirst({ where: { id, companyId, deletedAt: null }, select: { collaboratorId: true } })
    if (!prop) return reply.status(404).send({ message: 'Proposta não encontrada.' })
    if (prop.collaboratorId !== userId) return reply.status(403).send({ message: 'Sem permissão para excluir esta proposta.' })
  }

  const userName = await getActorName(userId)
  await deleteProposalService(id, companyId, { userId, userName, companyId })
  return reply.status(204).send()
}
