import { useState, useRef, useEffect } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { createPortal } from 'react-dom'
import { TextB, TextItalic, TextUnderline } from '@phosphor-icons/react'

const CHIP_FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana']
const CHIP_SIZES = ['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt']

export function VariableChipView({ node, updateAttributes }: NodeViewProps) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const chipRef = useRef<HTMLSpanElement>(null)

  const { variable, label, color, bold, italic, underline, fontSize, fontFamily } = node.attrs

  // Fecha o painel ao clicar fora
  useEffect(() => {
    if (!open) return
    function close() { setOpen(false) }
    // setTimeout para não fechar no mesmo ciclo que abriu
    const t = setTimeout(() => document.addEventListener('mousedown', close), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', close)
    }
  }, [open])

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect()
      setPanelPos({ top: rect.bottom + 6, left: rect.left })
    }
    setOpen(prev => !prev)
  }

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(106,166,193,0.18)',
    border: '1px solid rgba(106,166,193,0.4)',
    borderRadius: 4,
    padding: '0 6px',
    lineHeight: 1.6,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: color ?? 'var(--color-app-accent)',
    fontWeight: bold ? 'bold' : '500',
    fontStyle: italic ? 'italic' : 'normal',
    textDecoration: underline ? 'underline' : 'none',
    fontSize: fontSize ?? '0.78em',
    ...(fontFamily ? { fontFamily } : {}),
    boxShadow: open ? '0 0 0 2px var(--color-app-accent)' : 'none',
  }

  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'var(--color-app-secondary)', flexShrink: 0,
  }
  const active: React.CSSProperties = { background: 'rgba(106,166,193,0.25)', color: 'var(--color-app-accent)' }
  const sel: React.CSSProperties = {
    height: 28, fontSize: '0.78rem', padding: '0 4px', borderRadius: 6,
    border: '1px solid rgba(106,166,193,0.3)', background: 'var(--color-app-bg)',
    color: 'var(--color-app-secondary)', cursor: 'pointer',
  }
  const div: React.CSSProperties = { width: 1, height: 18, background: 'rgba(106,166,193,0.25)', margin: '0 2px' }

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span ref={chipRef} style={chipStyle} onClick={handleClick} data-variable-chip title="Clique para formatar">
        {label ?? variable}
      </span>

      {open && createPortal(
        <div
          style={{
            position: 'fixed', top: panelPos.top, left: panelPos.left,
            zIndex: 9999, background: 'var(--color-app-primary)',
            border: '1px solid rgba(106,166,193,0.35)', borderRadius: 8,
            padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <select value={fontFamily ?? 'Arial'} style={{ ...sel, minWidth: 100 }}
            onChange={e => updateAttributes({ fontFamily: e.target.value })}>
            {CHIP_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select value={fontSize ?? '12pt'} style={{ ...sel, minWidth: 60 }}
            onChange={e => updateAttributes({ fontSize: e.target.value })}>
            {CHIP_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <div style={div} />

          <button onClick={() => updateAttributes({ bold: !bold })} style={{ ...btn, ...(bold ? active : {}) }}>
            <TextB size={15} weight="bold" />
          </button>
          <button onClick={() => updateAttributes({ italic: !italic })} style={{ ...btn, ...(italic ? active : {}) }}>
            <TextItalic size={15} />
          </button>
          <button onClick={() => updateAttributes({ underline: !underline })} style={{ ...btn, ...(underline ? active : {}) }}>
            <TextUnderline size={15} />
          </button>

          <div style={div} />

          <label title="Cor do texto" style={{ ...btn, position: 'relative', cursor: 'pointer' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: color ?? 'var(--color-app-accent)' }}>A</span>
            <input
              type="color"
              value={color ?? '#6aa6c1'}
              onChange={e => updateAttributes({ color: e.target.value })}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
          </label>

          {color && (
            <button onClick={() => updateAttributes({ color: null })} title="Remover cor"
              style={{ ...btn, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              ×
            </button>
          )}
        </div>,
        document.body,
      )}
    </NodeViewWrapper>
  )
}
