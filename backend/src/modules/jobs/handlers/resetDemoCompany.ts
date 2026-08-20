import bcrypt from 'bcryptjs'
import { prisma } from '../../../lib/prisma'
import { env } from '../../../env'
import { listS3Keys, deleteS3Keys, s3KeyFromUrl } from '../../../lib/s3'
import { isProtectedDemoAvatar } from '../../../lib/demoReset'
import { DEMO_COMPANY_PROFILE } from './demo.profile'
import type { JobContext } from '../job.registry'

const MODULES = ['schedule', 'clients', 'collaborators', 'settings', 'history', 'proposals'] as const
const ACTIONS = ['read', 'create', 'edit', 'delete'] as const

/**
 * Zera a empresa de demonstração, devolvendo-a ao estado de recém-cadastrada:
 * Company + usuário dono + role "Administrativo" com todas as permissões.
 *
 * HARD DELETE de propósito (não é o soft delete do resto do sistema): o objetivo
 * é não acumular espaço no Postgres nem no S3 a cada rodada de testes.
 *
 * GUARD-RAILS — a operação é irreversível, então recusa rodar se:
 *   - DEMO_COMPANY_ID não estiver configurado;
 *   - a empresa não existir;
 *   - a empresa não estiver marcada com `isDemo = true` no banco.
 * A flag no banco é o que impede um DEMO_COMPANY_ID errado de apagar um cliente
 * real — o env sozinho é fácil demais de trocar por engano.
 */
export async function resetDemoCompanyJob({ dryRun }: JobContext) {
  const companyId = env.DEMO_COMPANY_ID
  if (!companyId) {
    throw new Error('DEMO_COMPANY_ID não configurado — o reset da demo foi abortado.')
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) {
    throw new Error(`Empresa ${companyId} não existe — o reset da demo foi abortado.`)
  }
  if (!company.isDemo) {
    throw new Error(
      `Empresa ${companyId} ("${company.name}") não está marcada como isDemo — reset abortado.`,
    )
  }

  if (!env.DEMO_USER_EMAIL || !env.DEMO_USER_PASSWORD || !env.DEMO_USER_NAME) {
    throw new Error(
      'DEMO_USER_NAME / DEMO_USER_EMAIL / DEMO_USER_PASSWORD são obrigatórios pra restaurar o acesso da demo.',
    )
  }

  // `User.email` é @unique GLOBAL (não por empresa): se algum usuário de OUTRA
  // empresa estiver com o e-mail demo, o update do dono no fim do reset estoura
  // P2002 e a transação inteira faz rollback. Checamos antes de apagar qualquer
  // coisa — assim o job falha barato e com uma mensagem que diz o que fazer, em
  // vez de ficar em retry até a DLQ com "Unique constraint failed".
  const emailConflict = await prisma.user.findFirst({
    where: { email: env.DEMO_USER_EMAIL, companyId: { not: companyId } },
    select: { id: true, companyId: true },
  })
  if (emailConflict) {
    throw new Error(
      `O e-mail "${env.DEMO_USER_EMAIL}" já pertence ao usuário #${emailConflict.id} da empresa #${emailConflict.companyId}. ` +
        'Como User.email é único no sistema todo, o reset foi abortado antes de apagar qualquer dado. ' +
        'Libere esse e-mail ou aponte DEMO_USER_EMAIL para outro.',
    )
  }

  // O dono é o usuário mais antigo da empresa (o criado no registro). Usamos o
  // id em vez do e-mail porque quem testa pode ter trocado o e-mail no perfil.
  const owner = await prisma.user.findFirst({
    where: { companyId },
    orderBy: { id: 'asc' },
    // name/email entram no resultado do job pra que o dryRun mostre QUEM será
    // preservado — é a conferência que evita resetar a empresa errada.
    select: { id: true, name: true, email: true },
  })
  if (!owner) {
    throw new Error(`Empresa ${companyId} não tem usuários — reset abortado.`)
  }

  // --- Coleta o que precisa ser apagado do S3 ANTES de perder as linhas ---
  const contracts = await prisma.contract.findMany({
    where: { companyId },
    select: { pdfUrl: true },
  })
  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, avatar: true },
  })

  const s3Keys = new Set<string>()
  for (const contract of contracts) {
    const key = s3KeyFromUrl(contract.pdfUrl)
    if (key) s3Keys.add(key)
  }
  for (const user of users) {
    // A foto padrão da demo é restaurada no fim deste mesmo job — apagá-la aqui
    // deixaria o avatar apontando para um arquivo inexistente.
    if (isProtectedDemoAvatar(user.avatar)) continue
    const key = user.avatar ? s3KeyFromUrl(user.avatar) : null
    if (key) s3Keys.add(key)
  }
  // Imagens que o editor de contrato sobe (POST /contracts/upload-image) NÃO
  // têm registro no banco — só saem varrendo o prefixo. A key é
  // `contracts/models-images/{companyId}-{timestamp}.ext`, e o hífen no prefixo
  // impede colisão com outros ids (o prefixo "1-" não casa com "10-").
  // Um S3 indisponível não pode impedir a limpeza do banco (que é o objetivo
  // principal): seguimos com as keys que vieram do banco e o próximo reset
  // varre o prefixo de novo.
  try {
    const editorImageKeys = await listS3Keys(`contracts/models-images/${companyId}-`)
    for (const key of editorImageKeys) s3Keys.add(key)
  } catch (err: any) {
    console.error('[demo:reset] falha ao listar imagens do editor no S3:', err?.message ?? err)
  }

  const counts = {
    contracts: contracts.length,
    followUps: await prisma.followUp.count({ where: { companyId } }),
    proposals: await prisma.proposal.count({ where: { companyId } }),
    appointments: await prisma.appointment.count({ where: { companyId } }),
    logs: await prisma.log.count({ where: { companyId } }),
    contractTemplates: await prisma.contractTemplate.count({ where: { companyId } }),
    clients: await prisma.client.count({ where: { companyId } }),
    clientStatuses: await prisma.clientStatus.count({ where: { companyId } }),
    roles: await prisma.role.count({ where: { companyId } }),
    collaborators: users.length - 1, // todos menos o dono
    s3Objects: s3Keys.size,
  }

  // Quem sobrevive ao reset — sempre no resultado, pra conferir no dryRun antes
  // de rodar pra valer e ver no histórico depois.
  const ownerPreserved = { id: owner.id, name: owner.name, email: owner.email }

  if (dryRun) {
    return {
      dryRun: true,
      companyId,
      companyName: company.name,
      ownerPreserved,
      wouldDelete: counts,
    }
  }

  await prisma.$transaction(
    async (tx) => {
      // Nenhuma FK do schema tem onDelete: Cascade, então a ordem abaixo é
      // topológica (dependentes primeiro) — fora dela o Postgres barra por FK.

      // Solta a FK do dono pra role antes de apagar as roles.
      await tx.user.update({ where: { id: owner.id }, data: { roleId: null } })

      await tx.contract.deleteMany({ where: { companyId } })
      await tx.followUp.deleteMany({ where: { companyId } })
      await tx.proposal.deleteMany({ where: { companyId } })
      await tx.appointment.deleteMany({ where: { companyId } })
      await tx.log.deleteMany({ where: { companyId } })
      await tx.contractTemplate.deleteMany({ where: { companyId } })
      await tx.client.deleteMany({ where: { companyId } })
      await tx.clientStatus.deleteMany({ where: { companyId } })

      // Permissions penduram em Role, não em Company — apaga pelas roles da empresa.
      const roles = await tx.role.findMany({ where: { companyId }, select: { id: true } })
      await tx.permission.deleteMany({ where: { roleId: { in: roles.map((r) => r.id) } } })

      await tx.user.deleteMany({ where: { companyId, id: { not: owner.id } } })
      await tx.role.deleteMany({ where: { companyId } })

      // --- Recria o estado de empresa recém-registrada (espelha registerService) ---
      const defaultRole = await tx.role.create({
        data: { name: 'Administrativo', companyId, idStatus: 1 },
      })

      await tx.permission.createMany({
        data: MODULES.flatMap((module) =>
          ACTIONS.map((action) => ({ roleId: defaultRole.id, module, action, allowed: true })),
        ),
      })

      await tx.user.update({
        where: { id: owner.id },
        data: {
          name: env.DEMO_USER_NAME!,
          email: env.DEMO_USER_EMAIL!,
          password: await bcrypt.hash(env.DEMO_USER_PASSWORD!, 10),
          roleId: defaultRole.id,
          // Restaura a foto padrão (se configurada); sem ela, volta sem avatar.
          avatar: env.DEMO_USER_AVATAR ?? null,
          color: null,
          active: true,
          deletedAt: null,
        },
      })

      // Restaura o cadastro da empresa a partir do perfil (ver demo.profile.ts).
      // DEMO_COMPANY_NAME, se setado, tem precedência sobre o nome do perfil.
      await tx.company.update({
        where: { id: companyId },
        data: {
          ...DEMO_COMPANY_PROFILE,
          name: env.DEMO_COMPANY_NAME ?? DEMO_COMPANY_PROFILE.name,
          // Derruba quem estava com a demo aberta: tokens emitidos antes daqui
          // passam a ser recusados no /auth/me (ver getMeService).
          //
          // O `iat` do JWT tem resolução de 1 segundo, então o corte não
          // consegue separar tokens emitidos DENTRO do mesmo segundo do reset.
          // Escolhemos deixá-los passar: quem logar nesse segundo entra numa
          // demo recém-zerada, que é exatamente o estado esperado. A alternativa
          // (arredondar o corte para cima) criaria uma janela de até 1s em que
          // ninguém consegue logar — um bug visível para resolver um caso
          // inofensivo.
          sessionsValidFrom: new Date(),
          deletedAt: null,
        },
      })
    },
    // O default do Prisma (5s) é curto demais: a máquina da Fly e o compute do
    // Neon podem estar acordando quando o job dispara.
    { timeout: 60_000, maxWait: 20_000 },
  )

  // S3 só depois do commit — se o banco der rollback, os arquivos continuam
  // consistentes com as linhas. Uma falha aqui deixa objeto órfão (custo, não
  // corrupção), e o próximo reset varre o prefixo de novo e recolhe.
  let s3Deleted = 0
  if (s3Keys.size > 0) {
    try {
      await deleteS3Keys([...s3Keys])
      s3Deleted = s3Keys.size
    } catch (err: any) {
      console.error('[demo:reset] falha ao limpar o S3:', err?.message ?? err)
    }
  }

  return {
    companyId,
    companyName: company.name,
    ownerPreserved,
    deleted: { ...counts, s3Objects: s3Deleted },
  }
}
