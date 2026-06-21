import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { listFollowUpsService, createFollowUpService, deleteFollowUpService } from './follow-up.service'
import { getActorName } from '../logs/log.service'

export async function listFollowUpsController(request: FastifyRequest, reply: FastifyReply) {
  const { clientId, page, limit } = z.object({
    clientId: z.coerce.number(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(50),
  }).parse(request.query)

  const { companyId } = request.user as { companyId: number }
  const result = await listFollowUpsService(clientId, companyId, page, limit)
  return reply.send(result)
}

export async function createFollowUpController(request: FastifyRequest, reply: FastifyReply) {
  const { content, clientId } = z.object({
    content: z.string().min(1, 'Conteúdo é obrigatório'),
    clientId: z.number(),
  }).parse(request.body)

  const { companyId, userId } = request.user as { companyId: number; userId: number }
  const userName = await getActorName(userId)
  const followUp = await createFollowUpService(content, clientId, companyId, { userId, userName, companyId })
  return reply.status(201).send(followUp)
}

export async function deleteFollowUpController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    await deleteFollowUpService(id, companyId, { userId, userName, companyId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}
