import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import {
  dashboardAppointmentsController,
  dashboardClientsController,
  dashboardClientStatsController,
  dashboardGetClientByIdController,
  dashboardClientLogsController,
  dashboardClientStatusesController,
  dashboardCollaboratorsSelectController,
  dashboardProposalsController,
  dashboardProposalStatsController,
  dashboardCreateAppointmentController,
  dashboardUpdateAppointmentController,
  dashboardDeleteAppointmentController,
  dashboardCreateClientController,
  dashboardUpdateClientController,
  dashboardDeleteClientController,
  dashboardCreateProposalController,
  dashboardUpdateProposalController,
  dashboardDeleteProposalController,
} from './dashboard.controller'

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/appointments', dashboardAppointmentsController)
  app.post('/appointments', dashboardCreateAppointmentController)
  app.put('/appointments/:id', dashboardUpdateAppointmentController)
  app.delete('/appointments/:id', dashboardDeleteAppointmentController)

  app.get('/client-statuses', dashboardClientStatusesController)
  app.get('/collaborators', dashboardCollaboratorsSelectController)

  app.get('/clients', dashboardClientsController)
  app.get('/client-stats', dashboardClientStatsController)
  app.get('/clients/:id', dashboardGetClientByIdController)
  app.get('/client-logs/:entityId', dashboardClientLogsController)
  app.post('/clients', dashboardCreateClientController)
  app.put('/clients/:id', dashboardUpdateClientController)
  app.delete('/clients/:id', dashboardDeleteClientController)

  app.get('/proposals', dashboardProposalsController)
  app.get('/proposal-stats', dashboardProposalStatsController)
  app.post('/proposals', dashboardCreateProposalController)
  app.put('/proposals/:id', dashboardUpdateProposalController)
  app.delete('/proposals/:id', dashboardDeleteProposalController)
}
