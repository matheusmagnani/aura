import { useEffect, useRef } from 'react'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { Appointment } from '../../../shared/services/scheduleService'
import { APPOINTMENT_STATUS_COLORS } from '../../../shared/constants/appointmentStatus'

interface AppointmentCardProps {
  appointment: Appointment
  variant: 'week' | 'month'
  onClick: (a: Appointment) => void
  draggable?: boolean
}

export function AppointmentCard({ appointment, variant, onClick, draggable: isDraggable }: AppointmentCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const color = APPOINTMENT_STATUS_COLORS[appointment.idStatus] ?? '#6AA6C1'

  useEffect(() => {
    if (!isDraggable || !ref.current) return
    return draggable({
      element: ref.current,
      getInitialData: () => ({
        appointmentId: appointment.id,
        originalStartAt: appointment.startAt,
      }),
    })
  }, [isDraggable, appointment.id, appointment.startAt])

  if (variant === 'month') {
    return (
      <div
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onClick(appointment) }}
        title={appointment.title}
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderLeft: `3px solid ${color}`,
          borderRadius: '0 4px 4px 0',
          padding: '2px 6px',
          fontSize: 12,
          color: 'white',
          cursor: 'pointer',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          userSelect: 'none',
        }}
      >
        {appointment.title}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      onClick={(e) => { e.stopPropagation(); onClick(appointment) }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderLeft: `3px solid ${color}`,
        borderRadius: '0 6px 6px 0',
        padding: '4px 8px',
        fontSize: 12,
        color: 'white',
        cursor: 'pointer',
        overflow: 'hidden',
        userSelect: 'none',
        minHeight: 24,
      }}
    >
      <div style={{ fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {appointment.title}
      </div>
      {appointment.client && (
        <div style={{ fontSize: 11, color, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {appointment.client.name}
        </div>
      )}
      {appointment.collaborator && (
        <div style={{ fontSize: 11, color: appointment.collaborator.color ?? 'rgba(255,255,255,0.45)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {appointment.collaborator.name}
        </div>
      )}
    </div>
  )
}
