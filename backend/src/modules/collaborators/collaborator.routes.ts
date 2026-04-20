import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listCollaboratorsController,
  getCollaboratorByIdController,
  createCollaboratorController,
  updateCollaboratorController,
  deleteCollaboratorController,
  resetCollaboratorPasswordController,
} from './collaborator.controller'

export async function collaboratorRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requirePermission('collaborators', 'read')] }, listCollaboratorsController)
  app.get('/:id', { preHandler: [requirePermission('collaborators', 'read')] }, getCollaboratorByIdController)
  app.post('/', { preHandler: [requirePermission('collaborators', 'create')] }, createCollaboratorController)
  app.put('/:id', { preHandler: [requirePermission('collaborators', 'edit')] }, updateCollaboratorController)
  app.delete('/:id', { preHandler: [requirePermission('collaborators', 'delete')] }, deleteCollaboratorController)
  app.put('/:id/password', { preHandler: [requirePermission('collaborators', 'edit')] }, resetCollaboratorPasswordController)
}
