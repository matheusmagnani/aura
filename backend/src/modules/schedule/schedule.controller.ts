import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  listAppointmentsService,
  getAppointmentByIdService,
  createAppointmentService,
  updateAppointmentService,
  deleteAppointmentService,
} from './schedule.service'
import { getActorName } from '../logs/log.service'

export async function listAppointmentsController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    clientId: z.coerce.number().optional(),
    collaboratorId: z.coerce.number().optional(),
  })

  const query = schema.parse(request.query)
  const { companyId } = request.user as { companyId: number }

  const result = await listAppointmentsService(query, companyId)
  return reply.send(result)
}

export async function getAppointmentByIdController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId } = request.user as { companyId: number }

  try {
    const appointment = await getAppointmentByIdService(id, companyId)
    return reply.send(appointment)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function createAppointmentController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().nullable().optional(),
    startAt: z.string().min(1, 'Data/hora é obrigatória'),
    clientId: z.number().nullable().optional(),
    collaboratorId: z.number().nullable().optional(),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    const appointment = await createAppointmentService(data, companyId, { userId, userName, companyId })
    return reply.status(201).send(appointment)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function updateAppointmentController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const schema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    startAt: z.string().optional(),
    clientId: z.number().nullable().optional(),
    collaboratorId: z.number().nullable().optional(),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    const appointment = await updateAppointmentService(id, data, companyId, { userId, userName, companyId })
    return reply.send(appointment)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function deleteAppointmentController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    await deleteAppointmentService(id, companyId, { userId, userName, companyId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}
