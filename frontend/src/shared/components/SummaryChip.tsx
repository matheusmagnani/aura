import type { ReactNode, ComponentType } from 'react'

type SizedIcon = ComponentType<{ size?: number | string; style?: React.CSSProperties }>

interface SummaryChipProps {
  date?: string
  summary: ReactNode
  icon?: SizedIcon
  accent?: 'gold' | 'blue' | 'success'
}

const ACCENT_MAP = {
  gold: {
    iconColor: 'var(--color-app-secondary)',
    iconBg: 'rgba(230,194,132,0.15)',
    border: 'rgba(230,194,132,0.20)',
    gradient: 'linear-gradient(135deg, rgba(230,194,132,0.08), rgba(106,166,193,0.06))',
  },
  blue: {
    iconColor: 'var(--color-app-accent)',
    iconBg: 'rgba(106,166,193,0.15)',
    border: 'rgba(106,166,193,0.25)',
    gradient: 'linear-gradient(135deg, rgba(106,166,193,0.10), rgba(230,194,132,0.04))',
  },
  success: {
    iconColor: 'rgb(74,222,128)',
    iconBg: 'rgba(74,222,128,0.15)',
    border: 'rgba(74,222,128,0.25)',
    gradient: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(230,194,132,0.04))',
  },
}

export function SummaryChip({ date, summary, icon: Icon, accent = 'gold' }: SummaryChipProps) {
  const a = ACCENT_MAP[accent]
  return (
    <div
      className="flex min-h-[88px] items-center gap-5 rounded-2xl"
      style={{ background: a.gradient, border: `1px solid ${a.border}`, padding: '12px 10px' }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: a.iconBg }}
      >
        {Icon && <Icon size={24} style={{ color: a.iconColor }} />}
      </span>
      <div className="min-w-0 flex-1">
        {date && <div className="text-xs text-app-gray">{date}</div>}
        <div className="mt-1 text-sm text-white">{summary}</div>
      </div>
    </div>
  )
}
