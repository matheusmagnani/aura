import { prisma } from '../../lib/prisma'
import { createLog, getActorName } from '../logs/log.service'
import { deleteContentImagesFromS3, extractImageUrlsFromContent } from '../contracts/contract.service'
import { deleteFromS3 } from '../../lib/s3'

interface ContractTemplateInput {
  name: string
  content: object
}

export async function listContractTemplatesService(companyId: number) {
  return prisma.contractTemplate.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createContractTemplateService(
  data: ContractTemplateInput,
  companyId: number,
  actor: { userId: number },
) {
  const existing = await prisma.contractTemplate.findFirst({
    where: { name: data.name, companyId, deletedAt: null },
  })
  if (existing) throw { statusCode: 409, message: 'Já existe um modelo de contrato com este nome.' }

  const deleted = await prisma.contractTemplate.findFirst({
    where: { name: data.name, companyId, deletedAt: { not: null } },
  })

  const template = deleted
    ? await prisma.contractTemplate.update({
        where: { id: deleted.id },
        data: { content: data.content, deletedAt: null },
      })
    : await prisma.contractTemplate.create({ data: { ...data, companyId } })

  const userName = await getActorName(actor.userId)
  await createLog({
    companyId,
    userId: actor.userId,
    userName,
    module: 'contract-templates',
    action: 'create',
    entityId: template.id,
    entityName: template.name,
    description: `Modelo de contrato "${template.name}" criado`,
  })

  return template
}

export async function updateContractTemplateService(
  id: number,
  data: Partial<ContractTemplateInput>,
  companyId: number,
  actor: { userId: number },
) {
  const template = await prisma.contractTemplate.findFirst({
    where: { id, companyId, deletedAt: null },
  })
  if (!template) throw { statusCode: 404, message: 'Modelo de contrato não encontrado.' }

  if (data.name && data.name !== template.name) {
    const conflict = await prisma.contractTemplate.findFirst({
      where: { name: data.name, companyId, deletedAt: null, NOT: { id } },
    })
    if (conflict) throw { statusCode: 409, message: 'Já existe um modelo de contrato com este nome.' }
  }

  const updated = await prisma.contractTemplate.update({ where: { id }, data })

  if (data.content) {
    const oldUrls = new Set(extractImageUrlsFromContent(template.content))
    const newUrls = new Set(extractImageUrlsFromContent(data.content))
    const removed = [...oldUrls].filter((url) => !newUrls.has(url))
    await Promise.allSettled(removed.map((url) => deleteFromS3(url)))
  }

  const prev: Record<string, unknown> = {}
  const changed: Record<string, unknown> = {}
  if (data.name && data.name !== template.name) {
    prev['Nome'] = template.name
    changed['Nome'] = data.name
  }
  if (data.content !== undefined) {
    prev['Conteúdo'] = '[anterior]'
    changed['Conteúdo'] = '[atualizado]'
  }

  if (Object.keys(changed).length > 0) {
    const userName = await getActorName(actor.userId)
    await createLog({
      companyId,
      userId: actor.userId,
      userName,
      module: 'contract-templates',
      action: 'edit',
      entityId: template.id,
      entityName: updated.name,
      description: `Modelo de contrato "${updated.name}" atualizado`,
      metadata: { before: prev, after: changed },
    })
  }

  return updated
}

export async function deleteContractTemplateService(
  id: number,
  companyId: number,
  actor: { userId: number },
) {
  const template = await prisma.contractTemplate.findFirst({
    where: { id, companyId, deletedAt: null },
  })
  if (!template) throw { statusCode: 404, message: 'Modelo de contrato não encontrado.' }

  await Promise.all([
    prisma.contractTemplate.update({ where: { id }, data: { deletedAt: new Date() } }),
    deleteContentImagesFromS3(template.content),
  ])

  const userName = await getActorName(actor.userId)
  await createLog({
    companyId,
    userId: actor.userId,
    userName,
    module: 'contract-templates',
    action: 'delete',
    entityId: template.id,
    entityName: template.name,
    description: `Modelo de contrato "${template.name}" excluído`,
  })
}
