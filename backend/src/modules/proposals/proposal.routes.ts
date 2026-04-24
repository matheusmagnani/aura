import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import { requirePermission } from '../../middlewares/permission'
import {
  listProposalsController,
  getProposalByIdController,
  createProposalController,
  updateProposalController,
  deleteProposalController,
} from './proposal.controller'

export async function proposalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requirePermission('proposals', 'read')] }, listProposalsController)
  app.get('/:id', { preHandler: [requirePermission('proposals', 'read')] }, getProposalByIdController)
  app.post('/', { preHandler: [requirePermission('proposals', 'create')] }, createProposalController)
  app.put('/:id', { preHandler: [requirePermission('proposals', 'edit')] }, updateProposalController)
  app.delete('/:id', { preHandler: [requirePermission('proposals', 'delete')] }, deleteProposalController)
}
