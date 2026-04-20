import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ACTIONS = ['read', 'create', 'edit', 'delete'] as const

async function main() {
  const roles = await prisma.role.findMany({ select: { id: true, name: true } })
  console.log(`Encontrados ${roles.length} setores`)

  for (const role of roles) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { roleId_module_action: { roleId: role.id, module: 'history', action } },
        update: {},
        create: { roleId: role.id, module: 'history', action, allowed: true },
      })
    }
    console.log(`✓ ${role.name} (id: ${role.id}) — permissões de history adicionadas`)
  }

  console.log('Concluído.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
