import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  listClientStatusesService,
  createClientStatusService,
  updateClientStatusService,
  deleteClientStatusService,
} from './client-status.service'

export async function listClientStatusesController(request: FastifyRequest, reply: FastifyReply) {
  const { companyId } = request.user as { companyId: number }
  const statuses = await listClientStatusesService(companyId)
  return reply.send(statuses)
}

export async function createClientStatusController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    color: z.string().min(1, 'Cor é obrigatória'),
  })
  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const status = await createClientStatusService(data, companyId, { userId })
    return reply.status(201).send(status)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function updateClientStatusController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const schema = z.object({
    name: z.string().min(1).optional(),
    color: z.string().min(1).optional(),
  })
  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const status = await updateClientStatusService(id, data, companyId, { userId })
    return reply.send(status)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function deleteClientStatusController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    await deleteClientStatusService(id, companyId, { userId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}
