import { useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { type Editor } from '@tiptap/react'
import { CONTRACT_VARIABLES, CONTRACT_VARIABLE_GROUPS } from './contractVariables'

interface VariablePickerPanelProps {
  editor: Editor
}

export function VariablePickerPanel({ editor }: VariablePickerPanelProps) {
  const [open, setOpen] = useState(true)

  function insert(key: string, label: string) {
    editor.chain().focus().insertVariableChip(key, label).run()
  }

  return (
    <div
      style={{
        width: open ? 220 : 36,
        flexShrink: 0,
        borderRight: '1px solid rgba(106,166,193,0.2)',
        background: 'var(--color-app-primary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Recolher variáveis' : 'Expandir variáveis'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          gap: 6,
          padding: open ? '10px 10px 6px' : '10px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-app-accent)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {open && (
          <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-app-gray)' }}>
            Variáveis
          </span>
        )}
        {open ? <CaretLeft size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
      </button>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: 12,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {CONTRACT_VARIABLE_GROUPS.map((group) => (
          <div key={group} style={{ marginBottom: 8 }}>
            <p
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--color-app-accent)',
                padding: '4px 14px 2px',
                margin: 0,
              }}
            >
              {group}
            </p>
            {CONTRACT_VARIABLES.filter((v) => v.group === group).map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insert(v.key, v.label)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  color: 'var(--color-app-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(106,166,193,0.1)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
