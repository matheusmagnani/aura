/**
 * Formata quanto falta para o reset da conta de demonstração.
 *
 * Recebe o instante absoluto vindo do backend (`demoResetAt`, em UTC) e compara
 * com o relógio local — então a contagem fica certa em qualquer fuso.
 */

export interface TempoAteReset {
  /** Preposição da frase ("em"), separada para poder ficar fora do destaque */
  prefixo: string
  /** O tempo em si ("2 dias e 5 horas") — é o que recebe cor/negrito */
  valor: string
}

/**
 * Separa preposição e valor. Nos casos-limite o prefixo vem vazio, porque
 * "em a qualquer momento" não existe em português.
 */
export function tempoAteReset(resetAtIso: string | null | undefined): TempoAteReset {
  if (!resetAtIso) return { prefixo: '', valor: 'em breve' }

  const ms = new Date(resetAtIso).getTime() - Date.now()
  if (Number.isNaN(ms)) return { prefixo: '', valor: 'em breve' }
  if (ms <= 0) return { prefixo: '', valor: 'a qualquer momento' }

  const totalMinutos = Math.floor(ms / 60000)
  const dias = Math.floor(totalMinutos / (60 * 24))
  const horas = Math.floor((totalMinutos % (60 * 24)) / 60)
  const minutos = totalMinutos % 60

  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

  // Perto do fim, "dias" vira uma unidade grosseira demais — troca para
  // horas/minutos para o aviso continuar informativo.
  if (dias === 0 && horas === 0) return { prefixo: 'em', valor: plural(minutos, 'minuto', 'minutos') }
  if (dias === 0) {
    return {
      prefixo: 'em',
      valor: `${plural(horas, 'hora', 'horas')} e ${plural(minutos, 'minuto', 'minutos')}`,
    }
  }
  return {
    prefixo: 'em',
    valor: `${plural(dias, 'dia', 'dias')} e ${plural(horas, 'hora', 'horas')}`,
  }
}

/** Frase pronta, para quando o texto todo tem a mesma formatação. */
export function formatarTempoAteReset(resetAtIso: string | null | undefined): string {
  const { prefixo, valor } = tempoAteReset(resetAtIso)
  return prefixo ? `${prefixo} ${valor}` : valor
}
