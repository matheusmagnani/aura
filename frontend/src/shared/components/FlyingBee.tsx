import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { BeeRig, useBeeControls } from './bee/BeeRig'
import { liftOff, PERCH, perchedLife, prepareLanding, settle, startFlying, stopAll } from './bee/beeMotion'

interface FlyingBeeProps {
  /** Largura da abelha em px */
  size?: number
  /** Elemento em cuja quina superior direita ela pousa (ex.: o card do login, o ícone do Aura) */
  perchOn?: RefObject<HTMLElement | null>
  /** Área que ela explora antes de pousar (campos, botões). Padrão: o próprio `perchOn` */
  explore?: RefObject<HTMLElement | null>
  /** Áreas por onde ela não passa por cima — voa em volta (ex.: a logo) */
  avoid?: RefObject<HTMLElement | null>[]
}

type Point = { x: number; y: number }

const SPEED = 140 // px/s em cruzeiro
const MARGIN = 40 // não encosta na borda da tela
const LEAN = 18 // graus de "nariz para baixo" na velocidade máxima
/** Abaixo disso o deslocamento lateral não conta como mudança de direção */
const TURN_THRESHOLD = 40
const STEPS = 24
/** Distância mínima das bordas de cima e de baixo: ela nunca sai da tela por ali */
const EDGE = 8
/** Folga em volta das áreas evitadas (inclui a flutuação de ±4px e a caixa maior quando inclinada) */
const AVOID_PAD = 24

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const between = (min: number, max: number) => min + Math.random() * (max - min)
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

type Box = { left: number; top: number; right: number; bottom: number }

/** A abelha (caixa de `size`) no ponto encosta em alguma área evitada? */
function touches(x: number, y: number, size: number, areas: Box[]) {
  return areas.some((a) => x + size > a.left - AVOID_PAD && x < a.right + AVOID_PAD && y + size > a.top - AVOID_PAD && y < a.bottom + AVOID_PAD)
}

function randomPoint(size: number, areas: Box[] = []): Point {
  for (let i = 0; ; i++) {
    const point = {
      x: MARGIN + Math.random() * Math.max(window.innerWidth - size - MARGIN * 2, 1),
      y: MARGIN + Math.random() * Math.max(window.innerHeight - size - MARGIN * 2, 1),
    }
    // Em tela pequena demais para fugir das áreas, aceita qualquer ponto
    if (!touches(point.x, point.y, size, areas) || i > 30) return point
  }
}

/**
 * Curva entre dois pontos (Bézier quadrática com controle deslocado para o lado):
 * abelha não voa em linha reta. Amostrada em keyframes com o easing já aplicado
 * no tempo, para acelerar na saída e frear na chegada sem "quinas" no meio.
 */
function flightPath(from: Point, to: Point, bendMax = 0.9) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  // Nunca de costas: o x da curva só avança se o controle ficar entre as pontas no eixo x
  // (|dy·bend| ≤ |dx|/2). Trecho quase vertical faz curva pequena em vez de recuar e voltar
  const maxBend = dy === 0 ? bendMax : Math.min(bendMax, Math.abs(dx / (2 * dy)))
  const bend = (Math.random() - 0.5) * maxBend
  const control = { x: from.x + dx / 2 - dy * bend, y: from.y + dy / 2 + dx * bend }
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i <= STEPS; i++) {
    const t = easeInOut(i / STEPS)
    const u = 1 - t
    xs.push(u * u * from.x + 2 * u * t * control.x + t * t * to.x)
    ys.push(u * u * from.y + 2 * u * t * control.y + t * t * to.y)
  }
  return { xs, ys }
}

/**
 * Inclinação ao longo do trajeto: proporcional à velocidade horizontal de cada
 * trecho. Acelerando ela abaixa o nariz; freando vai ficando em pé (0 na chegada).
 */
function leanAlong(xs: number[], duration: number) {
  const dt = duration / STEPS
  return xs.map((_, i) => {
    const prev = Math.max(i - 1, 0)
    const next = Math.min(i + 1, xs.length - 1)
    const speed = Math.abs(xs[next] - xs[prev]) / ((next - prev) * dt)
    // easeInOut chega a 2x a média no meio do trecho: 2·SPEED = inclinação máxima
    return -LEAN * Math.min(speed / (2 * SPEED), 1)
  })
}

/**
 * Abelha da marca voando pela tela. Com `perchOn`, pousa na quina superior direita
 * do elemento, virada para a esquerda, e fica lá se mexendo (limpa as antenas, zumbe,
 * ajeita as patas) até o mouse passar por cima: aí decola, dá uma volta e pousa de
 * novo no mesmo lugar. Antes de pousar, chega e explora o formulário (paira sobre campos
 * e botões); nunca sai da tela por cima nem por baixo. Só muda de lado fora da tela — virar no ar parecia um "quebrar".
 * Decorativa: não bloqueia cliques, some com "reduzir movimento".
 */
export function FlyingBee({ size = 56, perchOn, explore: exploreIn, avoid }: FlyingBeeProps) {
  const reduceMotion = useReducedMotion()
  const body = useBeeControls()
  const position = useAnimationControls()
  const tilt = useAnimationControls()
  const hover = useAnimationControls()
  const beeRef = useRef<HTMLDivElement>(null)
  // Virada (espelho) direto no estilo: `controls.set` neste elemento não era aplicado na build de
  // produção — ela ficava sempre olhando para a esquerda e voava de costas indo para a direita
  const facingRef = useRef<HTMLDivElement>(null)
  // Em ref: a lista nova a cada render (ex.: digitar no formulário) não reinicia o voo
  const avoidRef = useRef(avoid)
  avoidRef.current = avoid

  useEffect(() => {
    if (reduceMotion) return
    let alive = true
    /** Áreas evitadas agora (some quando escondida, ex.: a logo no celular) */
    const areas = (): Box[] =>
      (avoidRef.current ?? []).flatMap((ref) => {
        const rect = ref.current?.getBoundingClientRect()
        return rect && rect.width > 0 && rect.height > 0 ? [rect] : []
      })
    const clampY = (y: number) => Math.min(Math.max(y, EDGE), window.innerHeight - size - EDGE)
    /**
     * Altura para entrar/sair pela borda esquerda sem cruzar uma área evitada (a logo):
     * se `y` cai na faixa dela, vai para logo acima ou abaixo, o que estiver mais perto
     */
    const freeY = (y: number, side: 'left' | 'right', fromX: number) => {
      const blocking = areas().find((a) => (side === 'left' ? a.left < fromX : a.right > fromX) && y + size > a.top - AVOID_PAD && y < a.bottom + AVOID_PAD)
      if (!blocking) return y
      const options = [blocking.top - AVOID_PAD - size - 4, blocking.bottom + AVOID_PAD + 4].filter((v) => v >= EDGE && v <= window.innerHeight - size - EDGE)
      return options.length ? options.reduce((a, b) => (Math.abs(a - y) <= Math.abs(b - y) ? a : b)) : y
    }
    /** Entra por uma das laterais (fora da tela), na altura do formulário, já olhando para dentro */
    const enterFromRight = Math.random() < 0.5
    /** Formulário que ela explora (no Beets é o próprio card do pouso; no Aura, o form abaixo do ícone) */
    const area = () => (exploreIn ?? perchOn)?.current ?? null
    const formRect = area()?.getBoundingClientRect()
    const entryY = formRect ? clampY(formRect.top + Math.random() * formRect.height - size / 2) : 0
    let current: Point = formRect
      ? enterFromRight
        ? { x: window.innerWidth + 20, y: entryY }
        : { x: -size - 20, y: freeY(entryY, 'left', formRect.left) }
      : randomPoint(size, areas())
    /** O desenho olha para a esquerda; virada para a direita = espelhada */
    let facingRight = formRect ? !enterFromRight : Math.random() < 0.5
    let perched = false
    /** Resolvida quando o mouse passa por cima da abelha pousada */
    let disturb: () => void = () => {}

    const perchPoint = (): Point | null => {
      const rect = perchOn?.current?.getBoundingClientRect()
      // Formulário estreito demais (tela minúscula) ou pouso escondido: não pousa
      if (!rect || rect.width === 0 || (area()?.getBoundingClientRect().width ?? 0) < size * 2) return null
      return { x: rect.right + size * PERCH.corner.x, y: rect.top + size * PERCH.corner.y }
    }

    const face = (right: boolean) => {
      facingRight = right
      if (facingRef.current) facingRef.current.style.transform = right ? 'scaleX(-1)' : 'none'
    }
    const startHover = () => hover.start({ y: [0, -4, 0, 3, 0], transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } })

    /** Curva que não passa por cima das áreas evitadas (tenta outras curvaturas); null se não houver */
    function clearPath(from: Point, to: Point, bendMax: number) {
      const blocked = areas()
      for (let attempt = 0; attempt < 16; attempt++) {
        const path = flightPath(from, to, bendMax + attempt * 0.12)
        const outOfScreen = path.ys.some((y) => y < EDGE || y > window.innerHeight - size - EDGE)
        if (!outOfScreen && !path.xs.some((x, i) => touches(x, path.ys[i], size, blocked))) return path
      }
      return null
    }

    /**
     * Contorno por cima ou por baixo da área que bloqueia o caminho: passa pelas duas
     * quinas daquele lado (as que ficam entre a abelha e o destino), sempre avançando
     * na horizontal (assim ela não precisa virar).
     */
    function detour(to: Point): Point[] {
      const blocking = areas()[0]
      if (!blocking) return []
      const above = blocking.top - AVOID_PAD - size - 8
      const below = blocking.bottom + AVOID_PAD + 8
      const options = [above, below].filter((y) => y >= EDGE && y <= window.innerHeight - size - EDGE)
      if (!options.length) return []
      const middleY = (current.y + to.y) / 2
      const y = options.reduce((a, b) => (Math.abs(a - middleY) <= Math.abs(b - middleY) ? a : b))
      const leftCorner = blocking.left - AVOID_PAD - size - 4
      const rightCorner = blocking.right + AVOID_PAD + 4
      const corners = to.x < current.x ? [rightCorner, leftCorner] : [leftCorner, rightCorner]
      const [lo, hi] = [Math.min(current.x, to.x), Math.max(current.x, to.x)]
      return corners.filter((x) => x > lo && x < hi).map((x) => ({ x, y }))
    }

    /** Voa até o ponto sem virar: quem chama garante que o destino fica para o lado em que ela olha */
    async function flyTo(next: Point, landing = false, depth = 0): Promise<void> {
      // Nunca de costas: destino um pouco atrás (dentro de TURN_THRESHOLD) vira subida/descida reta
      if ((next.x - current.x) * (facingRight ? 1 : -1) < 0) next = { ...next, x: current.x }
      const bendMax = landing ? 0.4 : 0.9
      let path = clearPath(current, next, bendMax)
      if (!path && depth === 0) {
        const via = detour(next)
        if (via.length) {
          for (const point of via) {
            await flyTo(point, false, 1)
            if (!alive) return
          }
          return flyTo(next, landing, 1)
        }
      }
      // Sem curva livre: reta (pontas dentro da tela = trajeto inteiro dentro da tela)
      path ??= flightPath(current, next, 0)
      const { xs, ys } = path
      const distance = Math.hypot(next.x - current.x, next.y - current.y) || 1
      const duration = (distance / SPEED) * (landing ? 1.35 : 1)
      tilt.start({ rotate: leanAlong(xs, duration), transition: { duration, ease: 'linear' } })
      if (landing) {
        // Perto de tocar: patas na pose de pouso, corpo assenta e para de flutuar
        setTimeout(() => {
          if (!alive) return
          prepareLanding(body)
          tilt.start({ rotate: PERCH.bodyTilt, transition: { duration: 0.5 } })
          hover.start({ y: 0, transition: { duration: 0.4 } })
        }, duration * 650)
      }
      await position.start({ x: xs, y: ys, transition: { duration, ease: 'linear' } })
      current = next
    }

    /** Para ir ao lado oposto ao que olha, sai da tela pela frente e volta pela mesma borda, já virada */
    async function turnAround() {
      const exitX = facingRight ? window.innerWidth + size + 20 : -size - 20
      const wanted = Math.min(Math.max(current.y + between(-80, 80), MARGIN), window.innerHeight - size - MARGIN)
      const y = freeY(wanted, facingRight ? 'right' : 'left', current.x)
      await flyTo({ x: exitX, y })
      if (!alive) return
      face(!facingRight)
      await sleep(between(300, 900))
    }

    /** Vai até o ponto; se ele estiver atrás da abelha, primeiro dá a volta por fora da tela */
    async function goTo(next: Point) {
      const dx = next.x - current.x
      if (Math.abs(dx) > TURN_THRESHOLD && dx > 0 !== facingRight) await turnAround()
      if (alive) await flyTo(next)
    }

    async function wander(legs: number) {
      for (let i = 0; i < legs && alive; i++) {
        const next = randomPoint(size, areas())
        // Trecho curto demais parece tremida; em tela minúscula aceita qualquer um
        if (Math.hypot(next.x - current.x, next.y - current.y) < Math.min(120, window.innerWidth / 4)) {
          i--
          continue
        }
        await goTo(next)
        if (!alive) return
        // Às vezes para e paira um pouco antes de seguir
        if (Math.random() < 0.4) await sleep(between(400, 1400))
      }
    }

    /**
     * Pontos de "investigação" no formulário: pairando logo acima de campos, rótulos e
     * botões, sempre à frente da abelha (assim ela atravessa o card sem precisar virar)
     */
    function explorePoints(count: number): Point[] {
      const el = area()
      const rect = el?.getBoundingClientRect()
      if (!el || !rect) return []
      const spots = [...el.querySelectorAll('input, button, label, h2')]
        .map((node) => node.getBoundingClientRect())
        .filter((r) => r.width > 0)
      const dir = facingRight ? 1 : -1
      // Só a faixa do formulário à frente da abelha (vindo de longe, começa na borda do card)
      const from = facingRight ? Math.max(current.x + 50, rect.left - size) : Math.min(current.x - 50, rect.right)
      const to = facingRight ? rect.right - size * 0.3 : rect.left - size * 0.7
      if ((to - from) * dir <= 0) return []
      const blocked = areas()
      return Array.from({ length: count }, (_, i) => {
        const spot = spots[Math.floor(Math.random() * spots.length)]
        const y = spot ? spot.top - size * between(0.55, 0.9) : rect.top + Math.random() * rect.height
        return { x: from + ((to - from) * i) / Math.max(count - 1, 1), y: clampY(y) }
      }).filter((point) => !touches(point.x, point.y, size, blocked))
    }

    /** Atravessa o formulário parando para "investigar" cada ponto */
    async function explore(count: number) {
      for (const point of explorePoints(count)) {
        if (!alive) return
        await flyTo(point)
        await sleep(between(500, 1600))
      }
    }

    /** Pousa sempre chegando da direita, já olhando para a esquerda */
    async function land() {
      let target = perchPoint()
      if (!target) return false
      // Precisa estar à direita do pouso olhando para a esquerda. Se não, explora o formulário
      // no sentido em que está indo e dá a volta por fora pela mesma borda (até duas vezes)
      for (let turns = 0; turns < 3 && alive && (facingRight || current.x < target.x + TURN_THRESHOLD); turns++) {
        await explore(2)
        if (!alive) return false
        await turnAround()
        target = perchPoint() ?? target
      }
      if (!alive) return false
      target = perchPoint()
      if (!target) return false
      // Ainda atrás dela (ex.: tela redimensionada no meio): não pousa de costas, dá outra volta
      if (facingRight || current.x < target.x) return false
      await flyTo(target, true)
      return alive
    }

    async function takeOff() {
      // Sobe para a frente (esquerda), sem virar
      await Promise.all([liftOff(body), flyTo({ x: current.x - between(10, 60), y: clampY(current.y - between(80, 130)) })])
      startHover()
    }

    const onResize = () => {
      const point = perched ? perchPoint() : null
      if (point) {
        current = point
        position.start({ ...point, transition: { duration: 0 } })
      }
    }
    // O mouse "espanta" a abelha: escuta na janela, porque ela não recebe eventos (não bloqueia cliques)
    const onPointer = (event: PointerEvent) => {
      const rect = beeRef.current?.getBoundingClientRect()
      if (!perched || !rect) return
      const pad = 6
      if (event.clientX >= rect.left - pad && event.clientX <= rect.right + pad && event.clientY >= rect.top - pad && event.clientY <= rect.bottom + pad) {
        disturb()
      }
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointer)
    window.addEventListener('pointerdown', onPointer)

    ;(async () => {
      // Espera os motion.div assinarem os controles: `set` antes disso é ignorado (em produção a
      // virada inicial se perdia e ela entrava de costas; em dev o StrictMode remontava e escondia)
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      if (!alive) return
      // `start` com duração 0, não `set` (ver facingRef)
      position.start({ ...current, opacity: 1, transition: { duration: 0 } })
      face(facingRight)
      startFlying(body)
      startHover()
      // Chega, explora o formulário e vai pousar (sem formulário: voa pela tela)
      if (formRect) await explore(3)
      else await wander(Math.round(between(1, 2)))
      while (alive) {
        if (!(await land())) {
          // Sem onde pousar (card ainda não montado ou tela pequena demais): segue voando
          await wander(1)
          continue
        }
        perched = true
        settle(body)
        const disturbed = new Promise<void>((resolve) => (disturb = resolve))
        await Promise.race([perchedLife(body, () => alive && perched), disturbed])
        perched = false
        if (!alive) return
        stopAll(body)
        // Decola; a volta até o pouso passa explorando o formulário (ver land)
        await takeOff()
      }
    })()

    return () => {
      alive = false
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      position.stop()
      hover.stop()
      stopAll(body)
    }
  }, [reduceMotion, size, perchOn, exploreIn, position, tilt, hover, body])

  if (reduceMotion) return null

  // Portal no body com o maior z-index possível: fica na frente de tudo (modais, toasts),
  // sem depender do empilhamento de quem a usa
  return createPortal(
    <motion.div ref={beeRef} className="pointer-events-none fixed left-0 top-0 z-[2147483647]" style={{ width: size }} initial={{ opacity: 0 }} animate={position} aria-hidden>
      <div ref={facingRef}>
        <motion.div animate={tilt}>
          {/* Flutuação curta e rápida do corpo inteiro enquanto voa */}
          <motion.div animate={hover}>
            <BeeRig controls={body} className="h-auto w-full drop-shadow-[0_0_12px_rgba(var(--bee-light-rgb,var(--color-app-secondary-rgb)),0.3)]" />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  )
}
