import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CaretDown } from '@phosphor-icons/react'

interface FilterSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string; color?: string }[]
}

export function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const selected = options.find(o => o.value === value && o.value !== '')
  const isActive = !!value

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
        !(e.target as Element).closest('[data-filter-dropdown]')) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: rect.width, maxWidth: 180,
        zIndex: 9999,
      })
    }
    setOpen(v => !v)
  }

  const dropdown = open ? createPortal(
    <div data-filter-dropdown style={{
      ...dropdownStyle,
      background: 'var(--color-app-primary)',
      border: '1px solid rgba(230,194,132,0.2)',
      borderRadius: 10, maxHeight: 200, overflowY: 'scroll',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      padding: '6px',
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => { onChange(opt.value); setOpen(false) }}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 6,
            background: value === opt.value ? 'rgba(230,194,132,0.1)' : 'none',
            border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13,
            color: value === opt.value ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.75)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {opt.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />}
          {opt.label}
        </button>
      ))}
    </div>,
    document.body
  ) : null

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
          background: isActive ? 'rgba(230,194,132,0.1)' : 'none',
          border: 'none', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, color: isActive ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.75)' }}>
          {selected ? selected.label : options[0].label}
        </span>
        <CaretDown size={12} weight="bold" style={{ flexShrink: 0, transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none', opacity: 0.5, color: 'rgba(255,255,255,0.4)' }} />
      </button>
      {dropdown}
    </div>
  )
}
