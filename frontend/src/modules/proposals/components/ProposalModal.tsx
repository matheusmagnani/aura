import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../../shared/components/Modal'
import { AutocompleteClient } from '../../../shared/components/AutocompleteClient'
import { Select } from '../../../shared/components/ui/Select'
import { proposalService, type Proposal } from '../../../shared/services/proposalService'
import { PROPOSAL_STATUS_ORDER, PROPOSAL_LABELS } from '../../../shared/constants/proposalStatus'
import { collaboratorsService } from '../../../shared/services/collaboratorsService'
import { useToast } from '../../../shared/hooks/useToast'
import { getApiError } from '../../../shared/utils/getApiError'
import { useAuthStore } from '../../../shared/stores/useAuthStore'

const STATUS_OPTIONS = PROPOSAL_STATUS_ORDER.map(s => ({ value: String(s), label: PROPOSAL_LABELS[s] }))

interface ProposalModalProps {
  proposal?: Proposal
  prefilledClient?: { id: number; name: string }
  defaultCollaboratorId?: number
  filterClientUserId?: number
  onClose: () => void
  onSaved: () => void
  onAccepted?: (proposal: Proposal) => void
  createFn?: (data: any) => Promise<Proposal>
  updateFn?: (id: number, data: any) => Promise<Proposal>
}

const PAYMENT_OPTIONS = [
  { value: 'money', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'card', label: 'Cartão' },
]

const DEADLINE_TYPE_OPTIONS = [
  { value: 'business', label: 'úteis' },
  { value: 'calendar', label: 'corridos' },
]

interface FormData {
  clientId: string
  value: string
  description: string
  collaboratorId: string
  idStatus: string
  clientObservation: string
  deadlineDays: string
  deadlineType: string
  signalValue: string
  signalPaymentMethod: string
  remainingPaymentMethod: string
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

export function ProposalModal({ proposal, prefilledClient, defaultCollaboratorId, filterClientUserId, onClose, onSaved, onAccepted, createFn, updateFn }: ProposalModalProps) {
  const { addToast } = useToast()
  const currentUser = useAuthStore(s => s.user)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const initialValue = proposal ? Number(proposal.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''

  const initialSignalValue = proposal?.signalValue
    ? Number(proposal.signalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : ''

  const [form, setForm] = useState<FormData>({
    clientId: proposal?.clientId.toString() ?? prefilledClient?.id.toString() ?? '',
    value: initialValue,
    description: proposal?.description ?? '',
    collaboratorId: proposal?.collaboratorId?.toString() ?? (defaultCollaboratorId ? String(defaultCollaboratorId) : ''),
    idStatus: proposal?.idStatus != null ? String(proposal.idStatus) : '1',
    clientObservation: proposal?.clientObservation ?? '',
    deadlineDays: proposal?.deadlineDays?.toString() ?? '',
    deadlineType: proposal?.deadlineType ?? 'business',
    signalValue: initialSignalValue,
    signalPaymentMethod: proposal?.signalPaymentMethod ?? '',
    remainingPaymentMethod: proposal?.remainingPaymentMethod ?? '',
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
    const masked = maskCurrency(raw)
    setForm(prev => {
      const newTotal = parseCurrency(masked)
      const signal = parseCurrency(prev.signalValue)
      const clampedSignal = signal > newTotal && newTotal > 0 ? masked : prev.signalValue
      return { ...prev, value: masked, signalValue: clampedSignal }
    })
    setErrors(prev => { const e = { ...prev }; delete e.value; return e })
  }

  function handleSignalChange(raw: string) {
    const masked = maskCurrency(raw)
    const signal = parseCurrency(masked)
    const total = parseCurrency(form.value)
    const clamped = total > 0 && signal > total ? maskCurrency(String(Math.round(total * 100))) : masked
    set('signalValue', clamped)
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

    const signalNum = parseCurrency(form.signalValue)
    const payload = {
      value: parseCurrency(form.value),
      description: form.description.trim() || null,
      clientObservation: form.clientObservation.trim() || null,
      idStatus: form.idStatus ? Number(form.idStatus) : 1,
      collaboratorId: form.collaboratorId ? Number(form.collaboratorId) : null,
      deadlineDays: form.deadlineDays ? parseInt(form.deadlineDays, 10) : null,
      deadlineType: form.deadlineDays ? (form.deadlineType || 'business') : null,
      signalValue: signalNum > 0 ? signalNum : null,
      signalPaymentMethod: signalNum > 0 ? (form.signalPaymentMethod || null) : null,
      remainingPaymentMethod: form.remainingPaymentMethod || null,
      ...(proposal ? {} : { clientId: Number(form.clientId) }),
    }

    setSaving(true)
    try {
      let result: Proposal
      if (proposal) {
        result = await (updateFn ?? proposalService.update)(proposal.id, payload)
        addToast('Proposta atualizada!', 'success')
      } else {
        result = await (createFn ?? proposalService.create)(payload)
        addToast('Proposta criada!', 'success')
      }
      onSaved()
      onClose()
      if (result.idStatus === 3) onAccepted?.(result)
    } catch (err: any) {
      addToast(getApiError(err), 'danger')
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
            filterUserId={filterClientUserId}
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
          {!defaultCollaboratorId && (
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
          )}
          <Select
            label="Status"
            value={form.idStatus}
            onChange={(v) => set('idStatus', v)}
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

        {/* Prazo */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Prazo de entrega</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              inputMode="numeric"
              value={form.deadlineDays}
              onChange={(e) => set('deadlineDays', e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 30"
              style={{ ...inputStyle(), width: 90, flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>dias</span>
            <div style={{ flex: 1 }}>
              <Select
                value={form.deadlineType}
                onChange={(v) => set('deadlineType', v)}
                options={DEADLINE_TYPE_OPTIONS}
                placeholder="Tipo"
              />
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Pagamento</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 14 }}>

            {/* Sinal */}
            <div className="flex flex-col md:flex-row md:items-end" style={{ gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Sinal (opcional)</div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 10, fontSize: 13, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.signalValue}
                    onChange={(e) => handleSignalChange(e.target.value)}
                    placeholder="0,00"
                    style={{ ...inputStyle(), paddingLeft: 32, fontSize: 13 }}
                  />
                </div>
              </div>
              {parseCurrency(form.signalValue) > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Forma de pagamento do sinal</div>
                  <Select
                    value={form.signalPaymentMethod}
                    onChange={(v) => set('signalPaymentMethod', v)}
                    options={PAYMENT_OPTIONS}
                    placeholder="Forma de pagamento"
                  />
                </div>
              )}
            </div>

            {/* Restante */}
            <div className="flex flex-col md:flex-row md:items-end" style={{ gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
                  {parseCurrency(form.signalValue) > 0 ? 'Restante' : 'Total'}
                </div>
                <div style={{ padding: '8px 2px', fontSize: 14, fontWeight: 600, color: 'var(--color-app-secondary)' }}>
                  {(() => {
                    const total = parseCurrency(form.value)
                    const signal = parseCurrency(form.signalValue)
                    const remaining = signal > 0 ? total - signal : total
                    return remaining > 0
                      ? `R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'R$ 0,00'
                  })()}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>Forma de pagamento</div>
                <Select
                  value={form.remainingPaymentMethod}
                  onChange={(v) => set('remainingPaymentMethod', v)}
                  options={PAYMENT_OPTIONS}
                  placeholder="Forma de pagamento"
                />
              </div>
            </div>

          </div>
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
