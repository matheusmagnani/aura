import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PencilSimple, Trash, User, CalendarBlank, Clock, AlignLeft, UserCircle, CaretDown, Check } from '@phosphor-icons/react'
import { Modal } from '../../../shared/components/Modal'
import { scheduleService, type Appointment } from '../../../shared/services/scheduleService'
import { useToast } from '../../../shared/hooks/useToast'
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS, APPOINTMENT_STATUS_OPTIONS } from '../../../shared/constants/appointmentStatus'

interface AppointmentDetailModalProps {
  appointment: Appointment
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
  onUpdated?: (updated: Appointment) => void
  canEdit?: boolean
  canDelete?: boolean
  deleteFn?: (id: number) => Promise<void>
  updateFn?: (id: number, data: any) => Promise<Appointment>
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ color: 'var(--color-app-accent)', marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-app-gray)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'white' }}>{value}</div>
      </div>
    </div>
  )
}

export function AppointmentDetailModal({
  appointment,
  onClose,
  onEdit,
  onDeleted,
  onUpdated,
  canEdit,
  canDelete,
  deleteFn,
  updateFn,
}: AppointmentDetailModalProps) {
  const { addToast } = useToast()
  const [deleting, setDeleting] = useState(false)
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(appointment.idStatus)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const date = format(parseISO(appointment.startAt), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const time = format(parseISO(appointment.startAt), 'HH:mm')
  const statusColor = APPOINTMENT_STATUS_COLORS[currentStatus] ?? '#6AA6C1'

  useEffect(() => {
    if (!statusDropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [statusDropdownOpen])

  async function handleStatusChange(newStatus: number) {
    if (newStatus === currentStatus) { setStatusDropdownOpen(false); return }
    setUpdatingStatus(true)
    try {
      const updated = await (updateFn ?? scheduleService.update)(appointment.id, { idStatus: newStatus })
      setCurrentStatus(newStatus)
      setStatusDropdownOpen(false)
      addToast('Status atualizado!', 'success')
      onUpdated?.(updated)
    } catch (err: any) {
      addToast(err.message ?? 'Erro ao atualizar status', 'danger')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await (deleteFn ?? scheduleService.delete)(appointment.id)
      addToast('Agendamento excluído!', 'success')
      onDeleted()
      onClose()
    } catch (err: any) {
      addToast(err.message ?? 'Erro ao excluir agendamento', 'danger')
      setIsDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
    <Modal isOpen onClose={onClose} title="Detalhes do Agendamento">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div style={{
          borderLeft: `3px solid ${statusColor}`,
          paddingLeft: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-app-gray)', fontWeight: 500, marginBottom: 4 }}>Título</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{appointment.title}</div>
            </div>

            {/* Status badge interativo */}
            <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                disabled={!canEdit || updatingStatus}
                onClick={() => canEdit && setStatusDropdownOpen(v => !v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  color: statusColor,
                  border: `1px solid ${statusColor}55`,
                  background: `${statusColor}22`,
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'opacity 0.15s',
                  opacity: updatingStatus ? 0.6 : 1,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                {APPOINTMENT_STATUS_LABELS[currentStatus] ?? 'Pendente'}
                {canEdit && <CaretDown size={10} weight="bold" style={{ marginLeft: 2, transition: 'transform 0.15s', transform: statusDropdownOpen ? 'rotate(180deg)' : 'none' }} />}
              </button>

              {statusDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'var(--color-app-primary)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 50, minWidth: 150,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}>
                  {APPOINTMENT_STATUS_OPTIONS.map(opt => {
                    const optColor = APPOINTMENT_STATUS_COLORS[opt.value]
                    const isActive = opt.value === currentStatus
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleStatusChange(opt.value)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '9px 14px',
                          background: isActive ? `${optColor}18` : 'transparent',
                          border: 'none', cursor: 'pointer',
                          color: isActive ? optColor : 'rgba(255,255,255,0.7)',
                          fontSize: 13, textAlign: 'left',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: optColor, flexShrink: 0 }} />
                        {opt.label}
                        {isActive && <Check size={12} weight="bold" style={{ marginLeft: 'auto' }} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DetailRow icon={<CalendarBlank size={16} />} label="Data" value={date} />
          <DetailRow icon={<Clock size={16} />} label="Hora" value={time} />
          {appointment.client && (
            <DetailRow icon={<User size={16} />} label="Cliente" value={appointment.client.name} />
          )}
          {appointment.collaborator && (
            <DetailRow icon={<UserCircle size={16} />} label="Colaborador" value={appointment.collaborator.name} />
          )}
          {appointment.description && (
            <DetailRow icon={<AlignLeft size={16} />} label="Descrição" value={appointment.description} />
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          {canDelete ? (
            <button
              type="button"
              onClick={() => setIsDeleteConfirm(true)}
              style={{
                padding: '8px 16px', borderRadius: 10,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Trash size={15} />
              Excluir
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                style={{
                  padding: '8px 20px', borderRadius: 10,
                  background: 'var(--color-app-accent)', border: 'none',
                  color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <PencilSimple size={15} weight="bold" />
                Editar
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>

    <Modal isOpen={isDeleteConfirm} onClose={() => setIsDeleteConfirm(false)} title="Excluir Agendamento">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          Tem certeza que deseja excluir{' '}
          <strong style={{ color: '#fff' }}>{appointment.title}</strong>?
          <br />Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={() => setIsDeleteConfirm(false)}
            style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{ padding: '8px 20px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, cursor: 'pointer', color: '#f87171', fontSize: 14, fontWeight: 500, opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </Modal>
    </>
  )
}
