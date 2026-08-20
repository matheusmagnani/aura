import { resetDemoCompanyJob } from './handlers/resetDemoCompany'

export interface JobContext {
  /** Quando true, o job apenas apura o que faria (sem escrever nada). */
  dryRun: boolean
}

/**
 * Um job devolve um resumo do que fez — gravado em `JobRun.result` e devolvido
 * na resposta HTTP, pra aparecer no dashboard do QStash.
 */
export type JobHandler = (ctx: JobContext) => Promise<Record<string, unknown>>

/**
 * Registry de jobs agendados. Para adicionar um job novo:
 *   1. crie o handler em `handlers/`
 *   2. registre aqui com um nome no formato `dominio:acao`
 *   3. crie o schedule no painel do QStash apontando pra
 *      POST {JOBS_PUBLIC_URL}/api/jobs/{nome}/run
 *
 * Nenhum código de rota/infra precisa mudar.
 */
export const JOB_REGISTRY: Record<string, JobHandler> = {
  'demo:reset': resetDemoCompanyJob,
}

export function isJobName(name: string): name is keyof typeof JOB_REGISTRY {
  return Object.prototype.hasOwnProperty.call(JOB_REGISTRY, name)
}
