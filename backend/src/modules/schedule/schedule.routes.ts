import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listAppointmentsController,
  getAppointmentByIdController,
  createAppointmentController,
  updateAppointmentController,
  deleteAppointmentController,
} from './schedule.controller'

export async function scheduleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requirePermission('schedule', 'read')] }, listAppointmentsController)
  app.get('/:id', { preHandler: [requirePermission('schedule', 'read')] }, getAppointmentByIdController)
  app.post('/', { preHandler: [requirePermission('schedule', 'create')] }, createAppointmentController)
  app.put('/:id', { preHandler: [requirePermission('schedule', 'edit')] }, updateAppointmentController)
  app.delete('/:id', { preHandler: [requirePermission('schedule', 'delete')] }, deleteAppointmentController)
}
