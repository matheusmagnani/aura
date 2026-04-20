import { prisma } from '../../lib/prisma'

export interface LogActor {
  userId: number
  userName: string
  companyId: number
}

interface CreateLogInput {
  companyId: number
  userId: number
  userName: string
  module: string
  action: string
  entityId?: number
  entityName?: string
  description: string
  metadata?: object
}

export async function createLog(data: CreateLogInput): Promise<void> {
  try {
    await prisma.log.create({ data })
  } catch (err) {
    console.error('[Log] Falha ao criar log:', err)
  }
}

export async function getActorName(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })
  return user?.name ?? 'Usuário desconhecido'
}

export async function getCompanyName(companyId: number): Promise<string> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, tradeName: true },
  })
  return company?.tradeName ?? company?.name ?? 'Empresa desconhecida'
}

interface ListLogsParams {
  companyId: number
  modules?: string[]
  actions?: string[]
  userIds?: number[]
  entityId?: number
  entityModule?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page: number
  limit: number
}

export async function listLogsService(params: ListLogsParams) {
  const { companyId, modules, actions, userIds, entityId, entityModule, search, dateFrom, dateTo, page, limit } = params
  const skip = (page - 1) * limit

  const where: any = {
    companyId,
    ...(modules && modules.length > 0 && { module: { in: modules } }),
    ...(actions && actions.length > 0 && { action: { in: actions } }),
    ...(userIds && userIds.length > 0 && { userId: { in: userIds } }),
    ...(entityId !== undefined && entityModule
      ? { entityId, module: entityModule }
      : entityId !== undefined
      ? { entityId }
      : {}),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: 'insensitive' as const } },
        { userName: { contains: search, mode: 'insensitive' as const } },
        { entityName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [logs, total] = await Promise.all([
    prisma.log.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.log.count({ where }),
  ])

  return {
    data: logs,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}
