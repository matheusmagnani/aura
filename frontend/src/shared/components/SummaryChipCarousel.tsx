import { useRef, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { SummaryChip } from './SummaryChip'

type SizedIcon = ComponentType<{ size?: number | string; style?: React.CSSProperties }>

export interface ChipData {
  icon?: SizedIcon
  accent?: 'gold' | 'blue' | 'success'
  date?: string
  summary: ReactNode
}

interface SummaryChipCarouselProps {
  chips: ChipData[]
}

export function SummaryChipCarousel({ chips }: SummaryChipCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function handleScroll() {
    const el = scrollerRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== active) setActive(idx)
  }

  function scrollToChip(i: number) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' })
  }

  return (
    <>
      {/* Mobile: carousel com scroll-snap */}
      <div className="mb-4 md:hidden">
        <style>{`.aura-chip-scroller::-webkit-scrollbar { display: none; }`}</style>
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="aura-chip-scroller"
          style={{
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            padding: '4px 0 14px',
          }}
        >
          {chips.map((chip, i) => (
            <div
              key={i}
              style={{ flex: '0 0 100%', scrollSnapAlign: 'center', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: '0 2px' }}
            >
              <SummaryChip {...chip} />
            </div>
          ))}
        </div>
        {chips.length > 1 && (
          <div className="flex justify-center" style={{ gap: 6, marginTop: -4 }}>
            {chips.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToChip(i)}
                aria-label={`Resumo ${i + 1}`}
                style={{
                  width: active === i ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: active === i ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.20)',
                  border: 0,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'width 300ms cubic-bezier(0.4,0,0.2,1), background 300ms',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: todos os chips em grid */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-4 md:mb-4">
        {chips.map((chip, i) => (
          <SummaryChip key={i} {...chip} />
        ))}
      </div>
    </>
  )
}
