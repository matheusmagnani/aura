import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  listProposalsService,
  getProposalByIdService,
  createProposalService,
  updateProposalService,
  deleteProposalService,
} from './proposal.service'
import { getActorName } from '../logs/log.service'

export async function listProposalsController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(20),
    search: z.string().optional(),
    clientId: z.coerce.number().optional(),
    collaboratorId: z.coerce.number().optional(),
    status: z.string().optional(),
  })

  const query = schema.parse(request.query)
  const { companyId } = request.user as { companyId: number }

  const result = await listProposalsService(query, companyId)
  return reply.send(result)
}

export async function getProposalByIdController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId } = request.user as { companyId: number }

  try {
    const proposal = await getProposalByIdService(id, companyId)
    return reply.send(proposal)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function createProposalController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    value: z.number({ required_error: 'Valor é obrigatório' }).positive('Valor deve ser positivo'),
    description: z.string().nullable().optional(),
    clientObservation: z.string().nullable().optional(),
    status: z.enum(['pending', 'sent', 'accepted', 'refused']).default('pending'),
    clientId: z.number({ required_error: 'Cliente é obrigatório' }).int().positive('Cliente é obrigatório'),
    collaboratorId: z.number().nullable().optional(),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    const proposal = await createProposalService(data, companyId, { userId, userName, companyId })
    return reply.status(201).send(proposal)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function updateProposalController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const schema = z.object({
    value: z.number().positive().optional(),
    description: z.string().nullable().optional(),
    clientObservation: z.string().nullable().optional(),
    status: z.enum(['pending', 'sent', 'accepted', 'refused']).optional(),
    collaboratorId: z.number().nullable().optional(),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    const proposal = await updateProposalService(id, data, companyId, { userId, userName, companyId })
    return reply.send(proposal)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function deleteProposalController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    await deleteProposalService(id, companyId, { userId, userName, companyId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}
