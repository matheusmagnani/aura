/**
 * Horário do reset da empresa de demonstração.
 *
 * O agendamento em si vive no QStash (fora do código), então este arquivo é a
 * cópia que o backend usa para informar ao frontend quando será o próximo reset
 * — é o que alimenta a contagem regressiva da faixa de aviso.
 *
 * ⚠️ Se mudar o cron no QStash, mude aqui também: são duas fontes que precisam
 * concordar, e a divergência só apareceria como uma contagem errada na tela.
 *
 * Reset: todo domingo às 00:00 de Brasília. O Brasil não tem horário de verão
 * desde 2019, então BRT é sempre UTC-3 e domingo 00:00 BRT = domingo 03:00 UTC.
 */
export const DEMO_RESET_CRON_UTC = '0 3 * * 0'

/**
 * A foto do usuário demo (`DEMO_USER_AVATAR`) é um arquivo fixo no S3, subido
 * uma vez à mão — diferente dos avatars comuns, que nascem e morrem com o
 * usuário. Ela NUNCA pode ser apagada, senão o reset seguinte restaura uma URL
 * quebrada e não há como recuperar sem subir o arquivo de novo.
 *
 * Três caminhos apagariam essa imagem se não fosse por esta checagem:
 *   1. o prospect trocar a foto no perfil (`uploadAvatarService` apaga a antiga)
 *   2. o prospect remover a foto (`removeAvatarService`)
 *   3. o próprio `demo:reset`, que limpa os avatars da empresa no S3
 */
export function isProtectedDemoAvatar(url: string | null | undefined): boolean {
  if (!url) return false
  const demoAvatar = process.env.DEMO_USER_AVATAR
  return !!demoAvatar && url === demoAvatar
}

const RESET_WEEKDAY_UTC = 0 // domingo
const RESET_HOUR_UTC = 3 // 00:00 em Brasília

/**
 * Próximo instante em que o reset vai rodar, em UTC. Devolver um instante
 * absoluto (e não "faltam X dias") deixa a conta certa em qualquer fuso: o
 * navegador calcula a diferença contra o relógio local de quem está vendo.
 */
export function nextDemoResetAt(from: Date = new Date()): Date {
  const next = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      RESET_HOUR_UTC,
      0,
      0,
      0,
    ),
  )

  const daysAhead = (RESET_WEEKDAY_UTC - next.getUTCDay() + 7) % 7
  next.setUTCDate(next.getUTCDate() + daysAhead)

  // Se já passou do horário hoje (ou o cálculo caiu no passado), vai para a
  // semana seguinte.
  if (next.getTime() <= from.getTime()) {
    next.setUTCDate(next.getUTCDate() + 7)
  }

  return next
}
