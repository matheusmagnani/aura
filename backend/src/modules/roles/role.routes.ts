import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import {
  listRolesController,
  getRoleByIdController,
  createRoleController,
  updateRoleController,
  deleteRoleController,
} from './role.controller'

export async function roleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', listRolesController)
  app.get('/:id', getRoleByIdController)
  app.post('/', createRoleController)
  app.put('/:id', updateRoleController)
  app.delete('/:id', deleteRoleController)
}
