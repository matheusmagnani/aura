import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { env } from './env'
import { authRoutes } from './modules/auth/auth.routes'
import { roleRoutes } from './modules/roles/role.routes'
import { permissionRoutes } from './modules/permissions/permission.routes'

export const app = fastify()

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
