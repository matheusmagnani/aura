import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  getPermissionsByRoleIdService,
  updatePermissionsByRoleIdService,
} from './permission.service'

const MODULES = ['schedule', 'clients', 'collaborators', 'settings', 'history'] as const
const ACTIONS = ['read', 'create', 'edit', 'delete'] as const

export async function getPermissionsByRoleIdController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { roleId } = z
    .object({ roleId: z.coerce.number() })
    .parse(request.params)
  const { companyId } = request.user as { companyId: number }

  try {
    const permissions = await getPermissionsByRoleIdService(roleId, companyId)
    return reply.send(permissions)
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}

export async function updatePermissionsByRoleIdController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { roleId } = z
    .object({ roleId: z.coerce.number() })
    .parse(request.params)

  const schema = z.array(
    z.object({
      module: z.enum(MODULES),
      action: z.enum(ACTIONS),
      allowed: z.boolean(),
    }),
  )

  const permissions = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const result = await updatePermissionsByRoleIdService(roleId, companyId, permissions, { userId })
    return reply.send(result)
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}
