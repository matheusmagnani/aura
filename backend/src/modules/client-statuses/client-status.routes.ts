import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listClientStatusesController,
  createClientStatusController,
  updateClientStatusController,
  deleteClientStatusController,
} from './client-status.controller'

export async function clientStatusRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requirePermission('clients', 'read')] }, listClientStatusesController)
  app.post('/', { preHandler: [requirePermission('clients', 'create')] }, createClientStatusController)
  app.put('/:id', { preHandler: [requirePermission('clients', 'edit')] }, updateClientStatusController)
  app.delete('/:id', { preHandler: [requirePermission('clients', 'delete')] }, deleteClientStatusController)
}
