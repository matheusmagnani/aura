import { useEffect } from 'react'
import { maybeWarmup } from '../services/serverWarmup'

// Throttle apenas na avaliação dos eventos de atividade (mousemove dispara
// centenas de vezes/s). O gate real de "acordar ou não" está em maybeWarmup.
const EVAL_THROTTLE_MS = 30 * 1000

/**
 * Monta os gatilhos de warmup por atividade do usuário. Deve ficar no shell
 * autenticado (Layout), que é onde o sistema fica aberto o dia todo.
 */
export function useServerWarmup() {
  useEffect(() => {
    // Acorda já ao montar (usuário acabou de abrir/voltar ao sistema).
    maybeWarmup()

    let lastEval = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - lastEval < EVAL_THROTTLE_MS) return
      lastEval = now
      maybeWarmup()
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') maybeWarmup()
    }

    window.addEventListener('mousemove', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity)
    window.addEventListener('click', onActivity)
    window.addEventListener('scroll', onActivity, { passive: true })
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('click', onActivity)
      window.removeEventListener('scroll', onActivity)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
