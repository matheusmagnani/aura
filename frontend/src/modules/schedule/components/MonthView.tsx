import { useEffect, useRef, useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { X, Plus } from '@phosphor-icons/react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { Appointment } from '../../../shared/services/scheduleService'
import { AppointmentCard } from './AppointmentCard'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MAX_VISIBLE = 2

interface MonthViewProps {
  currentDate: Date
  appointments: Appointment[]
  onSlotClick?: (date: Date) => void
  onAppointmentClick: (a: Appointment) => void
  onReschedule?: (appointmentId: number, newStartAt: string) => void
  canEdit?: boolean
}

function DayCell({
  day,
  isCurrentMonth,
  isToday,
  dayAppts,
  onSlotClick,
  onAppointmentClick,
  onReschedule,
  canEdit,
  isMobile,
}: {
  day: Date
  isCurrentMonth: boolean
  isToday: boolean
  dayAppts: Appointment[]
  onSlotClick?: (date: Date) => void
  onAppointmentClick: (a: Appointment) => void
  onReschedule?: (appointmentId: number, newStartAt: string) => void
  canEdit?: boolean
  isMobile?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [dayModalOpen, setDayModalOpen] = useState(false)

  useEffect(() => {
    if (!ref.current || !onReschedule || !canEdit) return
    return dropTargetForElements({
      element: ref.current,
      onDragEnter: () => setIsDragOver(true),
      onDragLeave: () => setIsDragOver(false),
      onDrop: ({ source }) => {
        setIsDragOver(false)
        const { appointmentId, originalStartAt } = source.data as { appointmentId: number; originalStartAt: string }
        // Preserva a hora original
        const orig = parseISO(originalStartAt)
        const newDate = new Date(
          day.getFullYear(),
          day.getMonth(),
          day.getDate(),
          orig.getHours(),
          orig.getMinutes(),
        )
        onReschedule(appointmentId, newDate.toISOString())
      },
    })
  }, [day, onReschedule, canEdit])

  const visible = dayAppts.slice(0, MAX_VISIBLE)
  const extra = dayAppts.length - MAX_VISIBLE

  return (
    <>
    <div
      ref={ref}
      onClick={() => isMobile ? setDayModalOpen(true) : onSlotClick?.(day)}
      style={{
        minHeight: isMobile ? 48 : 90,
        height: isMobile ? 48 : undefined,
        padding: '4px',
        background: isDragOver ? 'rgba(106,166,193,0.10)' : 'transparent',
        border: isToday ? '1.5px solid var(--color-app-secondary)' : '1px solid rgba(255,255,255,0.05)',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'background 0.15s',
        opacity: isCurrentMonth ? 1 : 0.3,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        fontSize: 12,
        fontWeight: isToday ? 700 : 400,
        color: isToday ? 'var(--color-app-accent)' : 'var(--color-app-gray)',
        marginBottom: isMobile ? 6 : 4,
        textAlign: 'right',
        paddingRight: 2,
      }}>
        {format(day, 'd')}
      </div>

      {isMobile ? (
        /* Mobile: pontos indicadores */
        dayAppts.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'nowrap' }}>
            {dayAppts.slice(0, 3).map((a) => (
              <div key={a.id} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-app-accent)', flexShrink: 0 }} />
            ))}
            {dayAppts.length > 3 && (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-app-gray)', flexShrink: 0 }} />
            )}
          </div>
        )
      ) : (
        /* Desktop: cards de agendamento */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visible.map((a) => (
            <AppointmentCard key={a.id} appointment={a} variant="month" onClick={onAppointmentClick} draggable={canEdit} />
          ))}
          {extra > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setPopoverOpen(true) }}
              style={{
                fontSize: 11,
                color: 'var(--color-app-accent)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: '2px 4px',
              }}
            >
              +{extra} mais
            </button>
          )}
        </div>
      )}

      {/* Popover com todos os eventos */}
      {popoverOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 50,
            background: 'var(--color-app-primary)',
            border: '1px solid rgba(106,166,193,0.3)',
            borderRadius: 8,
            padding: 8,
            minWidth: 180,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-app-accent)' }}>
              {format(day, "d 'de' MMM", { locale: ptBR })}
            </span>
            <button
              onClick={() => setPopoverOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-gray)', fontSize: 16, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {dayAppts.map((a) => (
              <AppointmentCard key={a.id} appointment={a} variant="month" onClick={(ap) => { setPopoverOpen(false); onAppointmentClick(ap) }} />
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Modal do dia — mobile only */}
    {dayModalOpen && (
      <div
        onClick={() => setDayModalOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--color-app-primary)',
            borderRadius: '16px 16px 0 0',
            padding: '20px 16px 32px',
            border: '1px solid rgba(106,166,193,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>
              {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {onSlotClick && (
                <button
                  onClick={() => { setDayModalOpen(false); onSlotClick(day) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--color-app-accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  <Plus size={14} weight="bold" />
                  Novo
                </button>
              )}
              <button
                onClick={() => setDayModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-gray)', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {dayAppts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              Sem agendamentos
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '50vh', overflowY: 'auto' }}>
              {dayAppts.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--color-app-gray)', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>
                    {format(parseISO(a.startAt), 'HH:mm')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <AppointmentCard appointment={a} variant="week" onClick={(ap) => { setDayModalOpen(false); onAppointmentClick(ap) }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  )
}

export function MonthView({ currentDate, appointments, onSlotClick, onAppointmentClick, onReschedule, canEdit }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const today = new Date()

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const days: Date[] = []
  let d = gridStart
  while (d <= monthEnd || days.length % 7 !== 0) {
    days.push(d)
    d = addDays(d, 1)
    if (days.length > 42) break
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '0 0 16px' }}>
      {/* Cabeçalho dos dias da semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_NAMES.map((name) => (
          <div key={name} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-app-gray)', padding: '6px 0' }}>
            {name}
          </div>
        ))}
      </div>

      {/* Grid de dias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1 }}>
        {days.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            isCurrentMonth={isSameMonth(day, currentDate)}
            isToday={isSameDay(day, today)}
            dayAppts={appointments.filter((a) => isSameDay(parseISO(a.startAt), day))}
            onSlotClick={onSlotClick}
            onAppointmentClick={onAppointmentClick}
            onReschedule={onReschedule}
            canEdit={canEdit}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  )
}
