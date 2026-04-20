import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  listCollaboratorsService,
  getCollaboratorByIdService,
  createCollaboratorService,
  updateCollaboratorService,
  deleteCollaboratorService,
  resetCollaboratorPasswordService,
} from './collaborator.service'
import { getActorName } from '../logs/log.service'

export async function listCollaboratorsController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(20),
    search: z.string().optional(),
    active: z.coerce.number().optional().transform((v) => (v !== undefined ? v === 1 : undefined)),
    roleIds: z.string().optional().transform((v) => v ? v.split(',').map(Number) : undefined),
  })

  const query = schema.parse(request.query)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  const result = await listCollaboratorsService(query as any, companyId, userId)
  return reply.send(result)
}

export async function getCollaboratorByIdController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId } = request.user as { companyId: number }

  try {
    const user = await getCollaboratorByIdService(id, companyId)
    return reply.send(user)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function createCollaboratorController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    roleId: z.number({ required_error: 'Setor é obrigatório' }),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    const user = await createCollaboratorService(data, companyId, { userId, userName, companyId })
    return reply.status(201).send(user)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function updateCollaboratorController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const schema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    email: z.string().email('E-mail inválido').optional(),
    roleId: z.number({ required_error: 'Setor é obrigatório' }).optional(),
    active: z.boolean().optional(),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    const user = await updateCollaboratorService(id, data, companyId, { userId, userName, companyId })
    return reply.send(user)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function deleteCollaboratorController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    await deleteCollaboratorService(id, companyId, { userId, userName, companyId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function resetCollaboratorPasswordController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { newPassword } = z
    .object({ newPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres') })
    .parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    await resetCollaboratorPasswordService(id, newPassword, companyId, { userId, userName, companyId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}
