import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  listContractTemplatesService,
  createContractTemplateService,
  updateContractTemplateService,
  deleteContractTemplateService,
} from './contract-template.service'

export async function listContractTemplatesController(request: FastifyRequest, reply: FastifyReply) {
  const { companyId } = request.user as { companyId: number }
  const templates = await listContractTemplatesService(companyId)
  return reply.send(templates)
}

export async function createContractTemplateController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    content: z.record(z.unknown()),
  })
  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const template = await createContractTemplateService(data, companyId, { userId })
    return reply.status(201).send(template)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function updateContractTemplateController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const schema = z.object({
    name: z.string().min(1).optional(),
    content: z.record(z.unknown()).optional(),
  })
  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const template = await updateContractTemplateService(id, data, companyId, { userId })
    return reply.send(template)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function deleteContractTemplateController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    await deleteContractTemplateService(id, companyId, { userId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}
