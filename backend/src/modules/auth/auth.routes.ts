import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import {
  registerController,
  validateInviteController,
  loginController,
  refreshController,
  meController,
  updateProfileController,
  uploadAvatarController,
  removeAvatarController,
  changePasswordController,
} from './auth.controller'

export async function authRoutes(app: FastifyInstance) {
  app.post('/validate-invite', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, validateInviteController)
  app.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, registerController)
  app.post('/login', loginController)
  app.post('/refresh', { preHandler: [authenticate] }, refreshController)
  app.get('/me', { preHandler: [authenticate] }, meController)
  app.put('/me', { preHandler: [authenticate] }, updateProfileController)
  app.post('/me/avatar', { preHandler: [authenticate] }, uploadAvatarController)
  app.delete('/me/avatar', { preHandler: [authenticate] }, removeAvatarController)
  app.put('/me/password', { preHandler: [authenticate] }, changePasswordController)
}
