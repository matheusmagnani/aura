import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { recordLandingEventService, listActiveRepsService } from './landing.service'

const bodySchema = z.object({
  type: z.enum(['visit', 'cta_click']),
  slug: z.string().trim().min(1).max(64).optional().nullable(),
  referrer: z.string().max(512).optional().nullable(),
})

// UAs de crawlers e previews de link (WhatsApp, Facebook, etc.). Não contam
// como visita real — a maioria nem executa JS, mas filtramos por garantia.
const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|preview|headless|monitor|curl|wget|python-requests|axios|go-http|okhttp/i

/**
 * Registra um evento da landing (visit | cta_click). Rota PÚBLICA, sem auth.
 * Responde 204 sempre (fire-and-forget) — inclusive quando ignora bot ou
 * payload inválido — pra não gerar retry no cliente.
 */
export async function recordLandingEventController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userAgent = (request.headers['user-agent'] as string | undefined) ?? ''

  if (!userAgent || BOT_UA.test(userAgent)) {
    return reply.status(204).send()
  }

  const parsed = bodySchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(204).send()
  }

  await recordLandingEventService({
    type: parsed.data.type,
    slug: parsed.data.slug ?? null,
    userAgent: userAgent.slice(0, 512),
    referrer: parsed.data.referrer ?? null,
  })

  return reply.status(204).send()
}

/**
 * Lista os representantes ativos (slug, name, whatsapp). Público — consumido
 * pela landing (build/ISR) para montar as páginas por representante.
 */
export async function listRepsController(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const reps = await listActiveRepsService()
  return reply.send(reps)
}
