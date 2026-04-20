import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  listClientsService,
  getClientByIdService,
  createClientService,
  updateClientService,
  deleteClientService,
} from './client.service'
import { getActorName } from '../logs/log.service'
import { prisma } from '../../lib/prisma'

export async function listClientsSelectController(request: FastifyRequest, reply: FastifyReply) {
  const { search } = z.object({ search: z.string().optional() }).parse(request.query)
  const { companyId } = request.user as { companyId: number }
  const data = await prisma.client.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    },
    select: { id: true, name: true, phone: true },
    orderBy: { name: 'asc' },
    take: 10,
  })
  return reply.send(data)
}

export async function listClientsController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(20),
    search: z.string().optional(),
    searchFields: z.enum(['nameOrDocument']).optional(),
    statusIds: z.string().optional().transform((v) => v ? v.split(',').map(Number) : undefined),
    userIds: z.string().optional().transform((v) => v ? v.split(',').map(Number) : undefined),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })

  const query = schema.parse(request.query)
  const { companyId } = request.user as { companyId: number }

  const result = await listClientsService(query, companyId)
  return reply.send(result)
}

export async function getClientByIdController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId } = request.user as { companyId: number }

  try {
    const client = await getClientByIdService(id, companyId)
    return reply.send(client)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function createClientController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
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
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    const client = await createClientService(data, companyId, { userId, userName, companyId })
    return reply.status(201).send(client)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function updateClientController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const schema = z.object({
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
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    const client = await updateClientService(id, data, companyId, { userId, userName, companyId })
    return reply.send(client)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function deleteClientController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const userName = await getActorName(userId)
    await deleteClientService(id, companyId, { userId, userName, companyId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}
