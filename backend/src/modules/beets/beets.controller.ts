import { timingSafeEqual } from 'node:crypto'
import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { env } from '../../env'
import { getAccount, linkAccount, provisionAccount, setCompanyActive } from './beets.service'

const referenceParams = z.object({ reference: z.string().min(1).max(100) })

/**
 * Só o Beets App chama estas rotas: autenticação pela chave `BEETS_API_KEY` no header
 * `x-beets-api-key` (comparação em tempo constante). Sem a chave configurada → 503
 */
export async function requireBeetsKey(request: FastifyRequest, reply: FastifyReply) {
  if (!env.BEETS_API_KEY) return reply.status(503).send({ message: 'Integração com o Beets App não configurada.' })
  const given = Buffer.from(String(request.headers['x-beets-api-key'] ?? ''))
  const expected = Buffer.from(env.BEETS_API_KEY)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return reply.status(401).send({ message: 'Chave inválida.' })
}

async function handle(reply: FastifyReply, fn: () => Promise<unknown>) {
  try {
    return reply.send(await fn())
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export const pingController = (_request: FastifyRequest, reply: FastifyReply) => reply.send({ ok: true, product: 'aura' })

export const getAccountController = (request: FastifyRequest, reply: FastifyReply) =>
  handle(reply, () => getAccount(referenceParams.parse(request.params).reference))

export const provisionAccountController = (request: FastifyRequest, reply: FastifyReply) =>
  handle(reply, () => provisionAccount(referenceParams.parse(request.params).reference))

export const deactivateAccountController = (request: FastifyRequest, reply: FastifyReply) =>
  handle(reply, () => setCompanyActive(referenceParams.parse(request.params).reference, false))

export const activateAccountController = (request: FastifyRequest, reply: FastifyReply) =>
  handle(reply, () => setCompanyActive(referenceParams.parse(request.params).reference, true))

const linkBody = z.object({ document: z.string().min(1).max(30) })

export const linkAccountController = (request: FastifyRequest, reply: FastifyReply) =>
  handle(reply, () => linkAccount(referenceParams.parse(request.params).reference, linkBody.parse(request.body ?? {}).document))

