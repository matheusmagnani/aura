import { FastifyRequest, FastifyReply } from 'fastify'
import { Receiver } from '@upstash/qstash'
import { z } from 'zod'
import { env } from '../../env'
import { runJobService } from './job.service'

const paramsSchema = z.object({ name: z.string().min(1).max(64) })
const querySchema = z.object({
  dryRun: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})
// `dryRun` também pelo corpo: publicar pelo QStash com `?dryRun=true` na URL de
// destino exige encodar a query dentro da URL da API deles, o que é fácil de
// errar. Pelo body (`{"dryRun": true}`) não tem ambiguidade.
const bodySchema = z.object({ dryRun: z.boolean().optional() }).catch({ dryRun: undefined })

let receiver: Receiver | null = null

function getReceiver(): Receiver | null {
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) return null
  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
    })
  }
  return receiver
}

/**
 * Dispara um job do registry. Rota PÚBLICA em termos de rede, mas autenticada
 * pela assinatura do QStash (header `upstash-signature`): um JWT assinado com
 * as signing keys da conta, cujo payload inclui o hash do corpo da requisição.
 * É mais seguro que um shared secret em header — o secret vaza em qualquer log
 * de proxy, a assinatura não se reaproveita.
 *
 * Sem as chaves configuradas o endpoint responde 503: preferimos o job não
 * rodar a expor um gatilho de HARD DELETE sem autenticação nenhuma.
 */
export async function runJobController(request: FastifyRequest, reply: FastifyReply) {
  const { name } = paramsSchema.parse(request.params)
  const { dryRun: dryRunQuery } = querySchema.parse(request.query)
  const { dryRun: dryRunBody } = bodySchema.parse(request.body ?? {})
  const dryRun = dryRunQuery || dryRunBody === true

  const qstashReceiver = getReceiver()
  if (!qstashReceiver) {
    return reply.status(503).send({
      statusCode: 503,
      error: 'Service Unavailable',
      message: 'Jobs não configurados (QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY).',
    })
  }

  const signature = request.headers['upstash-signature'] as string | undefined
  if (!signature) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Assinatura ausente.',
    })
  }

  try {
    const isValid = await qstashReceiver.verify({
      signature,
      // O hash é do corpo CRU — o JSON re-serializado pelo Fastify não bate.
      body: (request as any).rawBody ?? '',
      // Só validamos a URL quando ela é conhecida: atrás do proxy da Fly a URL
      // reconstruída pode divergir (http/https, host interno) e reprovar uma
      // assinatura legítima.
      ...(env.JOBS_PUBLIC_URL
        ? { url: `${env.JOBS_PUBLIC_URL.replace(/\/$/, '')}/api/jobs/${name}/run` }
        : {}),
    })

    if (!isValid) throw new Error('assinatura inválida')
  } catch (err: any) {
    console.warn(`[job:${name}] assinatura recusada:`, err?.message ?? err)
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Assinatura inválida.',
    })
  }

  // Erros do job propagam pro error handler global (500) de propósito: é o
  // não-2xx que faz o QStash reagendar o retry e, esgotados, mandar pra DLQ.
  const result = await runJobService(name, dryRun)
  return reply.send(result)
}
