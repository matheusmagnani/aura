import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listRolesController,
  listRolesSelectController,
  getRoleByIdController,
  createRoleController,
  updateRoleController,
  deleteRoleController,
} from './role.controller'

export async function roleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/select', listRolesSelectController)
  app.get('/', { preHandler: [requirePermission('settings', 'read')] }, listRolesController)
  app.get('/:id', { preHandler: [requirePermission('settings', 'read')] }, getRoleByIdController)
  app.post('/', { preHandler: [requirePermission('settings', 'create')] }, createRoleController)
  app.put('/:id', { preHandler: [requirePermission('settings', 'edit')] }, updateRoleController)
  app.delete('/:id', { preHandler: [requirePermission('settings', 'delete')] }, deleteRoleController)
}
