import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CaretDown } from '@phosphor-icons/react'

interface MultiFilterSelectProps {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  options: { label: string; value: string; color?: string; badge?: string }[]
  placeholder?: string
  noCheckbox?: boolean
}

export function MultiFilterSelect({ label, values, onChange, options, placeholder = 'Todos', noCheckbox = false }: MultiFilterSelectProps) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const isActive = values.length > 0

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) &&
        !(e.target as Element).closest('[data-multi-filter-dropdown]')) setOpen(false)
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
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
        minWidth: rect.width, maxWidth: 220,
        zIndex: 9999,
      })
    }
    setOpen(v => !v)
  }

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter(v => v !== value) : [...values, value])
  }

  const displayLabel = isActive
    ? values.length === 1
      ? options.find(o => o.value === values[0])?.label ?? placeholder
      : `${values.length} selecionados`
    : placeholder

  const dropdown = open ? createPortal(
    <div data-multi-filter-dropdown style={{
      ...dropdownStyle,
      background: 'var(--color-app-primary)',
      border: '1px solid rgba(230,194,132,0.2)',
      borderRadius: 10, maxHeight: 220, overflowY: 'auto',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      padding: '6px',
    }}>
      {options.map(opt => {
        const checked = values.includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            style={{
              width: '100%', padding: '7px 20px 7px 10px', borderRadius: 6,
              background: checked ? 'rgba(230,194,132,0.1)' : 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13,
              color: checked ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {noCheckbox ? (
              <svg width={11} height={11} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: checked ? 1 : 0 }}>
                <path d="M2 6.5L4.5 9L10 3" stroke="var(--color-app-secondary)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <div style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                border: `1px solid ${checked ? 'var(--color-app-secondary)' : 'rgba(230,194,132,0.4)'}`,
                background: checked ? 'rgba(230,194,132,0.25)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {checked && (
                  <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5L4.5 9L10 3" stroke="var(--color-app-secondary)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            )}
            {opt.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
            {opt.badge && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 999, background: 'rgba(230,194,132,0.2)', color: 'var(--color-app-secondary)', flexShrink: 0, lineHeight: 1 }}>
                {opt.badge}
              </span>
            )}
          </button>
        )
      })}
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
          {displayLabel}
        </span>
        <CaretDown size={12} weight="bold" style={{ flexShrink: 0, transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none', opacity: 0.5, color: 'rgba(255,255,255,0.4)' }} />
      </button>
      {dropdown}
    </div>
  )
}
