import { FastifyInstance } from 'fastify'
import {
  activateAccountController,
  deactivateAccountController,
  getAccountController,
  linkAccountController,
  pingController,
  provisionAccountController,
  requireBeetsKey,
} from './beets.controller'

/**
 * Integração com o Beets App (sem JWT — autenticação pela chave `x-beets-api-key`).
 * A "conta" é a referência do cliente no Beets (ex.: beets:client:12)
 */
export async function beetsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireBeetsKey)
  app.get('/ping', pingController)
  app.get('/accounts/:reference', getAccountController)
  // Libera: gera código de cadastro (ou reativa a empresa, se já existe)
  app.post('/accounts/:reference/provision', provisionAccountController)
  app.post('/accounts/:reference/deactivate', deactivateAccountController)
  app.post('/accounts/:reference/activate', activateAccountController)
  // Vincula empresa que já existia no Aura (antes da integração) ao cliente, pelo CNPJ
  app.post('/accounts/:reference/link', linkAccountController)
}
