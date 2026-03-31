import { prisma } from '../../lib/prisma'

interface ListRolesQuery {
  page: number
  limit: number
  search?: string
  status?: number
}

interface CreateRoleInput {
  name: string
  status?: number
}

interface UpdateRoleInput {
  name?: string
  status?: number
}

export async function listRolesService(query: ListRolesQuery, companyId: number) {
  const { page, limit, search, status } = query
  const skip = (page - 1) * limit

  const where = {
    companyId,
    deletedAt: null,
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    ...(status !== undefined && { status }),
  }

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } } },
        },
      },
    }),
    prisma.role.count({ where }),
  ])

  return {
    data: roles,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export async function getRoleByIdService(id: number, companyId: number) {
  const role = await prisma.role.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!role) {
    throw { statusCode: 404, message: 'Setor não encontrado.' }
  }

  return role
}

export async function createRoleService(data: CreateRoleInput, companyId: number) {
  const existing = await prisma.role.findFirst({
    where: { name: data.name, companyId, deletedAt: null },
  })

  if (existing) {
    throw { statusCode: 409, message: 'Já existe um setor com este nome.' }
  }

  const deleted = await prisma.role.findFirst({
    where: { name: data.name, companyId, deletedAt: { not: null } },
  })

  if (deleted) {
    return prisma.role.update({
      where: { id: deleted.id },
      data: { name: data.name, status: data.status ?? 1, deletedAt: null },
    })
  }

  return prisma.role.create({
    data: { name: data.name, status: data.status ?? 1, companyId },
  })
}

export async function updateRoleService(id: number, data: UpdateRoleInput, companyId: number) {
  const role = await prisma.role.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!role) {
    throw { statusCode: 404, message: 'Setor não encontrado.' }
  }

  if (data.name && data.name !== role.name) {
    const existing = await prisma.role.findFirst({
      where: { name: data.name, companyId, deletedAt: null },
    })
    if (existing) {
      throw { statusCode: 409, message: 'Já existe um setor com este nome.' }
    }
  }

  return prisma.role.update({
    where: { id },
    data,
  })
}

export async function deleteRoleService(id: number, companyId: number) {
  const role = await prisma.role.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!role) {
    throw { statusCode: 404, message: 'Setor não encontrado.' }
  }

  const usersCount = await prisma.user.count({
    where: { roleId: id, deletedAt: null },
  })

  if (usersCount > 0) {
    throw { statusCode: 409, message: 'Não é possível excluir um setor que possui usuários vinculados.' }
  }

  await prisma.role.update({
    where: { id },
    data: { deletedAt: new Date(), status: 0 },
  })
}
