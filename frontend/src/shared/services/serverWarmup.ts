// Warmup do servidor (Fly + Neon) baseado em atividade do usuário.
//
// Estratégia: o backend na Fly usa auto_stop e o Neon suspende o compute após
// ~5 min ocioso. Cold start (Fly boot + Neon resume) demora e, se a primeira
// requisição for um insert, chega a dar erro. Pra evitar isso, acordamos o
// servidor ANTECIPADAMENTE quando o usuário demonstra atividade (mexer o mouse,
// digitar, abrir um modal), de forma silenciosa (sem UI de "conectando").
//
// Regra "só acorda se estiver dormindo": toda resposta bem-sucedida do backend
// marca `lastSeenServerAt`. Se ouvimos o servidor há menos de AWAKE_WINDOW_MS,
// ele está garantidamente acordado (nada suspende antes de 5 min) → não fazemos
// nada. Assim, durante uso ativo os gatilhos viram no-op e não há warmup
// redundante; só disparamos após um gap real de silêncio.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

// Abaixo dos 5 min de suspensão do Neon, com margem. Se ouvimos o servidor há
// menos que isso, ele está acordado com certeza.
const AWAKE_WINDOW_MS = 4 * 60 * 1000

let lastSeenServerAt = 0
let inFlight = false

/** Registra que o backend respondeu agora (chamado pelo interceptor do axios). */
export function markServerSeen() {
  lastSeenServerAt = Date.now()
}

/**
 * Dispara o warmup somente se o servidor provavelmente estiver dormindo e não
 * houver outro warmup em andamento. Idempotente e barato — pode ser chamado à
 * vontade pelos gatilhos de atividade.
 */
export function maybeWarmup() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  if (inFlight) return
  if (Date.now() - lastSeenServerAt < AWAKE_WINDOW_MS) return

  inFlight = true
  fetch(`${API_URL}/warmup`)
    .then(() => markServerSeen())
    .catch(() => {
      // Falhou (provavelmente ainda subindo) — não marca como visto pra
      // permitir nova tentativa no próximo gatilho.
    })
    .finally(() => {
      inFlight = false
    })
}
