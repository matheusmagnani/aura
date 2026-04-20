import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
import { registerService, loginService, getMeService, updateProfileService, uploadAvatarService, removeAvatarService, changePasswordService } from './auth.service'

export async function registerController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const schema = z.object({
    companyName: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    tradeName: z.string().optional(),
    cnpj: z.string().optional(),
    department: z.string().optional(),
    companyEmail: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    zipCode: z.string().optional(),
    address: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComplement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
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

export async function updateProfileController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId, companyId } = request.user as { userId: number; companyId: number }
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })
  const { name, email } = schema.parse(request.body)

  try {
    const user = await updateProfileService({ userId, companyId, name, email })
    return reply.send(user)
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}

export async function uploadAvatarController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId } = request.user as { userId: number }

  const data = await request.file()
  if (!data) {
    return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(data.mimetype)) {
    return reply.status(400).send({ message: 'Formato inválido. Use JPEG, PNG ou WebP.' })
  }

  const uploadDir = path.resolve('uploads/avatars')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  const ext = data.mimetype.split('/')[1].replace('jpeg', 'jpg')
  const filename = `${userId}-${Date.now()}.${ext}`
  const filepath = path.join(uploadDir, filename)

  await fs.promises.writeFile(filepath, await data.toBuffer())

  const user = await uploadAvatarService(userId, `avatars/${filename}`)
  return reply.send({ avatar: user.avatar })
}

export async function removeAvatarController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId } = request.user as { userId: number }

  try {
    await removeAvatarService(userId)
    return reply.send({ message: 'Avatar removido.' })
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}

export async function changePasswordController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { userId, companyId } = request.user as { userId: number; companyId: number }
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6),
  })
  const { currentPassword, newPassword } = schema.parse(request.body)

  try {
    await changePasswordService({ userId, companyId, currentPassword, newPassword })
    return reply.send({ message: 'Senha alterada com sucesso.' })
  } catch (error: any) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ message: error.message })
    }
    throw error
  }
}
