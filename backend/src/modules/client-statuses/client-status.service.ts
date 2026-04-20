import { prisma } from '../../lib/prisma'
import { createLog, getActorName, getCompanyName } from '../logs/log.service'

interface ClientStatusInput {
  name: string
  color: string
}

export async function listClientStatusesService(companyId: number) {
  return prisma.clientStatus.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createClientStatusService(data: ClientStatusInput, companyId: number, actor: { userId: number }) {
  const existing = await prisma.clientStatus.findFirst({
    where: { name: data.name, companyId, deletedAt: null },
  })
  if (existing) throw { statusCode: 409, message: 'Já existe um status com este nome.' }

  const deleted = await prisma.clientStatus.findFirst({
    where: { name: data.name, companyId, deletedAt: { not: null } },
  })

  const status = deleted
    ? await prisma.clientStatus.update({
        where: { id: deleted.id },
        data: { color: data.color, deletedAt: null },
      })
    : await prisma.clientStatus.create({ data: { ...data, companyId } })

  const [userName, companyName] = await Promise.all([getActorName(actor.userId), getCompanyName(companyId)])
  await createLog({
    companyId, userId: actor.userId, userName,
    module: 'client-statuses', action: 'create',
    entityId: companyId, entityName: companyName,
    description: `Status de cliente "${status.name}" criado`,
  })

  return status
}

export async function updateClientStatusService(id: number, data: Partial<ClientStatusInput>, companyId: number, actor: { userId: number }) {
  const status = await prisma.clientStatus.findFirst({
    where: { id, companyId, deletedAt: null },
  })
  if (!status) throw { statusCode: 404, message: 'Status não encontrado.' }

  if (data.name && data.name !== status.name) {
    const conflict = await prisma.clientStatus.findFirst({
      where: { name: data.name, companyId, deletedAt: null, NOT: { id } },
    })
    if (conflict) throw { statusCode: 409, message: 'Já existe um status com este nome.' }
  }

  const updated = await prisma.clientStatus.update({ where: { id }, data })

  const prev: Record<string, unknown> = {}
  const changed: Record<string, unknown> = {}
  const nameKey = `Nome do status do cliente "${status.name}"`
  const colorKey = `Cor do status do cliente "${status.name}"`
  if (data.name && data.name !== status.name) { prev[nameKey] = status.name; changed[nameKey] = data.name }
  if (data.color && data.color !== status.color) { prev[colorKey] = status.color; changed[colorKey] = data.color }

  if (Object.keys(changed).length > 0) {
    const [userName, companyName] = await Promise.all([getActorName(actor.userId), getCompanyName(companyId)])
    await createLog({
      companyId, userId: actor.userId, userName,
      module: 'client-statuses', action: 'edit',
      entityId: companyId, entityName: companyName,
      description: `Status de cliente "${updated.name}" atualizado`,
      metadata: { before: prev, after: changed },
    })
  }

  return updated
}

export async function deleteClientStatusService(id: number, companyId: number, actor: { userId: number }) {
  const status = await prisma.clientStatus.findFirst({
    where: { id, companyId, deletedAt: null },
  })
  if (!status) throw { statusCode: 404, message: 'Status não encontrado.' }

  await prisma.client.updateMany({
    where: { statusId: id, companyId, deletedAt: null },
    data: { statusId: null },
  })

  await prisma.clientStatus.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  const [userName, companyName] = await Promise.all([getActorName(actor.userId), getCompanyName(companyId)])
  await createLog({
    companyId, userId: actor.userId, userName,
    module: 'client-statuses', action: 'delete',
    entityId: companyId, entityName: companyName,
    description: `Status de cliente "${status.name}" excluído`,
  })
}
