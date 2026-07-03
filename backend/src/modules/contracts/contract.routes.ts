import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listContractsController,
  getContractController,
  createContractController,
  deleteContractController,
  downloadContractController,
  regeneratePdfController,
  uploadContractImageController,
  deleteContractImageController,
} from './contract.controller'

export async function contractRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', listContractsController)
  app.get('/:id', getContractController)
  app.get('/:id/download', downloadContractController)
  app.post('/', createContractController)
  app.post('/:id/regenerate-pdf', regeneratePdfController)
  app.delete('/:id', deleteContractController)
  app.post('/upload-image', { preHandler: [requirePermission('settings', 'edit')] }, uploadContractImageController)
  app.delete('/image', { preHandler: [requirePermission('settings', 'edit')] }, deleteContractImageController)
}
