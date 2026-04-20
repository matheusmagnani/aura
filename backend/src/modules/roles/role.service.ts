import { prisma } from '../../lib/prisma'
import { createLog, getActorName, getCompanyName } from '../logs/log.service'

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

export async function createRoleService(
  data: CreateRoleInput,
  companyId: number,
  actor: { userId: number },
) {
  const existing = await prisma.role.findFirst({
    where: { name: data.name, companyId, deletedAt: null },
  })

  if (existing) {
    throw { statusCode: 409, message: 'Já existe um setor com este nome.' }
  }

  const deleted = await prisma.role.findFirst({
    where: { name: data.name, companyId, deletedAt: { not: null } },
  })

  const role = deleted
    ? await prisma.role.update({
        where: { id: deleted.id },
        data: { name: data.name, status: data.status ?? 1, deletedAt: null },
      })
    : await prisma.role.create({
        data: { name: data.name, status: data.status ?? 1, companyId },
      })

  const [userName, companyName] = await Promise.all([getActorName(actor.userId), getCompanyName(companyId)])
  await createLog({
    companyId, userId: actor.userId, userName,
    module: 'roles', action: 'create',
    entityId: companyId, entityName: companyName,
    description: `Setor "${role.name}" criado`,
  })

  return role
}

export async function updateRoleService(
  id: number,
  data: UpdateRoleInput,
  companyId: number,
  actor: { userId: number },
) {
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

  const updated = await prisma.role.update({ where: { id }, data })

  const prev: Record<string, unknown> = {}
  const changed: Record<string, unknown> = {}
  const nameKey = `Nome do setor "${role.name}"`
  const statusKey = `Status do setor "${role.name}"`
  if (data.name && data.name !== role.name) { prev[nameKey] = role.name; changed[nameKey] = data.name }
  if (data.status !== undefined && data.status !== role.status) { prev[statusKey] = role.status; changed[statusKey] = data.status }

  if (Object.keys(changed).length > 0) {
    const [userName, companyName] = await Promise.all([getActorName(actor.userId), getCompanyName(companyId)])
    await createLog({
      companyId, userId: actor.userId, userName,
      module: 'roles', action: 'edit',
      entityId: companyId, entityName: companyName,
      description: `Setor "${updated.name}" atualizado`,
      metadata: { before: prev, after: changed },
    })
  }

  return updated
}

export async function deleteRoleService(id: number, companyId: number, actor: { userId: number }) {
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

  const [userName, companyName] = await Promise.all([getActorName(actor.userId), getCompanyName(companyId)])
  await createLog({
    companyId, userId: actor.userId, userName,
    module: 'roles', action: 'delete',
    entityId: companyId, entityName: companyName,
    description: `Setor "${role.name}" excluído`,
  })
}
