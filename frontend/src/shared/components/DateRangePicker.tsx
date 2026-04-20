import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CalendarBlank, X } from '@phosphor-icons/react'
import RsuiteDateRangePicker from 'rsuite/DateRangePicker'
import { CustomProvider } from 'rsuite'
import { format } from 'date-fns'
import ptBR from 'rsuite/locales/pt_BR'
import 'rsuite/DateRangePicker/styles/index.css'

export interface DateRange {
  from?: Date
  to?: Date
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  label?: string
  placeholder?: string
  maxWidth?: number | string
}

export function DateRangePicker({ value, onChange, label, placeholder = 'Selecione o período', maxWidth = 220 }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [popupEl, setPopupEl] = useState<Element | null>(null)
  const hasValue = value.from && value.to
  const displayLabel = hasValue
    ? `${format(value.from!, 'dd/MM/yy')} – ${format(value.to!, 'dd/MM/yy')}`
    : placeholder

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setPopupEl(document.querySelector('.rs-picker-daterange-panel'))
      }, 50)
      return () => clearTimeout(timer)
    } else {
      setPopupEl(null)
    }
  }, [open])

  return (
    <div>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
          {label}
        </span>
      )}
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', maxWidth, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
          background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarBlank size={14} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.75)' }} />
          {displayLabel}
        </span>
        {hasValue && (
          <X
            size={13}
            style={{ flexShrink: 0, opacity: 0.5 }}
            onClick={(e) => { e.stopPropagation(); onChange({}) }}
          />
        )}
      </button>

      {popupEl && createPortal(
        <button
          onClick={() => setOpen(false)}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center',
            padding: 4, borderRadius: 4, zIndex: 1,
          }}
          title="Fechar"
        >
          <X size={15} weight="bold" />
        </button>,
        popupEl
      )}

      <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
        <CustomProvider locale={ptBR} theme="dark">
          <RsuiteDateRangePicker
            open={open}
            value={value.from && value.to ? [value.from, value.to] : null}
            onChange={(range) => { onChange(range ? { from: range[0], to: range[1] } : {}); setOpen(false) }}
            onClose={() => setOpen(false)}
            showOneCalendar
            ranges={[]}
            container={() => document.body}
          />
        </CustomProvider>
      </div>
    </div>
  )
}
