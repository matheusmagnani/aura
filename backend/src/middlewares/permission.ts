import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'

export function requirePermission(module: string, action: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: number }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { roleId: true },
    })

    if (!user) {
      return reply.status(401).send({ message: 'Usuário não encontrado.' })
    }

    // Admin (roleId = null) tem acesso total
    if (user.roleId === null) return

    const permission = await prisma.permission.findFirst({
      where: { roleId: user.roleId, module, action, allowed: true },
    })

    if (!permission) {
      return reply.status(403).send({ message: 'Acesso negado.' })
    }
  }
}
