import { useState, useRef, useEffect } from 'react'

interface StatusDotProps {
  name?: string
  color?: string
  top?: number | string
  right?: number | string
}

export function StatusDot({ name = 'Sem status', color = 'rgba(255,255,255,0.2)', top = 16, right = 16 }: StatusDotProps) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!show) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [show])

  return (
    <span
      ref={ref}
      onClick={(e) => { e.stopPropagation(); setShow(v => !v) }}
      style={{
        position: 'absolute', top, right,
        display: 'inline-flex', alignItems: 'center', gap: 0,
        border: `1px solid ${show ? color + '55' : 'transparent'}`,
        background: show ? `${color}18` : 'transparent',
        color,
        padding: '4px 10px 4px 6px',
        borderRadius: 999,
        fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
        overflow: 'hidden',
        maxWidth: show ? 160 : 16,
        cursor: 'pointer',
        marginBottom: 6,
        transition: 'max-width 0.65s ease, border-color 0.5s ease, background 0.5s ease',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ marginLeft: 5 }}>{name}</span>
    </span>
  )
}
