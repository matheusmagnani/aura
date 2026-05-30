import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { uploadToS3 } from '../../lib/s3'
import {
  listContractsService,
  getContractService,
  createContractService,
  deleteContractService,
} from './contract.service'

export async function listContractsController(request: FastifyRequest, reply: FastifyReply) {
  const { clientId, page, limit } = z.object({
    clientId: z.coerce.number(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).optional(),
  }).parse(request.query)
  const { companyId } = request.user as { companyId: number }
  const contracts = await listContractsService(companyId, clientId, page, limit)
  return reply.send(contracts)
}

export async function getContractController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId } = request.user as { companyId: number }

  try {
    const contract = await getContractService(id, companyId)
    return reply.send(contract)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function createContractController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    templateId: z.number().int().positive(),
    clientId: z.number().int().positive(),
    proposalId: z.number().int().positive(),
  })
  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const contract = await createContractService(data, companyId, { userId })
    return reply.status(201).send(contract)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function deleteContractController(request: FastifyRequest, reply: FastifyReply) {
  const { id } = z.object({ id: z.coerce.number() }).parse(request.params)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    await deleteContractService(id, companyId, { userId })
    return reply.status(204).send()
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function uploadContractImageController(request: FastifyRequest, reply: FastifyReply) {
  const { companyId } = request.user as { companyId: number }

  const data = await request.file()
  if (!data) return reply.status(400).send({ message: 'Nenhum arquivo enviado.' })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  if (!allowed.includes(data.mimetype)) {
    return reply.status(400).send({ message: 'Formato inválido. Use JPEG, PNG, WebP, GIF ou SVG.' })
  }

  const ext = data.mimetype.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg')
  const key = `contracts/images/${companyId}-${Date.now()}.${ext}`
  const buffer = await data.toBuffer()

  try {
    const url = await uploadToS3(key, buffer, data.mimetype)
    return reply.send({ url })
  } catch (error: any) {
    console.error('[S3 Upload Error]', error)
    return reply.status(500).send({ message: error?.message || 'Erro ao enviar imagem.' })
  }
}
