import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Marca uma empresa como de demonstração (`isDemo = true`), habilitando o job
 * `demo:reset` a zerá-la com HARD DELETE.
 *
 * Uso:  npx tsx --env-file=.env scripts/mark-demo-company.ts <companyId>
 *
 * A marcação é deliberadamente manual (não vai numa migration) porque é ela
 * que autoriza a exclusão irreversível dos dados daquela empresa.
 */
async function main() {
  const companyId = Number(process.argv[2])

  if (!Number.isInteger(companyId) || companyId <= 0) {
    console.error('Informe o id da empresa. Ex: npx tsx --env-file=.env scripts/mark-demo-company.ts 1')
    process.exit(1)
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, isDemo: true, _count: { select: { users: true, clients: true } } },
  })

  if (!company) {
    console.error(`Empresa ${companyId} não encontrada.`)
    process.exit(1)
  }

  console.log(`Empresa: ${company.name} (id ${company.id})`)
  console.log(`Usuários: ${company._count.users} | Clientes: ${company._count.clients}`)
  console.log(`isDemo atual: ${company.isDemo}`)

  if (company.isDemo) {
    console.log('Já está marcada como demo. Nada a fazer.')
    return
  }

  await prisma.company.update({ where: { id: companyId }, data: { isDemo: true } })

  console.log('')
  console.log(`✓ Empresa ${companyId} marcada como demo.`)
  console.log('  ATENÇÃO: a partir de agora o job demo:reset pode APAGAR PERMANENTEMENTE')
  console.log('  todos os dados dela (clientes, propostas, contratos, agenda, histórico).')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
