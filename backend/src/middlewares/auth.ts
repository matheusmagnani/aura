import { FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma'
import { COMPANY_INACTIVE_MESSAGE } from '../modules/auth/auth.service'

/**
 * Empresa ativa? Cache curto em memória: a checagem roda em TODA rota autenticada. O cache é
 * por máquina — a inativação zera o da máquina que a recebeu, mas as outras só enxergam quando o
 * cache expira. Por isso o TTL é curto (15s): limita o atraso sem consultar o banco a cada request
 */
const ACTIVE_CACHE_MS = 15_000
const activeCache = new Map<number, { active: boolean; at: number }>()

async function isCompanyActive(companyId: number) {
  const cached = activeCache.get(companyId)
  if (cached && Date.now() - cached.at < ACTIVE_CACHE_MS) return cached.active
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { active: true } })
  const active = company?.active ?? false
  activeCache.set(companyId, { active, at: Date.now() })
  return active
}

/** Inativou/reativou: esquece o cache para valer na hora nesta máquina */
export function forgetCompanyActive(companyId: number) {
  activeCache.delete(companyId)
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ message: 'Token inválido ou expirado.' })
  }

  // Empresa inativada pelo Beets App: a sessão aberta cai (401 → o front volta ao login)
  const companyId = (request.user as { companyId?: number }).companyId
  if (companyId && !(await isCompanyActive(companyId))) {
    return reply.status(401).send({ message: COMPANY_INACTIVE_MESSAGE })
  }
}
