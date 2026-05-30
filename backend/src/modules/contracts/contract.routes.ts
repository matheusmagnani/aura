import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listContractsController,
  getContractController,
  createContractController,
  deleteContractController,
  downloadContractController,
  uploadContractImageController,
} from './contract.controller'

export async function contractRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requirePermission('clients', 'read')] }, listContractsController)
  app.get('/:id', { preHandler: [requirePermission('clients', 'read')] }, getContractController)
  app.get('/:id/download', { preHandler: [requirePermission('clients', 'read')] }, downloadContractController)
  app.post('/', { preHandler: [requirePermission('clients', 'create')] }, createContractController)
  app.delete('/:id', { preHandler: [requirePermission('clients', 'delete')] }, deleteContractController)
  app.post('/upload-image', { preHandler: [requirePermission('settings', 'edit')] }, uploadContractImageController)
}
