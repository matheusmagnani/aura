import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listContractTemplatesController,
  createContractTemplateController,
  updateContractTemplateController,
  deleteContractTemplateController,
} from './contract-template.controller'

export async function contractTemplateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requirePermission('settings', 'read')] }, listContractTemplatesController)
  app.post('/', { preHandler: [requirePermission('settings', 'create')] }, createContractTemplateController)
  app.put('/:id', { preHandler: [requirePermission('settings', 'edit')] }, updateContractTemplateController)
  app.delete('/:id', { preHandler: [requirePermission('settings', 'delete')] }, deleteContractTemplateController)
}
