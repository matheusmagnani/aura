import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listClientsController,
  getClientByIdController,
  createClientController,
  updateClientController,
  deleteClientController,
} from './client.controller'

export async function clientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requirePermission('clients', 'read')] }, listClientsController)
  app.get('/:id', { preHandler: [requirePermission('clients', 'read')] }, getClientByIdController)
  app.post('/', { preHandler: [requirePermission('clients', 'create')] }, createClientController)
  app.put('/:id', { preHandler: [requirePermission('clients', 'edit')] }, updateClientController)
  app.delete('/:id', { preHandler: [requirePermission('clients', 'delete')] }, deleteClientController)
}
