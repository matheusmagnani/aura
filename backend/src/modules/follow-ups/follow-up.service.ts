import { prisma } from '../../lib/prisma'
import { createLog, type LogActor } from '../logs/log.service'

export async function listFollowUpsService(clientId: number, companyId: number, page: number, limit: number) {
  const where = { clientId, companyId, deletedAt: null }
  const skip = (page - 1) * limit

  const [rows, total] = await Promise.all([
    prisma.followUp.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      select: { id: true, content: true, userId: true, userName: true, createdAt: true },
    }),
    prisma.followUp.count({ where }),
  ])

  const userIds = [...new Set(rows.map(r => r.userId).filter((id): id is number => id !== null))]
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, color: true } })
    : []
  const colorMap = new Map(users.map(u => [u.id, u.color]))

  const data = rows.map(r => ({ ...r, userColor: r.userId ? (colorMap.get(r.userId) ?? null) : null }))

  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } }
}

export async function createFollowUpService(
  content: string,
  clientId: number,
  companyId: number,
  actor: LogActor,
) {
  const client = await prisma.client.findFirst({ where: { id: clientId, companyId, deletedAt: null } })
  if (!client) throw { statusCode: 404, message: 'Cliente não encontrado.' }

  const followUp = await prisma.followUp.create({
    data: { content, clientId, companyId, userId: actor.userId, userName: actor.userName },
    select: { id: true, content: true, userId: true, userName: true, createdAt: true },
  })

  await createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'clients',
    action: 'create',
    entityId: clientId,
    entityName: client.name,
    description: `Adicionou follow up para o cliente ${client.name}`,
  })

  return followUp
}

export async function deleteFollowUpService(id: number, companyId: number, actor: LogActor) {
  const followUp = await prisma.followUp.findFirst({
    where: { id, companyId, deletedAt: null },
    include: { client: { select: { name: true } } },
  })
  if (!followUp) throw { statusCode: 404, message: 'Follow up não encontrado.' }

  await prisma.followUp.update({ where: { id }, data: { deletedAt: new Date() } })

  await createLog({
    companyId,
    userId: actor.userId,
    userName: actor.userName,
    module: 'clients',
    action: 'delete',
    entityId: followUp.clientId,
    entityName: followUp.client.name,
    description: `Removeu follow up do cliente ${followUp.client.name}`,
  })
}
