import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import { getCompanyInfoController, updateCompanyInfoController } from './settings.controller'

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/company', { preHandler: [authenticate, requirePermission('settings', 'read')] }, getCompanyInfoController)
  app.put('/company', { preHandler: [authenticate, requirePermission('settings', 'edit')] }, updateCompanyInfoController)
}
