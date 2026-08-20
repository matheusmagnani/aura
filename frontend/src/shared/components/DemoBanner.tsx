import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Flask } from '@phosphor-icons/react'
import { authService } from '../services/authService'
import { formatarTempoAteReset } from '../utils/demoReset'

/**
 * Faixa de aviso exibida no topo quando a conta é de demonstração.
 *
 * O instante do próximo reset vem do backend (`demoResetAt`, em UTC) — assim a
 * contagem fica certa em qualquer fuso, já que é comparado com o relógio local.
 * Ver `backend/src/lib/demoReset.ts`.
 */
export function DemoBanner() {
  const queryClient = useQueryClient()
  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authService.me(),
    staleTime: 1000 * 60 * 5,
  })

  // Re-renderiza a cada minuto para a contagem não congelar em tela aberta.
  const [, setTick] = useState(0)
  const isDemo = !!me?.company?.isDemo
  const resetAt = me?.demoResetAt ? new Date(me.demoResetAt).getTime() : null

  useEffect(() => {
    if (!isDemo) return
    const id = setInterval(() => {
      setTick((n) => n + 1)

      // Passou do horário do reset: revalida o /me. O backend recusa (401) o
      // token emitido antes do reset e o interceptor do axios desloga. Sem esse
      // empurrão a pessoa ficaria até 5 min (o staleTime) num sistema já vazio.
      if (resetAt && Date.now() >= resetAt) {
        queryClient.invalidateQueries({ queryKey: ['auth-me'] })
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [isDemo, resetAt, queryClient])

  if (!isDemo) return null

  const restante = formatarTempoAteReset(me?.demoResetAt)

  return (
    <div
      className="demo-banner flex items-center justify-center gap-2 text-center flex-shrink-0"
      style={{ background: 'var(--color-app-secondary)' }}
      role="status"
    >
      <Flask size={18} weight="fill" style={{ color: 'var(--color-app-primary)', flexShrink: 0 }} />
      <p
        className="text-xs md:text-sm font-medium"
        style={{ color: 'var(--color-app-primary)', margin: 0, lineHeight: 1.35 }}
      >
        <span className="font-bold">Acesso de teste.</span>{' '}
        <span className="hidden md:inline">
          Fique à vontade para explorar — todos os dados serão reiniciados {restante}.
        </span>
        <span className="md:hidden">Dados reiniciados {restante}.</span>
      </p>
    </div>
  )
}
