import { randomInt } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { forgetCompanyActive } from '../../middlewares/auth'

/**
 * Integração com o Beets App (sistema interno da Beets): o Beets libera e corta o acesso das
 * empresas. A "conta" é identificada pela REFERÊNCIA do cliente no Beets (ex.: "beets:client:12"):
 * - sem código → 'none'; código gerado e ainda não usado → 'invited'
 * - empresa cadastrada com o código → 'active' ou 'inactive'
 */

// Sem caracteres que se confundem (0/O, 1/I/L): o código é digitado pelo cliente
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

type Db = Prisma.TransactionClient | typeof prisma

async function uniqueCode(db: Db) {
  for (;;) {
    const code = `AURA-${block()}-${block()}`
    if (!(await db.inviteCode.findUnique({ where: { code } }))) return code
  }
}

/** Situação da conta de um cliente do Beets */
export async function getAccount(reference: string, db: Db = prisma) {
  // Empresa já cadastrada com algum código desta referência (a mais recente)
  const used = await db.inviteCode.findFirst({
    where: { reference, companyId: { not: null } },
    orderBy: { usedAt: 'desc' },
    include: { company: { select: { id: true, name: true, tradeName: true, cnpj: true, active: true, deactivatedAt: true, createdAt: true } } },
  })
  if (used?.company) {
    const c = used.company
    return {
      status: c.active ? ('active' as const) : ('inactive' as const),
      company: { id: c.id, name: c.tradeName || c.name, cnpj: c.cnpj, registeredAt: c.createdAt, deactivatedAt: c.deactivatedAt },
      inviteCode: used.code,
    }
  }
  const pending = await db.inviteCode.findFirst({ where: { reference, usedAt: null }, orderBy: { createdAt: 'desc' } })
  if (pending) return { status: 'invited' as const, inviteCode: pending.code, company: null }
  return { status: 'none' as const, inviteCode: null, company: null }
}

/**
 * Libera o acesso: sem empresa ainda → código de cadastro (reaproveita o pendente); empresa
 * inativa → reativa; ativa → nada. Idempotente (o Beets pode chamar de novo sem duplicar)
 */
export async function provisionAccount(reference: string) {
  const account = await getAccount(reference)
  if (account.status === 'invited' || account.status === 'active') return account
  if (account.status === 'inactive') return setCompanyActive(reference, true)
  // Duas chamadas simultâneas não podem gerar dois códigos: trava a referência até o fim da
  // transação e confere de novo já com a trava
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${reference}))`
    const current = await getAccount(reference, tx)
    if (current.status !== 'none') return current
    await tx.inviteCode.create({ data: { code: await uniqueCode(tx), reference } })
    return getAccount(reference, tx)
  }, { timeout: 15_000 })
}

/** Inativa (não loga, sessões abertas caem) ou reativa a empresa da conta */
export async function setCompanyActive(reference: string, active: boolean) {
  const account = await getAccount(reference)
  if (!account.company) throw { statusCode: 404, message: 'Esta conta ainda não tem empresa cadastrada.' }
  await prisma.company.update({
    where: { id: account.company.id },
    data: active ? { active: true, deactivatedAt: null } : { active: false, deactivatedAt: new Date(), sessionsValidFrom: new Date() },
  })
  forgetCompanyActive(account.company.id)
  return getAccount(reference)
}

/**
 * Vincula uma empresa que JÁ EXISTE no Aura (cadastrada antes da integração, sem código do
 * Beets) ao cliente do Beets, pelo CNPJ (compara só os dígitos: há CNPJ salvo com e sem máscara).
 * Idempotente: já vinculada a esta referência → devolve a conta. Nunca toma o vínculo de outro
 * cliente do Beets (409). O vínculo é um código de cadastro marcado como usado pela empresa —
 * o mesmo registro que o cadastro normal cria, então getAccount/inativar/reativar já funcionam
 */
export async function linkAccount(reference: string, document: string) {
  const digits = document.replace(/\D/g, '')
  if (digits.length !== 14) throw { statusCode: 422, message: 'Informe o CNPJ do cliente (14 dígitos) para encontrar a empresa no Aura.' }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${reference}))`
    const current = await getAccount(reference, tx)
    if (current.company) return current

    const [company] = await tx.$queryRaw<{ id: number; createdAt: Date }[]>`
      SELECT id, "createdAt" FROM "Company" WHERE regexp_replace(coalesce(cnpj, ''), '[^0-9]', '', 'g') = ${digits} LIMIT 1`
    if (!company) throw { statusCode: 422, message: 'Nenhuma empresa no Aura com este CNPJ.' }

    const codes = await tx.inviteCode.findMany({ where: { companyId: company.id } })
    const other = codes.find((c) => c.reference && c.reference !== reference)
    if (other) throw { statusCode: 409, message: 'Esta empresa do Aura já está vinculada a outro cliente do Beets.' }

    // Código antigo (sem referência) que criou a empresa: passa a apontar para o cliente.
    // Empresa criada sem código nenhum: registra um código já usado só para o vínculo
    const legacy = codes.find((c) => !c.reference)
    if (legacy) await tx.inviteCode.update({ where: { id: legacy.id }, data: { reference } })
    else await tx.inviteCode.create({ data: { code: await uniqueCode(tx), reference, companyId: company.id, usedAt: company.createdAt } })
    return getAccount(reference, tx)
  }, { timeout: 15_000 })
}

