import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import { createLog, type LogActor } from '../logs/log.service'

const SELECT_COLLABORATOR = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  active: true,
  companyId: true,
  roleId: true,
  role: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
}

interface ListCollaboratorsQuery {
  page: number
  limit: number
  search?: string
  active?: boolean
  roleIds?: number[]
}

interface CreateCollaboratorInput {
  name: string
  email: string
  password: string
  roleId?: number
}

interface UpdateCollaboratorInput {
  name?: string
  email?: string
  roleId?: number | null
  active?: boolean
}

export async function listCollaboratorsService(
  query: ListCollaboratorsQuery,
  companyId: number,
  _currentUserId: number,
) {
  const { page, limit, search, active, roleIds } = query
  const skip = (page - 1) * limit

  const where = {
    companyId,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(active !== undefined && { active }),
    ...(roleIds && roleIds.length > 0 && { roleId: { in: roleIds } }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      select: SELECT_COLLABORATOR,
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export async function getCollaboratorByIdService(id: number, companyId: number) {
  const user = await prisma.user.findFirst({
    where: { id, companyId, deletedAt: null },
    select: SELECT_COLLABORATOR,
  })

  if (!user) {
    throw { statusCode: 404, message: 'Colaborador não encontrado.' }
  }

  return user
}

export async function createCollaboratorService(data: CreateCollaboratorInput, companyId: number, actor: LogActor) {
  const existingActive = await prisma.user.findFirst({
    where: { email: data.email, deletedAt: null },
  })
  if (existingActive) {
    throw { statusCode: 409, message: 'E-mail já cadastrado.' }
  }

  const deleted = await prisma.user.findFirst({
    where: { email: data.email, deletedAt: { not: null } },
  })

  const hashed = await bcrypt.hash(data.password, 10)

  let user
  if (deleted) {
    user = await prisma.user.update({
      where: { id: deleted.id },
      data: {
        name: data.name,
        password: hashed,
        roleId: data.roleId ?? null,
        active: true,
        deletedAt: null,
        companyId,
      },
      select: SELECT_COLLABORATOR,
    })
  } else {
    user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        companyId,
        roleId: data.roleId ?? null,
      },
      select: SELECT_COLLABORATOR,
    })
  }

  await createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'collaborators',
    action: 'create',
    entityId: user.id,
    entityName: user.name,
    description: `Cadastrou o colaborador ${user.name}`,
    metadata: { name: user.name, email: user.email },
  })

  return user
}

export async function updateCollaboratorService(
  id: number,
  data: UpdateCollaboratorInput,
  companyId: number,
  actor: LogActor,
) {
  const user = await prisma.user.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!user) {
    throw { statusCode: 404, message: 'Colaborador não encontrado.' }
  }

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null, id: { not: id } },
    })
    if (existing) {
      throw { statusCode: 409, message: 'E-mail já cadastrado.' }
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: SELECT_COLLABORATOR,
  })

  const changedKeys = Object.keys(data).filter(
    (k) => (data as any)[k] !== (user as any)[k],
  )

  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}

  for (const k of changedKeys) {
    const prevVal = (user as any)[k]
    const nextVal = (data as any)[k]

    if (k === 'roleId') {
      const [prevRole, nextRole] = await Promise.all([
        prevVal != null ? prisma.role.findUnique({ where: { id: prevVal }, select: { name: true } }) : null,
        nextVal != null ? prisma.role.findUnique({ where: { id: nextVal }, select: { name: true } }) : null,
      ])
      before['setor'] = prevRole?.name ?? null
      after['setor'] = nextRole?.name ?? null
    } else {
      before[k] = prevVal
      after[k] = nextVal
    }
  }

  if (changedKeys.length > 0) {
    await createLog({
      companyId,
      userId: actor.userId,
      userName: actor.userName,
      module: 'collaborators',
      action: 'edit',
      entityId: updated.id,
      entityName: updated.name,
      description: `Editou o colaborador ${updated.name}`,
      metadata: { before, after },
    })
  }

  return updated
}

export async function deleteCollaboratorService(
  id: number,
  companyId: number,
  actor: LogActor,
) {
  if (id === actor.userId) {
    throw { statusCode: 400, message: 'Você não pode excluir sua própria conta.' }
  }

  const user = await prisma.user.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!user) {
    throw { statusCode: 404, message: 'Colaborador não encontrado.' }
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), active: false },
  })

  await createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'collaborators',
    action: 'delete',
    entityId: user.id,
    entityName: user.name,
    description: `Excluiu o colaborador ${user.name}`,
  })
}

export async function resetCollaboratorPasswordService(
  id: number,
  newPassword: string,
  companyId: number,
  actor: LogActor,
) {
  const user = await prisma.user.findFirst({
    where: { id, companyId, deletedAt: null },
  })

  if (!user) {
    throw { statusCode: 404, message: 'Colaborador não encontrado.' }
  }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id }, data: { password: hashed } })

  await createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'collaborators',
    action: 'edit',
    entityId: user.id,
    entityName: user.name,
    description: 'Resetou a senha',
  })
}
