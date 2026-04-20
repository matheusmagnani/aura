import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { getCompanyInfoService, updateCompanyInfoService } from './settings.service'

export async function getCompanyInfoController(request: FastifyRequest, reply: FastifyReply) {
  const { companyId } = request.user as { companyId: number }

  try {
    const company = await getCompanyInfoService(companyId)
    return reply.send(company)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}

export async function updateCompanyInfoController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    companyName: z.string().min(3, 'Razão social deve ter pelo menos 3 caracteres').optional(),
    tradeName: z.string().optional(),
    cnpj: z.string().optional(),
    department: z.string().optional(),
    email: z.string().email('E-mail inválido').optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComplement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2).optional(),
    zipCode: z.string().optional(),
  })

  const data = schema.parse(request.body)
  const { companyId, userId } = request.user as { companyId: number; userId: number }

  try {
    const company = await updateCompanyInfoService(companyId, data, { userId })
    return reply.send(company)
  } catch (error: any) {
    if (error.statusCode) return reply.status(error.statusCode).send({ message: error.message })
    throw error
  }
}
