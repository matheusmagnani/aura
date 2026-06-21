import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import { listFollowUpsController, createFollowUpController, deleteFollowUpController } from './follow-up.controller'

export async function followUpRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requirePermission('clients', 'read')] }, listFollowUpsController)
  app.post('/', { preHandler: [requirePermission('clients', 'create')] }, createFollowUpController)
  app.delete('/:id', { preHandler: [requirePermission('clients', 'delete')] }, deleteFollowUpController)
}
