import { prisma } from '../../lib/prisma'

export type LandingEventType = 'visit' | 'cta_click'

export interface RecordLandingEventInput {
  type: LandingEventType
  slug?: string | null
  userAgent?: string | null
  referrer?: string | null
}

/**
 * Grava um evento de funil (append-only em LandingEvent) e, se o slug casar
 * com um representante ativo, incrementa o contador correspondente na
 * LandingRep — tudo numa transação. Slug ausente ou desconhecido → evento com
 * repId null (landing raiz / não atribuído), sem incrementar contador.
 */
export async function recordLandingEventService(input: RecordLandingEventInput) {
  const slug = input.slug ? input.slug.toLowerCase() : null

  const rep = slug
    ? await prisma.landingRep.findFirst({
        where: { slug, active: true },
        select: { id: true },
      })
    : null

  const eventData = {
    repId: rep?.id ?? null,
    type: input.type,
    userAgent: input.userAgent ?? null,
    referrer: input.referrer ?? null,
  }

  if (rep) {
    const counter =
      input.type === 'visit'
        ? { visits: { increment: 1 } }
        : { ctaClicks: { increment: 1 } }

    await prisma.$transaction([
      prisma.landingEvent.create({ data: eventData }),
      prisma.landingRep.update({ where: { id: rep.id }, data: counter }),
    ])
  } else {
    await prisma.landingEvent.create({ data: eventData })
  }
}

/**
 * Lista os representantes ativos para a landing consumir (nome + WhatsApp por
 * slug). Público — não expõe contadores nem dados sensíveis.
 */
export async function listActiveRepsService() {
  return prisma.landingRep.findMany({
    where: { active: true },
    select: { slug: true, name: true, whatsapp: true },
    orderBy: { name: 'asc' },
  })
}
