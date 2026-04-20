import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import { listLogsController } from './log.controller'

export async function logRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.get('/', { preHandler: [requirePermission('settings', 'read')] }, listLogsController)
}
