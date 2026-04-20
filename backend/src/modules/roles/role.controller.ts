import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  listRolesService,
  getRoleByIdService,
  createRoleService,
  updateRoleService,
  deleteRoleService,
} from './role.service'

export async function listRolesController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const schema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(20),
    search: z.string().optional(),
    status: z.coerce.number().optional(),
  })

  const query = schema.parse(request.query)
  const { companyId } = request.user as { companyId: number }

  const result = await listRolesService(query, companyId)
  return reply.send(result)
}

export async function getRoleByIdController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId } = request.user as { companyId: number }

  try {
    const role = await getRoleByIdService(id, companyId)
    return reply.send(role)
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}

export async function createRoleController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const schema = z.object({
    name: z.string().min(1),
    status: z.number().optional(),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const role = await createRoleService(data, companyId, { userId })
    return reply.status(201).send(role)
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}

export async function updateRoleController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const schema = z.object({
    name: z.string().min(1).optional(),
    status: z.number().optional(),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const role = await updateRoleService(id, data, companyId, { userId })
    return reply.send(role)
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}

export async function deleteRoleController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    await deleteRoleService(id, companyId, { userId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}
