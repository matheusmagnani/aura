import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PencilSimple, Trash, User, CalendarBlank, Clock, AlignLeft, UserCircle } from '@phosphor-icons/react'
import { Modal } from '../../../shared/components/Modal'
import { scheduleService, type Appointment } from '../../../shared/services/scheduleService'
import { useToast } from '../../../shared/hooks/useToast'

interface AppointmentDetailModalProps {
  appointment: Appointment
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
  canEdit?: boolean
  canDelete?: boolean
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
  canEdit,
  canDelete,
}: AppointmentDetailModalProps) {
  const { addToast } = useToast()
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const date = format(parseISO(appointment.startAt), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const time = format(parseISO(appointment.startAt), 'HH:mm')

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await scheduleService.delete(appointment.id)
      addToast('Agendamento excluído!', 'success')
      onDeleted()
      onClose()
    } catch (err: any) {
      addToast(err.message ?? 'Erro ao excluir agendamento', 'danger')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Detalhes do Agendamento">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Conteúdo com borda esquerda unificada */}
        <div style={{
          borderLeft: '3px solid var(--color-app-accent)',
          paddingLeft: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-app-gray)', fontWeight: 500, marginBottom: 4 }}>Título</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{appointment.title}</div>
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
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: confirmDelete ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 0.2s',
              }}
            >
              <Trash size={15} />
              {deleting ? 'Excluindo...' : confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
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
                  padding: '8px 20px',
                  borderRadius: 10,
                  background: 'var(--color-app-accent)',
                  border: 'none',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
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
  )
}
