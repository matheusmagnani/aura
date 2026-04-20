import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'

const MODULES = ['schedule', 'clients', 'collaborators', 'settings', 'history'] as const
const ACTIONS = ['read', 'create', 'edit', 'delete'] as const

interface RegisterInput {
  companyName: string
  name: string
  email: string
  password: string
  tradeName?: string
  cnpj?: string
  department?: string
  companyEmail?: string
  phone?: string
  zipCode?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  neighborhood?: string
  city?: string
  state?: string
}

interface LoginInput {
  email: string
  password: string
}

export async function registerService({ companyName, name, email, password, tradeName, cnpj, department, companyEmail, phone, zipCode, address, addressNumber, addressComplement, neighborhood, city, state }: RegisterInput) {
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw { statusCode: 409, message: 'E-mail de usuário já cadastrado.' }
  }

  if (cnpj) {
    const existingCompany = await prisma.company.findFirst({
      where: { cnpj, deletedAt: null },
    })
    if (existingCompany) {
      throw { statusCode: 409, message: 'CNPJ já cadastrado.' }
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        tradeName: tradeName || null,
        cnpj: cnpj || null,
        department: department || null,
        email: companyEmail || null,
        phone: phone || null,
        zipCode: zipCode || null,
        address: address || null,
        addressNumber: addressNumber || null,
        addressComplement: addressComplement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
      },
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
    throw { statusCode: 401, message: 'Email ou senha incorretos.' }
  }

  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) {
    throw { statusCode: 401, message: 'Email ou senha incorretos.' }
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
          tradeName: true,
          cnpj: true,
          email: true,
          phone: true,
          department: true,
          zipCode: true,
          address: true,
          addressNumber: true,
          addressComplement: true,
          neighborhood: true,
          city: true,
          state: true,
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

interface UpdateProfileInput {
  userId: number
  companyId: number
  name: string
  email: string
}

export async function updateProfileService({ userId, companyId, name, email }: UpdateProfileInput) {
  const existing = await prisma.user.findFirst({
    where: { email, id: { not: userId }, deletedAt: null },
  })

  if (existing) {
    throw { statusCode: 409, message: 'E-mail já está em uso.' }
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name, email },
    select: { id: true, name: true, email: true, avatar: true },
  })

  if (before) {
    const changed: Record<string, unknown> = {}
    const prev: Record<string, unknown> = {}
    if (before.name !== name) { changed.name = name; prev.name = before.name }
    if (before.email !== email) { changed.email = email; prev.email = before.email }

  }

  return user
}

export async function uploadAvatarService(userId: number, avatar: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatar },
    select: { id: true, avatar: true },
  })
  return user
}

export async function removeAvatarService(userId: number) {
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null },
  })
}

interface ChangePasswordInput {
  userId: number
  companyId: number
  currentPassword: string
  newPassword: string
}

export async function changePasswordService({ userId, companyId, currentPassword, newPassword }: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw { statusCode: 404, message: 'Usuário não encontrado.' }
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    throw { statusCode: 400, message: 'Senha atual incorreta.' }
  }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
}
