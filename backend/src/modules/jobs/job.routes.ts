import { FastifyInstance } from 'fastify'
import { runJobController } from './job.controller'

/**
 * Rotas de jobs agendados. Sem `authenticate` (JWT) — quem chama é o QStash,
 * que se autentica pela assinatura verificada no controller.
 */
export async function jobRoutes(app: FastifyInstance) {
  // A verificação da assinatura do QStash usa o hash do corpo CRU, então
  // guardamos a string original antes de parsear. Parser escopado a este
  // plugin (não afeta o resto da API).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    ;(req as any).rawBody = (body as string) ?? ''
    try {
      done(null, body ? JSON.parse(body as string) : {})
    } catch {
      done(null, {})
    }
  })

  // Rate limit: o QStash dispara pouquíssimas vezes: qualquer volume acima
  // disso é abuso batendo num gatilho de hard delete.
  app.post(
    '/:name/run',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    runJobController,
  )
}
