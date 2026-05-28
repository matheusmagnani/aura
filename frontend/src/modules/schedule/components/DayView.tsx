import { useEffect, useRef, useState } from 'react'
import {
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

interface DayViewProps {
  currentDate: Date
  appointments: Appointment[]
  onSlotClick?: (date: Date) => void
  onAppointmentClick: (a: Appointment) => void
  onReschedule?: (appointmentId: number, newStartAt: string) => void
  canEdit?: boolean
  forceMode?: 'list' | 'grid'
  hideDateHeader?: boolean
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

export function DayView({ currentDate, appointments, onSlotClick, onAppointmentClick, onReschedule, forceMode, hideDateHeader }: DayViewProps) {
  const today = new Date()
  const isToday = isSameDay(currentDate, today)
  const dayAppts = appointments.filter(a => isSameDay(parseISO(a.startAt), currentDate))

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

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    const now = new Date()
    const top = (now.getHours() * 60 + now.getMinutes()) * (SLOT_HEIGHT / 30)
    scrollRef.current.scrollTop = Math.max(0, top - 120)
  }, [])

  const [isMobileNative, setIsMobileNative] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobileNative(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const isMobile = forceMode === 'list' ? true : forceMode === 'grid' ? false : isMobileNative

  const slotForDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 8, 0)

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {!hideDateHeader && (
          <div
            style={{ padding: '12px 16px 4px', cursor: onSlotClick ? 'pointer' : undefined }}
            onClick={() => onSlotClick?.(slotForDay)}
          >
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: isToday ? 'var(--color-app-accent)' : 'var(--color-app-gray)',
              textTransform: 'capitalize',
            }}>
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
        )}
        {dayAppts.length === 0 ? (
          <div
            onClick={() => onSlotClick?.(slotForDay)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', cursor: onSlotClick ? 'pointer' : undefined }}
          >
            Sem agendamentos hoje
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px 12px' }}>
            {dayAppts.map(a => (
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
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header do dia */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ width: HOUR_COL_W, flexShrink: 0 }} />
        <div style={{
          flex: 1, textAlign: 'center', padding: '10px 4px',
          fontSize: 13, fontWeight: isToday ? 700 : 500,
          color: isToday ? 'var(--color-app-accent)' : 'var(--color-app-gray)',
          textTransform: 'capitalize',
        }}>
          <div>{format(currentDate, 'EEEE', { locale: ptBR })}</div>
          <div style={{
            fontSize: 20, fontWeight: 700,
            width: 32, height: 32, borderRadius: '50%',
            margin: '2px auto 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isToday ? 'var(--color-app-accent)' : 'transparent',
            color: isToday ? '#fff' : 'inherit',
          }}>
            {format(currentDate, 'd')}
          </div>
        </div>
      </div>

      {/* Grade horária */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'flex', position: 'relative' }}>
          {/* Coluna de horas */}
          <div style={{ width: HOUR_COL_W, flexShrink: 0 }}>
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
              <div
                key={i}
                style={{ height: SLOT_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 8, paddingTop: 2 }}
              >
                {i % SLOTS_PER_HOUR === 0 && (
                  <span style={{ fontSize: 11, color: 'var(--color-app-gray)' }}>
                    {String(Math.floor(i / SLOTS_PER_HOUR)).padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Coluna do dia */}
          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
            {Array.from({ length: TOTAL_SLOTS }, (_, si) => {
              const slotDate = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
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

            {dayAppts.map(a => {
              const apptDate = parseISO(a.startAt)
              const minutesFromMidnight = differenceInMinutes(apptDate, startOfDay(apptDate))
              const top = minutesFromMidnight * (SLOT_HEIGHT / 30)
              return (
                <div
                  key={a.id}
                  style={{ position: 'absolute', top, left: 2, right: 2, zIndex: 2, minHeight: SLOT_HEIGHT }}
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

            {isToday && (
              <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, background: 'var(--color-app-accent)', zIndex: 3, pointerEvents: 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-app-accent)', position: 'absolute', left: -4, top: -3 }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
