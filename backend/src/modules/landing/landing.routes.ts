import { FastifyInstance } from 'fastify'
import { recordLandingEventController, listRepsController } from './landing.controller'

/**
 * Rotas PÚBLICAS da landing (sem authenticate). Ingest de eventos de funil.
 */
export async function landingRoutes(app: FastifyInstance) {
  // O sendBeacon do navegador envia um Blob text/plain (evita preflight de CORS).
  // Parser escopado a este plugin: interpreta o corpo text/plain como JSON.
  app.addContentTypeParser(
    'text/plain',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        done(null, body ? JSON.parse(body as string) : {})
      } catch {
        done(null, {})
      }
    },
  )

  // Rate limit por IP pra conter spam (@fastify/rate-limit já registrado global:false).
  app.post(
    '/events',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    recordLandingEventController,
  )

  // Lista de representantes ativos (consumida pela landing no build/ISR).
  app.get('/reps', listRepsController)
}
