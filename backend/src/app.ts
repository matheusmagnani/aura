import fastify, { FastifyError } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { ZodError } from 'zod'
import { env } from './env'
import './lib/zodErrorMap'
import { authRoutes } from './modules/auth/auth.routes'
import { roleRoutes } from './modules/roles/role.routes'
import { permissionRoutes } from './modules/permissions/permission.routes'
import { clientRoutes } from './modules/clients/client.routes'
import { collaboratorRoutes } from './modules/collaborators/collaborator.routes'
import { settingsRoutes } from './modules/settings/settings.routes'
import { clientStatusRoutes } from './modules/client-statuses/client-status.routes'
import { logRoutes } from './modules/logs/log.routes'
import { scheduleRoutes } from './modules/schedule/schedule.routes'
import { proposalRoutes } from './modules/proposals/proposal.routes'

export const app = fastify()

app.setErrorHandler((error: FastifyError | ZodError, _request, reply) => {
  if (error instanceof ZodError) {
    const messages = error.errors.map((e) => e.message)
    return reply.status(400).send({
      statusCode: 400,
      error: 'Validation Error',
      message: messages.join(', '),
    })
  }

  const fastifyError = error as FastifyError
  if (fastifyError.statusCode) {
    return reply.status(fastifyError.statusCode).send({
      statusCode: fastifyError.statusCode,
      error: fastifyError.name,
      message: fastifyError.message,
    })
  }

  app.log.error(error)
  return reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Ocorreu um erro inesperado.',
  })
})

app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
})

app.register(helmet, {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
})

app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: '7d' },
})

app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 },
})

app.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'uploads'),
  prefix: '/uploads/',
})

app.register(authRoutes, { prefix: '/api/auth' })
app.register(roleRoutes, { prefix: '/api/roles' })
app.register(permissionRoutes, { prefix: '/api/permissions' })
app.register(clientRoutes, { prefix: '/api/clients' })
app.register(collaboratorRoutes, { prefix: '/api/collaborators' })
app.register(settingsRoutes, { prefix: '/api/settings' })
app.register(clientStatusRoutes, { prefix: '/api/client-statuses' })
app.register(logRoutes, { prefix: '/api/logs' })
app.register(scheduleRoutes, { prefix: '/api/schedule' })
app.register(proposalRoutes, { prefix: '/api/proposals' })
