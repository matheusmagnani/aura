import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../../shared/components/Modal'
import { AutocompleteClient } from '../../../shared/components/AutocompleteClient'
import { Select } from '../../../shared/components/ui/Select'
import { proposalService, type Proposal } from '../../../shared/services/proposalService'
import { collaboratorsService } from '../../../shared/services/collaboratorsService'
import { useToast } from '../../../shared/hooks/useToast'
import { useAuthStore } from '../../../shared/stores/useAuthStore'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'sent', label: 'Enviada' },
  { value: 'accepted', label: 'Aceita' },
  { value: 'refused', label: 'Recusada' },
]

interface ProposalModalProps {
  proposal?: Proposal
  prefilledClient?: { id: number; name: string }
  onClose: () => void
  onSaved: () => void
}

interface FormData {
  clientId: string
  value: string
  description: string
  collaboratorId: string
  status: string
  clientObservation: string
}

function parseCurrency(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0
}

function maskCurrency(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function ProposalModal({ proposal, prefilledClient, onClose, onSaved }: ProposalModalProps) {
  const { addToast } = useToast()
  const currentUser = useAuthStore(s => s.user)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const initialValue = proposal ? Number(proposal.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''

  const [form, setForm] = useState<FormData>({
    clientId: proposal?.clientId.toString() ?? prefilledClient?.id.toString() ?? '',
    value: initialValue,
    description: proposal?.description ?? '',
    collaboratorId: proposal?.collaboratorId?.toString() ?? '',
    status: proposal?.status ?? 'pending',
    clientObservation: proposal?.clientObservation ?? '',
  })

  const { data: collaboratorsData } = useQuery({
    queryKey: ['collaborators-select'],
    queryFn: () => collaboratorsService.select(),
    staleTime: 1000 * 60 * 5,
  })

  const collaboratorOptions = (collaboratorsData ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
    badge: c.id === currentUser?.id ? 'Você' : undefined,
  }))

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function handleValueChange(raw: string) {
    set('value', maskCurrency(raw))
  }

  function validate() {
    const errs: Partial<Record<keyof FormData, string>> = {}
    if (!form.clientId) errs.clientId = 'Cliente é obrigatório'
    const numVal = parseCurrency(form.value)
    if (!form.value || numVal <= 0) errs.value = 'Valor deve ser maior que zero'
    if (!form.description.trim()) errs.description = 'Descrição é obrigatória'
    if (!form.collaboratorId) errs.collaboratorId = 'Colaborador é obrigatório'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); addToast('Preencha os campos obrigatórios corretamente.', 'danger'); return }

    const payload = {
      value: parseCurrency(form.value),
      description: form.description.trim() || null,
      clientObservation: form.clientObservation.trim() || null,
      status: form.status as Proposal['status'],
      collaboratorId: form.collaboratorId ? Number(form.collaboratorId) : null,
      ...(proposal ? {} : { clientId: Number(form.clientId) }),
    }

    setSaving(true)
    try {
      if (proposal) {
        await proposalService.update(proposal.id, payload)
        addToast('Proposta atualizada!', 'success')
      } else {
        await proposalService.create(payload)
        addToast('Proposta criada!', 'success')
      }
      onSaved()
      onClose()
    } catch (err: any) {
      addToast(err?.response?.data?.message ?? 'Erro ao salvar proposta', 'danger')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.05)',
    border: hasError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: '8px 12px',
    color: 'white',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  })

  const labelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: 'white' }
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
  const errorStyle: React.CSSProperties = { fontSize: 12, color: '#f87171' }
  const readonlyStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: '8px 12px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  }

  const title = proposal
    ? 'Editar Proposta'
    : prefilledClient
      ? `Nova Proposta — ${prefilledClient.name}`
      : 'Nova Proposta'

  return (
    <Modal isOpen onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Cliente */}
        {proposal ? (
          <div style={fieldStyle}>
            <label style={labelStyle}>Cliente</label>
            <div style={readonlyStyle}>{proposal.client.name}</div>
          </div>
        ) : prefilledClient ? (
          <div style={fieldStyle}>
            <label style={labelStyle}>Cliente</label>
            <div style={readonlyStyle}>{prefilledClient.name}</div>
          </div>
        ) : (
          <AutocompleteClient
            label="Cliente *"
            value={form.clientId}
            onChange={(id) => set('clientId', id)}
            placeholder="Buscar cliente..."
            error={errors.clientId}
          />
        )}

        {/* Valor */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Valor *</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 12, fontSize: 14, color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.value}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="0,00"
              style={{ ...inputStyle(!!errors.value), paddingLeft: 36 }}
            />
          </div>
          {errors.value && <span style={errorStyle}>{errors.value}</span>}
        </div>

        {/* Descrição */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Descrição *</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Descrição da proposta"
            rows={3}
            style={{ ...inputStyle(!!errors.description), resize: 'vertical' }}
          />
          {errors.description && <span style={errorStyle}>{errors.description}</span>}
        </div>

        {/* Colaborador + Status */}
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12 }}>
          <div className="md:col-span-2">
            <Select
              label="Colaborador responsável *"
              value={form.collaboratorId}
              onChange={(v) => set('collaboratorId', v)}
              options={collaboratorOptions}
              placeholder="Selecionar colaborador"
              error={errors.collaboratorId}
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={(v) => set('status', v)}
            options={STATUS_OPTIONS}
            placeholder="Selecionar status"
          />
        </div>

        {/* Observação do cliente */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Observação do cliente</label>
          <textarea
            value={form.clientObservation}
            onChange={(e) => set('clientObservation', e.target.value)}
            placeholder="Observações do cliente sobre a proposta (opcional)"
            rows={3}
            style={{ ...inputStyle(), resize: 'vertical' }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '8px 20px', borderRadius: 10,
              background: 'var(--color-app-accent)', border: 'none',
              color: 'white', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
