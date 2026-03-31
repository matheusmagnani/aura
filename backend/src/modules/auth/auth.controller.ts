import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { registerService, loginService, getMeService } from './auth.service'

export async function registerController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const schema = z.object({
    companyName: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
  })

  const body = schema.parse(request.body)

  try {
    const { company, user, role } = await registerService(body)

    const token = await reply.jwtSign(
      { userId: user.id, companyId: company.id },
      { expiresIn: '7d' },
    )

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: company.id,
        companyName: company.name,
        roleId: role.id,
        role: { id: role.id, name: role.name },
      },
    })
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}

export async function loginController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  })

  const body = schema.parse(request.body)

  try {
    const user = await loginService(body)

    const token = await reply.jwtSign(
      { userId: user.id, companyId: user.companyId },
      { expiresIn: '7d' },
    )

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        companyId: user.companyId,
        companyName: user.company.name,
        roleId: user.roleId,
        role: user.role,
      },
    })
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}

export async function refreshController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId, companyId } = request.user as {
    userId: number
    companyId: number
  }

  const token = await reply.jwtSign(
    { userId, companyId },
    { expiresIn: '7d' },
  )

  return reply.send({ token })
}

export async function meController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId } = request.user as { userId: number }

  try {
    const user = await getMeService(userId)
    return reply.send(user)
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}
