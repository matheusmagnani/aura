import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  getPermissionsByRoleIdController,
  updatePermissionsByRoleIdController,
} from './permission.controller'

export async function permissionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  // GET: qualquer usuário autenticado pode buscar as próprias permissões
  app.get('/:roleId', getPermissionsByRoleIdController)
  app.put('/:roleId', { preHandler: [requirePermission('settings', 'edit')] }, updatePermissionsByRoleIdController)
}
