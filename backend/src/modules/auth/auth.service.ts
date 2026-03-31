import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'

const MODULES = ['schedule', 'clients', 'settings'] as const
const ACTIONS = ['read', 'create', 'edit', 'delete'] as const

interface RegisterInput {
  companyName: string
  name: string
  email: string
  password: string
}

interface LoginInput {
  email: string
  password: string
}

export async function registerService({ companyName, name, email, password }: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw { statusCode: 409, message: 'E-mail já cadastrado.' }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName },
    })

    const defaultRole = await tx.role.create({
      data: {
        name: 'Administrativo',
        companyId: company.id,
        status: 1,
      },
    })

    await tx.permission.createMany({
      data: MODULES.flatMap((module) =>
        ACTIONS.map((action) => ({
          roleId: defaultRole.id,
          module,
          action,
          allowed: true,
        })),
      ),
    })

    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyId: company.id,
        roleId: defaultRole.id,
      },
    })

    return { company, user, role: defaultRole }
  })

  return result
}

export async function loginService({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
    include: {
      company: true,
      role: { select: { id: true, name: true } },
    },
  })

  if (!user || !user.active) {
    throw { statusCode: 401, message: 'Credenciais inválidas.' }
  }

  const validPassword = await bcrypt.compare(password, user.password)

  if (!validPassword) {
    throw { statusCode: 401, message: 'Credenciais inválidas.' }
  }

  return user
}

export async function getMeService(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      active: true,
      companyId: true,
      roleId: true,
      role: { select: { id: true, name: true } },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      createdAt: true,
    },
  })

  if (!user) {
    throw { statusCode: 404, message: 'Usuário não encontrado.' }
  }

  return user
}
