import { useId, useMemo, type ReactNode } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { BEE_OUTLINE, BEE_PIECES, BEE_REGIONS, BEE_VIEWBOX } from './bee-parts.generated'

type PieceGroup = keyof typeof BEE_PIECES

/** Partes que se mexem, cada uma girando em torno do próprio ponto de articulação */
export type BeeJoint =
  | 'wingFront'
  | 'wingBack'
  | 'head'
  | 'antennae'
  | 'abdomen'
  | 'legFar'
  | 'legFrontUpper'
  | 'legFrontLower'
  | 'legMiddleUpper'
  | 'legMiddleLower'
  | 'legBackUpper'
  | 'legBackLower'

export type BeeControls = Record<BeeJoint, ReturnType<typeof useAnimationControls>>

/** Um controle de animação por articulação (número fixo de hooks, um por linha) */
export function useBeeControls(): BeeControls {
  const wingFront = useAnimationControls()
  const wingBack = useAnimationControls()
  const head = useAnimationControls()
  const antennae = useAnimationControls()
  const abdomen = useAnimationControls()
  const legFar = useAnimationControls()
  const legFrontUpper = useAnimationControls()
  const legFrontLower = useAnimationControls()
  const legMiddleUpper = useAnimationControls()
  const legMiddleLower = useAnimationControls()
  const legBackUpper = useAnimationControls()
  const legBackLower = useAnimationControls()
  // Objeto estável: quem anima pode depender dele num useEffect
  return useMemo(
    () => ({ wingFront, wingBack, head, antennae, abdomen, legFar, legFrontUpper, legFrontLower, legMiddleUpper, legMiddleLower, legBackUpper, legBackLower }),
    [wingFront, wingBack, head, antennae, abdomen, legFar, legFrontUpper, legFrontLower, legMiddleUpper, legMiddleLower, legBackUpper, legBackLower],
  )
}

/** Articulações no viewBox do original (raiz da asa, pescoço, quadril, joelho…) */
const PIVOTS: Record<BeeJoint, [number, number]> = {
  wingFront: [3300, 2650],
  wingBack: [3350, 2700],
  head: [2100, 2900],
  antennae: [1250, 2300],
  abdomen: [3450, 3450],
  legFar: [1750, 3500],
  legFrontUpper: [2150, 3500],
  legFrontLower: [2080, 3950],
  legMiddleUpper: [3150, 3980],
  legMiddleLower: [2800, 4330],
  legBackUpper: [3880, 3780],
  legBackLower: [3950, 4800],
}

/**
 * Contorno que cada peça "leva junto": o path 0 do original é uma silhueta só com
 * todos os contornos; a máscara pega a faixa em volta das peças da parte.
 * Traço de 80 = 40 para cada lado, mais que a espessura do contorno do desenho (~30).
 */
const OUTLINE_REACH = 80

const WING_CELLS: PieceGroup[] = ['wingFront', 'wingBack']
const NON_WING = (Object.keys(BEE_PIECES) as PieceGroup[]).filter((g) => !WING_CELLS.includes(g))

function Dilated({ groups, color }: { groups: PieceGroup[]; color: 'white' | 'black' }) {
  return (
    <>
      {groups.flatMap((g) =>
        BEE_PIECES[g].map((piece, i) => (
          <path key={`${g}${i}`} d={piece.d} fill={color} stroke={color} strokeWidth={OUTLINE_REACH} strokeLinejoin="round" />
        )),
      )}
    </>
  )
}

interface BeeRigProps {
  /** Um controle por articulação (useBeeControls); sem controle a parte fica parada */
  controls?: Partial<BeeControls>
  className?: string
  /** Pinta cada articulação de uma cor (laboratório /__bee) */
  debug?: boolean
}

const DEBUG_COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324']

/** Abelha da Beets montada como marionete: peças do SVG original + articulações */
export function BeeRig({ controls = {}, className, debug = false }: BeeRigProps) {
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${uid}-${name}`
  const [, , width, height] = BEE_VIEWBOX.split(' ').map(Number)

  /** Peças preenchidas + o contorno delas recortado do path 0 */
  const pieces = (group: PieceGroup, mask: string) => (
    <>
      <path d={BEE_OUTLINE} mask={`url(#${id(mask)})`} />
      {BEE_PIECES[group].map((piece, i) => (
        <path key={i} d={piece.d} fillRule={piece.evenOdd ? 'evenodd' : undefined} />
      ))}
    </>
  )

  const joint = (name: BeeJoint, children: ReactNode) => {
    const [x, y] = PIVOTS[name]
    return (
      <motion.g
        data-joint={name}
        animate={controls[name]}
        fill={debug ? DEBUG_COLORS[Object.keys(PIVOTS).indexOf(name)] : undefined}
        // view-box: a origem fica no ponto exato do desenho, não no centro da peça
        style={{ transformBox: 'view-box', originX: `${x}px`, originY: `${y}px` }}
      >
        {children}
      </motion.g>
    )
  }

  const ownMask = (group: PieceGroup) => (
    <mask key={group} id={id(group)} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
      <Dilated groups={[group]} color="white" />
    </mask>
  )

  return (
    <svg viewBox={BEE_VIEWBOX} className={className} overflow="visible" aria-hidden>
      <defs>
        {/* Mesmo degradê do símbolo original: dourado da marca em cima, accent embaixo */}
        <linearGradient id={id('gold')} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={height}>
          {/* Cores da abelha da Beets: `--bee-light/--bee-dark` quando o sistema tem outra paleta (ex.: Aura); senão, as do tema */}
          <stop offset="0" style={{ stopColor: 'var(--bee-light, var(--color-app-secondary))' }} />
          <stop offset="1" style={{ stopColor: 'var(--bee-dark, var(--color-app-accent))' }} />
        </linearGradient>

        <mask id={id('head')} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <polygon points={BEE_REGIONS.head} fill="white" />
          <Dilated groups={NON_WING.filter((g) => g !== 'head')} color="black" />
          <Dilated groups={['head']} color="white" />
        </mask>
        {(['abdomen', 'legFar', 'legFrontUpper', 'legFrontLower', 'legMiddleUpper', 'legMiddleLower', 'legBackUpper', 'legBackLower'] as const).map(ownMask)}

        <mask id={id('wingFrontArea')} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <polygon points={BEE_REGIONS.wingFront} fill="white" />
          <Dilated groups={NON_WING} color="black" />
          <Dilated groups={['wingFront']} color="white" />
        </mask>
        <mask id={id('wingBackArea')} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <polygon points={BEE_REGIONS.wings} fill="white" />
          <polygon points={BEE_REGIONS.wingFront} fill="black" />
          <Dilated groups={NON_WING} color="black" />
          <Dilated groups={['wingBack']} color="white" />
        </mask>
        <mask id={id('antennae')} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <polygon points={BEE_REGIONS.antennae} fill="white" />
          <Dilated groups={['head']} color="black" />
        </mask>
        {/* Tórax = o que sobra: fica parado, as outras partes se mexem em volta dele */}
        <mask id={id('thorax')} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
          <rect width={width} height={height} fill="white" />
          <polygon points={BEE_REGIONS.wings} fill="black" />
          <polygon points={BEE_REGIONS.antennae} fill="black" />
          <polygon points={BEE_REGIONS.head} fill="black" />
          <Dilated groups={NON_WING.filter((g) => g !== 'thorax')} color="black" />
          <Dilated groups={['thorax']} color="white" />
        </mask>
      </defs>

      <g fill={`url(#${id('gold')})`}>
        {joint('wingBack', pieces('wingBack', 'wingBackArea'))}
        {joint('legFar', pieces('legFar', 'legFar'))}
        {joint('legMiddleUpper', <>{pieces('legMiddleUpper', 'legMiddleUpper')}{joint('legMiddleLower', pieces('legMiddleLower', 'legMiddleLower'))}</>)}
        {joint('legBackUpper', <>{pieces('legBackUpper', 'legBackUpper')}{joint('legBackLower', pieces('legBackLower', 'legBackLower'))}</>)}
        {joint('abdomen', pieces('abdomen', 'abdomen'))}
        {pieces('thorax', 'thorax')}
        {joint('head', <>{pieces('head', 'head')}{joint('antennae', <path d={BEE_OUTLINE} mask={`url(#${id('antennae')})`} />)}</>)}
        {joint('legFrontUpper', <>{pieces('legFrontUpper', 'legFrontUpper')}{joint('legFrontLower', pieces('legFrontLower', 'legFrontLower'))}</>)}
        {joint('wingFront', pieces('wingFront', 'wingFrontArea'))}
      </g>
    </svg>
  )
}
