import type { ReactNode } from 'react'
import { Checkbox } from './ui/Checkbox'

interface ListCardProps {
  children: ReactNode
  isSelected: boolean
onSelect: () => void
  columns: string
  onClick?: () => void
}

export function ListCard({ children, isSelected, onSelect, columns, onClick }: ListCardProps) {
  function handleCardClick(e: React.MouseEvent) {
    if (!onClick) return
    const target = e.target as HTMLElement
    if (target.closest('button, input, [role="checkbox"], a')) return
    onClick()
  }

  return (
    <div
      onClick={handleCardClick}
      style={{
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: columns,
        alignItems: 'center',
        background: 'rgba(23,27,36,0.5)',
        padding: '12px 4px',
        borderRadius: 10,
        border: '1px solid rgba(230,194,132,0.2)',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Animated selection border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 10,
          border: '1px solid rgba(230,194,132,0.4)',
          pointerEvents: 'none',
          transition: 'opacity 0.4s ease, clip-path 0.5s ease-out',
          opacity: isSelected ? 1 : 0,
          clipPath: isSelected ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
        }}
      />

      {/* Checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Checkbox checked={isSelected} onCheckedChange={onSelect} />
      </div>

      {children}
    </div>
  )
}
