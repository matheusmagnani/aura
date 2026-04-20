import { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { listLogsService } from './log.service'

export async function listLogsController(request: FastifyRequest, reply: FastifyReply) {
  const schema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().default(30),
    modules: z.string().optional().transform((v) => v ? v.split(',') : undefined),
    actions: z.string().optional().transform((v) => v ? v.split(',') : undefined),
    userIds: z.string().optional().transform((v) => v ? v.split(',').map(Number) : undefined),
    entityId: z.coerce.number().optional(),
    entityModule: z.string().optional(),
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })

  const query = schema.parse(request.query)
  const { companyId } = request.user as { companyId: number }

  const result = await listLogsService({ ...query, companyId })
  return reply.send(result)
}
