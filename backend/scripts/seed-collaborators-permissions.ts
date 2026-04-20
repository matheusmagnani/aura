/**
 * Adds `collaborators` permissions to all existing roles.
 * Roles that already have all permissions allowed → allowed = true
 * Roles that have all permissions denied → allowed = false
 *
 * Run with:
 *   npx tsx scripts/seed-collaborators-permissions.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const roles = await prisma.role.findMany({ where: { deletedAt: null } })
  console.log(`Found ${roles.length} active roles.`)

  for (const role of roles) {
    const existing = await prisma.permission.findFirst({
      where: { roleId: role.id, module: 'collaborators' },
    })

    if (existing) {
      console.log(`  Role "${role.name}" (#${role.id}) already has collaborators permissions — skipping.`)
      continue
    }

    // Infer `allowed` from whether other permissions are allowed
    const anyAllowed = await prisma.permission.findFirst({
      where: { roleId: role.id, allowed: true },
    })
    const allowed = anyAllowed !== null

    await prisma.permission.createMany({
      data: ['read', 'create', 'edit', 'delete'].map((action) => ({
        roleId: role.id,
        module: 'collaborators',
        action,
        allowed,
      })),
    })

    console.log(`  Role "${role.name}" (#${role.id}) — added collaborators permissions (allowed: ${allowed})`)
  }

  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
