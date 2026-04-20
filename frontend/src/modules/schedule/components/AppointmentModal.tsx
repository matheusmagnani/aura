import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../../shared/components/Modal'
import { Input } from '../../../shared/components/ui/Input'
import { Select } from '../../../shared/components/ui/Select'
import { AutocompleteClient } from '../../../shared/components/AutocompleteClient'
import { scheduleService, type Appointment } from '../../../shared/services/scheduleService'
import { collaboratorsService } from '../../../shared/services/collaboratorsService'
import { useToast } from '../../../shared/hooks/useToast'

interface AppointmentModalProps {
  appointment?: Appointment
  prefilledDate?: Date
  prefilledClient?: { id: number; name: string }
  onClose: () => void
  onSaved: () => void
  canDelete?: boolean
}

interface FormData {
  title: string
  description: string
  date: string
  time: string
  clientId: string
  collaboratorId: string
}

export function AppointmentModal({ appointment, prefilledDate, prefilledClient, onClose, onSaved, canDelete }: AppointmentModalProps) {
  const { addToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const initialDate = appointment
    ? format(parseISO(appointment.startAt), 'yyyy-MM-dd')
    : prefilledDate
      ? format(prefilledDate, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')

  const initialTime = appointment
    ? format(parseISO(appointment.startAt), 'HH:mm')
    : prefilledDate
      ? format(prefilledDate, 'HH:mm')
      : '08:00'

  const [form, setForm] = useState<FormData>({
    title: appointment?.title ?? '',
    description: appointment?.description ?? '',
    date: initialDate,
    time: initialTime,
    clientId: appointment?.clientId?.toString() ?? prefilledClient?.id.toString() ?? '',
    collaboratorId: appointment?.collaboratorId?.toString() ?? '',
  })

  const { data: collaboratorsData } = useQuery({
    queryKey: ['collaborators-select'],
    queryFn: () => collaboratorsService.list({ limit: 200, active: 1 }),
    staleTime: 1000 * 60 * 5,
  })

  const collaboratorOptions = [
    { value: '', label: 'Nenhum' },
    ...(collaboratorsData?.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ]

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function validate() {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.title.trim()) errs.title = 'Título é obrigatório'
    if (!form.date) errs.date = 'Data é obrigatória'
    if (!form.time) errs.time = 'Hora é obrigatória'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const startAt = new Date(`${form.date}T${form.time}:00`).toISOString()
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      startAt,
      clientId: form.clientId ? Number(form.clientId) : null,
      collaboratorId: form.collaboratorId ? Number(form.collaboratorId) : null,
    }

    setSaving(true)
    try {
      if (appointment) {
        await scheduleService.update(appointment.id, payload)
        addToast('Agendamento atualizado!', 'success')
      } else {
        await scheduleService.create(payload)
        addToast('Agendamento criado!', 'success')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      addToast(err.message ?? 'Erro ao salvar agendamento', 'danger')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!appointment) return
    setDeleting(true)
    try {
      await scheduleService.delete(appointment.id)
      addToast('Agendamento excluído!', 'success')
      onSaved()
      onClose()
    } catch (err: any) {
      addToast(err.message ?? 'Erro ao excluir agendamento', 'danger')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={
      appointment ? 'Editar Agendamento'
        : prefilledClient ? `Agendar — ${prefilledClient.name}`
        : 'Novo Agendamento'
    }>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          label="Título"
          placeholder="Título do agendamento"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
        />

        <div className="grid grid-cols-1 min-[366px]:grid-cols-2" style={{ gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>Data</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: errors.date ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: '8px 12px',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                colorScheme: 'dark',
              }}
            />
            {errors.date && <span style={{ fontSize: 12, color: '#f87171' }}>{errors.date}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>Hora</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: errors.time ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                padding: '8px 12px',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                colorScheme: 'dark',
              }}
            />
            {errors.time && <span style={{ fontSize: 12, color: '#f87171' }}>{errors.time}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Descrição (opcional)"
            rows={3}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: '8px 12px',
              color: 'white',
              fontSize: 14,
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {!prefilledClient && (
          <AutocompleteClient
            label="Cliente"
            value={form.clientId}
            onChange={(id) => {
              set('clientId', id)
              if (!id) setForm(prev => ({ ...prev, clientId: '' }))
            }}
            placeholder="Buscar cliente..."
            initialName={appointment?.client?.name}
          />
        )}

        <Select
          label="Colaborador"
          value={form.collaboratorId}
          onChange={(v) => set('collaboratorId', v)}
          options={collaboratorOptions}
          placeholder="Selecionar colaborador"
        />

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          {appointment && canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          ) : (
            <div />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px',
                borderRadius: 10,
                background: 'var(--color-app-accent)',
                border: 'none',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
