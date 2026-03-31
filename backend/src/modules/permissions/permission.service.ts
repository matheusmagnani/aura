import { prisma } from '../../lib/prisma'

interface UpdatePermissionItem {
  module: string
  action: string
  allowed: boolean
}

export async function getPermissionsByRoleIdService(roleId: number, companyId: number) {
  const role = await prisma.role.findFirst({
    where: { id: roleId, companyId, deletedAt: null },
  })

  if (!role) {
    throw { statusCode: 404, message: 'Setor não encontrado.' }
  }

  return prisma.permission.findMany({
    where: { roleId },
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  })
}

export async function updatePermissionsByRoleIdService(
  roleId: number,
  companyId: number,
  permissions: UpdatePermissionItem[],
) {
  const role = await prisma.role.findFirst({
    where: { id: roleId, companyId, deletedAt: null },
  })

  if (!role) {
    throw { statusCode: 404, message: 'Setor não encontrado.' }
  }

  const results = await prisma.$transaction(
    permissions.map((p) =>
      prisma.permission.upsert({
        where: {
          roleId_module_action: {
            roleId,
            module: p.module,
            action: p.action,
          },
        },
        update: { allowed: p.allowed },
        create: {
          roleId,
          module: p.module,
          action: p.action,
          allowed: p.allowed,
        },
      }),
    ),
  )

  return results
}
