import { prisma } from '../../lib/prisma'

export type LandingEventType = 'visit' | 'cta_click'

export interface RecordLandingEventInput {
  type: LandingEventType
  repSlug?: string | null
  userAgent?: string | null
  referrer?: string | null
}

/**
 * Grava um evento de funil da landing (append-only). Sem companyId/actor —
 * é dado público de pré-cadastro. Métricas (visitas/cliques por representante)
 * são derivadas depois por agregação sobre esses eventos.
 */
export async function recordLandingEventService(input: RecordLandingEventInput) {
  await prisma.landingEvent.create({
    data: {
      type: input.type,
      repSlug: input.repSlug ?? null,
      userAgent: input.userAgent ?? null,
      referrer: input.referrer ?? null,
    },
  })
}
