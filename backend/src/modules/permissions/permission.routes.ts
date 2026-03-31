import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import {
  getPermissionsByRoleIdController,
  updatePermissionsByRoleIdController,
} from './permission.controller'

export async function permissionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/:roleId', getPermissionsByRoleIdController)
  app.put('/:roleId', updatePermissionsByRoleIdController)
}
