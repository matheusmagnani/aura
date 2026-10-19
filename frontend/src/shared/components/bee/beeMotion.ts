import type { BeeControls, BeeJoint } from './BeeRig'

const loop = (duration: number, delay = 0) => ({ duration, delay, repeat: Infinity, ease: 'easeInOut' as const })

/** Balanço de uma articulação: ida e volta em torno do repouso, sem fim */
function sway(controls: BeeControls, joint: BeeJoint, angles: number[], duration: number, delay = 0) {
  controls[joint].start({ rotate: angles, transition: loop(duration, delay) })
}

/**
 * Voo: asas a ~11 batidas/s (a de trás um pouco atrasada, como numa abelha de
 * verdade), patas penduradas balançando fora de fase, abdômen "respirando",
 * cabeça e antenas com movimentos curtos. Durações diferentes entre as partes
 * para o conjunto nunca repetir igual.
 */
export function startFlying(controls: BeeControls) {
  flapWings(controls)
  swayBody(controls)
}

export function flapWings(controls: BeeControls) {
  controls.wingFront.start({ rotate: [-8, 28, -8], transition: loop(0.09) })
  controls.wingBack.start({ rotate: [-4, 32, -4], transition: loop(0.09, 0.02) })
}

function swayBody(controls: BeeControls) {
  sway(controls, 'legFar', [0, 6, 0], 1.3)
  sway(controls, 'legFrontUpper', [0, 5, -2, 0], 1.6, 0.2)
  sway(controls, 'legFrontLower', [0, -9, 0], 1.1, 0.5)
  sway(controls, 'legMiddleUpper', [0, -4, 3, 0], 1.8, 0.1)
  sway(controls, 'legMiddleLower', [0, 8, 0], 1.25, 0.4)
  sway(controls, 'legBackUpper', [0, 4, -3, 0], 2.1)
  sway(controls, 'legBackLower', [0, -7, 0], 1.4, 0.3)

  controls.abdomen.start({ rotate: [0, 3, 0], scale: [1, 1.03, 1], transition: loop(0.9) })
  sway(controls, 'head', [0, -2.5, 0, 1.5, 0], 2.4)
  sway(controls, 'antennae', [0, 5, -3, 0], 1.7, 0.6)
}

export function stopAll(controls: BeeControls) {
  Object.values(controls).forEach((c) => c.stop())
}

/**
 * Pose pousada na quina arredondada do card (calculada com o contorno real das
 * patas): as dianteiras, mais curtas no desenho, apoiam no topo plano; as de trás,
 * mais longas, na curva da quina. Patas retas, como desenhadas — só giram um pouco.
 */
export const PERCH = {
  bodyTilt: 0,
  legs: {
    // Dianteiras jogadas para a frente (a canela desce até o topo do card); só a ponta das patas toca o apoio
    legFrontUpper: 72,
    legFrontLower: 18,
    legFar: 24,
    // Do meio também um pouco à frente: o pé passa por cima da borda do card (permitido)
    legMiddleUpper: 24,
    legMiddleLower: -14,
    legBackUpper: 2,
  } as Partial<Record<BeeJoint, number>>,
  /** Abdômen (graus) — a respiração acontece em volta deste ângulo */
  abdomen: 0,
  /**
   * Canto superior esquerdo da caixa da abelha em relação à quina do card, em
   * frações da largura da abelha. Vale para abelha de 56px numa quina de raio 24px
   * (rounded-3xl): mudando um dos dois, recalcular a pose.
   */
  corner: { x: -33 / 56, y: -34.73 / 56 },
  /** Asas fechadas sobre as costas */
  wingsFolded: { wingFront: 16, wingBack: 22 } as Partial<Record<BeeJoint, number>>,
}

const ease = { ease: 'easeInOut' as const }

const LEGS: BeeJoint[] = ['legFar', 'legFrontUpper', 'legFrontLower', 'legMiddleUpper', 'legMiddleLower', 'legBackUpper', 'legBackLower']

/** Encaixa as patas na pose de pouso (chamado um pouco antes de tocar a borda) */
export function prepareLanding(controls: BeeControls) {
  // Todas as patas: as que não giram na pose também param o balanço do voo
  // scaleY 1: patas sempre no tamanho do desenho, mesmo vindo de um estado antigo (ex.: hot reload)
  LEGS.forEach((joint) => controls[joint].start({ rotate: PERCH.legs[joint] ?? 0, scaleY: 1, transition: { duration: 0.45, ...ease } }))
}

/** Pousou: asas fecham, abdômen respira devagar, antenas balançam de leve */
export function settle(controls: BeeControls) {
  foldWings(controls)
  controls.abdomen.start({ rotate: [PERCH.abdomen, PERCH.abdomen + 1.5, PERCH.abdomen], scale: [1, 1.025, 1], transition: loop(1.6) })
  controls.head.start({ rotate: 0, transition: { duration: 0.4 } })
  sway(controls, 'antennae', [0, 3, -2, 0], 2.6)
}

function foldWings(controls: BeeControls) {
  controls.wingFront.start({ rotate: PERCH.wingsFolded.wingFront, transition: { duration: 0.18 } })
  controls.wingBack.start({ rotate: PERCH.wingsFolded.wingBack, transition: { duration: 0.18 } })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const rest = (joint: BeeJoint) => PERCH.legs[joint] ?? 0

/**
 * Decolagem: asas batem na hora; patas e abdômen voltam ao repouso rápido e só
 * então começa o balanço de voo (sem "salto" da pose pousada para o voo)
 */
export async function liftOff(controls: BeeControls) {
  flapWings(controls)
  const back = { rotate: 0, scaleY: 1, transition: { duration: 0.2 } }
  await Promise.all([...LEGS, 'abdomen', 'head', 'antennae'].map((j) => controls[j as BeeJoint].start(back)))
  swayBody(controls)
}

/** Gestos de abelha pousada; cada um termina de volta na pose de pouso */
const GESTURES: Record<string, (c: BeeControls, active: () => boolean) => Promise<void>> = {
  /** Zumbida curta: bate as asas e fecha de novo */
  async buzz(c, active) {
    flapWings(c)
    await sleep(350 + Math.random() * 600)
    if (active()) foldWings(c)
  },
  /** Ergue as patas dianteiras e esfrega uma na outra perto da cabeça, como quem limpa as antenas */
  async groom(c) {
    const front = rest('legFrontUpper')
    const lower = rest('legFrontLower')
    const far = rest('legFar')
    // Ângulo negativo levanta o pé (positivo empurraria a pata para dentro do apoio)
    const rub = { duration: 1.4, ...ease }
    c.head.start({ rotate: [0, -4, -4, 0], transition: rub })
    c.legFar.start({ rotate: [far, far - 25, far - 12, far - 25, far], transition: rub })
    c.legFrontLower.start({ rotate: [lower, lower - 30, lower - 12, lower - 30, lower], transition: rub })
    await c.legFrontUpper.start({ rotate: [front, front - 25, front - 15, front - 25, front], transition: rub })
  },
  /** Ajeita as patas de apoio: passinho curto no lugar */
  async shuffle(c, active) {
    const joints: BeeJoint[] = ['legMiddleLower', 'legBackLower']
    for (const joint of joints) {
      if (!active()) return
      const base = rest(joint)
      await c[joint].start({ rotate: [base, base - 5, base], transition: { duration: 0.35, ...ease } })
    }
  },
  /** Olha em volta: vira a cabeça e mexe as antenas */
  async look(c) {
    c.antennae.start({ rotate: [0, 9, -5, 6, 0], transition: { duration: 1, ...ease } })
    await c.head.start({ rotate: [0, -5, -5, 3, 3, 0], transition: { duration: 1.6, ...ease } })
  },
}

/** Fica pousada sorteando gestos, com pausas entre eles, enquanto `active()` */
export async function perchedLife(controls: BeeControls, active: () => boolean) {
  const names = Object.keys(GESTURES)
  while (active()) {
    await sleep(500 + Math.random() * 1400)
    if (!active()) return
    await GESTURES[names[Math.floor(Math.random() * names.length)]](controls, active)
  }
}
