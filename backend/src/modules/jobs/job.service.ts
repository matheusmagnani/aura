import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { JOB_REGISTRY, isJobName } from './job.registry'

/**
 * Janela em que um JobRun com status 'running' ainda é considerado vivo. Se
 * um job travar (ex.: processo morto no meio), depois desse tempo um novo
 * disparo volta a ser aceito em vez de ficar bloqueado pra sempre.
 */
const STALE_RUN_MS = 15 * 60 * 1000

export interface RunJobResult {
  status: 'success' | 'skipped'
  jobRunId: number | null
  durationMs: number | null
  result: Record<string, unknown> | null
  reason?: string
}

/**
 * Executa um job do registry, gravando o histórico em `JobRun`.
 *
 * O QStash reenvia a mensagem quando a resposta não é 2xx — e um reenvio pode
 * chegar enquanto a execução anterior ainda roda (a Fly acorda devagar). Por
 * isso, antes de rodar, verificamos se já existe uma execução 'running' recente
 * do mesmo job e, se houver, respondemos "skipped" com 200 (não é erro: é o
 * comportamento correto, e responder 200 impede o QStash de insistir).
 *
 * Não é um lock atômico — duas chamadas exatamente simultâneas podem passar.
 * É suficiente aqui porque os jobs são idempotentes; se um dia entrar um job
 * que não seja, ele precisa do próprio controle de concorrência.
 */
export async function runJobService(name: string, dryRun: boolean): Promise<RunJobResult> {
  if (!isJobName(name)) {
    throw { statusCode: 404, message: `Job "${name}" não existe.` }
  }

  const runningSince = new Date(Date.now() - STALE_RUN_MS)
  const running = await prisma.jobRun.findFirst({
    where: { name, status: 'running', startedAt: { gte: runningSince } },
    select: { id: true },
  })

  if (running) {
    return {
      status: 'skipped',
      jobRunId: running.id,
      durationMs: null,
      result: null,
      reason: `Já existe uma execução em andamento (JobRun #${running.id}).`,
    }
  }

  const jobRun = await prisma.jobRun.create({
    data: { name, status: 'running', dryRun },
    select: { id: true, startedAt: true },
  })

  try {
    const result = await JOB_REGISTRY[name]({ dryRun })
    const durationMs = Date.now() - jobRun.startedAt.getTime()

    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'success',
        finishedAt: new Date(),
        durationMs,
        result: result as Prisma.InputJsonValue,
      },
    })

    console.log(`[job:${name}] concluído em ${durationMs}ms`, JSON.stringify(result))

    return { status: 'success', jobRunId: jobRun.id, durationMs, result }
  } catch (err: any) {
    const durationMs = Date.now() - jobRun.startedAt.getTime()
    const message = err?.message ?? String(err)

    // O update do JobRun não pode derrubar o erro original — se ele falhar
    // (ex.: banco fora), preferimos propagar a causa real pro QStash.
    try {
      await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: { status: 'error', finishedAt: new Date(), durationMs, error: message.slice(0, 2000) },
      })
    } catch {}

    console.error(`[job:${name}] falhou após ${durationMs}ms:`, message, err?.stack)
    throw err
  }
}
