import { useMemo } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { addDays } from 'date-fns'

const WEEKDAY_PTBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

interface DayStripProps {
  days: Date[]
  activeIndex?: number | number[]
  onSelect?: (i: number) => void
  onPrev?: () => void
  onNext?: () => void
}

export function DayStrip({ days, activeIndex = 0, onSelect, onPrev, onNext }: DayStripProps) {
  const normalized = useMemo(
    () => days.map(d => ({ date: d.getDate(), label: WEEKDAY_PTBR[d.getDay()] })),
    [days]
  )

  const activeSet = useMemo(() => {
    if (Array.isArray(activeIndex)) return new Set(activeIndex)
    return new Set([activeIndex])
  }, [activeIndex])

  return (
    <div
      className="grid items-center gap-1.5 px-2"
      style={{ gridTemplateColumns: `28px repeat(${normalized.length}, 1fr) 28px`, paddingTop: 12, paddingBottom: 12 }}
    >
      <button
        onClick={onPrev}
        className="flex h-7 w-7 items-center justify-center rounded-md text-app-gray hover:bg-white/5"
      >
        <CaretLeft size={14} />
      </button>

      {normalized.map((d, i) => {
        const active = activeSet.has(i)
        return (
          <button
            key={i}
            onClick={() => onSelect?.(i)}
            style={{ paddingTop: 6, paddingBottom: 6 }}
            className={`flex flex-col items-center gap-0.5 rounded-lg transition-colors duration-200 ease-out ${
              active ? 'bg-app-secondary' : 'bg-transparent hover:bg-white/5'
            }`}
          >
            <span className={`text-[10px] uppercase tracking-[0.06em] ${active ? 'text-app-primary/75' : 'text-app-gray'}`}>
              {d.label}
            </span>
            <span className={`text-sm ${active ? 'font-bold text-app-primary' : 'font-medium text-white'}`}>
              {d.date}
            </span>
          </button>
        )
      })}

      <button
        onClick={onNext}
        className="flex h-7 w-7 items-center justify-center rounded-md text-app-gray hover:bg-white/5"
      >
        <CaretRight size={14} />
      </button>
    </div>
  )
}

export function buildWeek(centerDate = new Date()): Date[] {
  const start = new Date(centerDate)
  start.setDate(centerDate.getDate() - centerDate.getDay())
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
