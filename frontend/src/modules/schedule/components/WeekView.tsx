import { useEffect, useRef, useState } from 'react'
import {
  addDays,
  startOfWeek,
  format,
  differenceInMinutes,
  startOfDay,
  isSameDay,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { Appointment } from '../../../shared/services/scheduleService'
import { AppointmentCard } from './AppointmentCard'

const SLOT_HEIGHT = 40
const SLOTS_PER_HOUR = 2
const TOTAL_SLOTS = 48
const HOUR_COL_W = 52

interface WeekViewProps {
  currentDate: Date
  appointments: Appointment[]
  onSlotClick?: (date: Date) => void
  onAppointmentClick: (a: Appointment) => void
  onReschedule?: (appointmentId: number, newStartAt: string) => void
  canEdit?: boolean
}

function SlotDropTarget({
  slotDate,
  onReschedule,
  children,
  onClick,
}: {
  slotDate: Date
  onReschedule?: (appointmentId: number, newStartAt: string) => void
  children?: React.ReactNode
  onClick?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (!ref.current || !onReschedule) return
    return dropTargetForElements({
      element: ref.current,
      onDragEnter: () => setIsDragOver(true),
      onDragLeave: () => setIsDragOver(false),
      onDrop: ({ source }) => {
        setIsDragOver(false)
        const { appointmentId } = source.data as { appointmentId: number }
        onReschedule(appointmentId, slotDate.toISOString())
      },
    })
  }, [slotDate, onReschedule])

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        height: SLOT_HEIGHT,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isDragOver ? 'rgba(106,166,193,0.15)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </div>
  )
}

export function WeekView({ currentDate, appointments, onSlotClick, onAppointmentClick, onReschedule, canEdit }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  const [nowTop, setNowTop] = useState(() => {
    const now = new Date()
    return (now.getHours() * 60 + now.getMinutes()) * (SLOT_HEIGHT / 30)
  })

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setNowTop((now.getHours() * 60 + now.getMinutes()) * (SLOT_HEIGHT / 30))
    }
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [])

  const appointmentsByDay = days.map((day) =>
    appointments.filter((a) => isSameDay(parseISO(a.startAt), day))
  )

  // A SchedulePage já renderiza o WeekView em dois containers separados (mobile/desktop),
  // então aqui sempre mostramos a lista quando o grid não cabe.
  // Como o container mobile tem padding e flui normalmente, usamos a prop do pai via CSS.
  // Mas o WeekView precisa decidir qual layout usar internamente:
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (isMobile) {
    return (
      <div style={{ padding: '0 0 40px' }}>
        {days.map((day, di) => {
          const dayAppts = appointmentsByDay[di]
          const isToday = isSameDay(day, today)
          const slotForDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8, 0)
          return (
            <div key={di}>
              {di > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />}
              <div
                style={{ padding: '12px 16px 4px', cursor: onSlotClick ? 'pointer' : undefined }}
                onClick={() => onSlotClick?.(slotForDay)}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingBottom: 8,
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isToday ? 'var(--color-app-accent)' : 'var(--color-app-gray)',
                    textTransform: 'capitalize',
                  }}>
                    {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              </div>
              {dayAppts.length === 0 ? (
                <div
                  onClick={() => onSlotClick?.(slotForDay)}
                  style={{ padding: '2px 16px 12px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', cursor: onSlotClick ? 'pointer' : undefined }}
                >
                  Sem agendamentos
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 16px 12px' }}>
                  {dayAppts.map((a) => (
                    <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--color-app-gray)', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>
                        {format(parseISO(a.startAt), 'HH:mm')}
                      </span>
                      <div style={{ flex: 1 }}>
                        <AppointmentCard appointment={a} variant="week" onClick={onAppointmentClick} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header com dias */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ width: HOUR_COL_W, flexShrink: 0 }} />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 4px',
                fontSize: 13,
                color: isToday ? 'var(--color-app-accent)' : 'var(--color-app-gray)',
                fontWeight: isToday ? 700 : 500,
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined,
              }}
            >
              <div>{format(day, 'EEE', { locale: ptBR })}</div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                width: 32,
                height: 32,
                borderRadius: '50%',
                margin: '2px auto 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isToday ? 'var(--color-app-accent)' : 'transparent',
                color: isToday ? '#fff' : 'inherit',
              }}>
                {format(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Grade horária */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* Coluna de horas */}
          <div style={{ width: HOUR_COL_W, flexShrink: 0 }}>
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
              <div
                key={i}
                style={{
                  height: SLOT_HEIGHT,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                  paddingTop: 2,
                }}
              >
                {i % SLOTS_PER_HOUR === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--color-app-gray)' }}>
                    {String(Math.floor(i / SLOTS_PER_HOUR)).padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {days.map((day, di) => {
            const dayAppts = appointmentsByDay[di]
            const isToday = isSameDay(day, today)
            return (
              <div
                key={di}
                style={{
                  flex: 1,
                  position: 'relative',
                  borderLeft: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {Array.from({ length: TOTAL_SLOTS }, (_, si) => {
                  const slotDate = new Date(
                    day.getFullYear(),
                    day.getMonth(),
                    day.getDate(),
                    Math.floor(si / SLOTS_PER_HOUR),
                    (si % SLOTS_PER_HOUR) * 30,
                  )
                  return (
                    <SlotDropTarget
                      key={si}
                      slotDate={slotDate}
                      onReschedule={onReschedule}
                      onClick={() => onSlotClick?.(slotDate)}
                    />
                  )
                })}

                {/* Appointments posicionados absolutamente */}
                {dayAppts.map((a) => {
                  const apptDate = parseISO(a.startAt)
                  const minutesFromMidnight = differenceInMinutes(apptDate, startOfDay(apptDate))
                  const top = minutesFromMidnight * (SLOT_HEIGHT / 30)
                  return (
                    <div
                      key={a.id}
                      style={{
                        position: 'absolute',
                        top,
                        left: 2,
                        right: 2,
                        zIndex: 2,
                        minHeight: SLOT_HEIGHT,
                      }}
                    >
                      <AppointmentCard
                        appointment={a}
                        variant="week"
                        onClick={onAppointmentClick}
                        draggable={!!onReschedule}
                      />
                    </div>
                  )
                })}

                {/* Indicador de hora atual */}
                {isToday && (
                  <div
                    style={{
                      position: 'absolute',
                      top: nowTop,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: 'var(--color-app-accent)',
                      zIndex: 3,
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--color-app-accent)',
                      position: 'absolute',
                      left: -4,
                      top: -3,
                    }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
