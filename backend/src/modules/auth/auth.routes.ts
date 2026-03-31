import { FastifyInstance } from 'fastify'
import { authenticate } from '../../middlewares/auth'
import {
  registerController,
  loginController,
  refreshController,
  meController,
} from './auth.controller'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', registerController)
  app.post('/login', loginController)
  app.post('/refresh', { preHandler: [authenticate] }, refreshController)
  app.get('/me', { preHandler: [authenticate] }, meController)
}
