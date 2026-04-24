import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClockCounterClockwise } from '@phosphor-icons/react'
import { Modal } from './Modal'
import { logService, type Log } from '../services/logService'
import { collaboratorsService } from '../services/collaboratorsService'
import { formatPhone, formatCPF, formatCNPJ, formatZipCode } from '../utils/formatters'

const ACTION_LABELS: Record<string, string> = {
  create: 'Criação',
  edit: 'Edição',
  delete: 'Exclusão',
  login: 'Login',
}

const ACTION_COLORS: Record<string, string> = {
  create: '#4ade80',
  edit: '#E6C284',
  delete: '#f87171',
  login: '#6AA6C1',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  document: 'Documento',
  documentType: 'Tipo de documento',
  address: 'Endereço',
  addressNumber: 'Número',
  addressComplement: 'Complemento',
  neighborhood: 'Bairro',
  city: 'Cidade',
  state: 'UF',
  zipCode: 'CEP',
  status: 'Status',
  active: 'Status',
  color: 'Cor "status do cliente"',
  tradeName: 'Nome fantasia',
  cnpj: 'CNPJ',
  department: 'Departamento',
  roleId: 'Setor',
  notes: 'Observações',
  startAt: 'Início do agendamento',
  title: 'Título',
  description: 'Descrição',
  collaboratorId: 'Colaborador',
  value: 'Valor',
  clientObservation: 'Observação',
}

const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  accepted: 'Aceita',
  refused: 'Recusada',
}

const MODULE_FIELD_SUFFIX: Record<string, string> = {
  collaborators: 'do colaborador',
  clients: 'do cliente',
  roles: 'do setor',
  'client-statuses': 'do status',
  empresa: 'da empresa',
}

const SUFFIX_EXCLUDED_KEYS = new Set(['startAt', 'color'])
const APPOINTMENT_ONLY_KEYS = new Set(['title', 'startAt'])
const PROPOSAL_ONLY_KEYS = new Set(['value', 'clientObservation'])
const HIDDEN_KEYS = new Set(['statusChangedAt'])

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Ativo' : 'Inativo'
  if (key === 'status') {
    if (value === 1 || value === 0 || value === '1' || value === '0')
      return value === 1 || value === '1' ? 'Ativo' : 'Inativo'
    if (typeof value === 'string' && PROPOSAL_STATUS_LABELS[value])
      return PROPOSAL_STATUS_LABELS[value]
  }
  if (key === 'active') return value === true || value === 1 || value === '1' ? 'Ativo' : 'Inativo'
  return String(value)
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
}

function applyNumericFormat(key: string, value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const k = key.toLowerCase()
  const digits = value.replace(/\D/g, '')
  if (k.includes('phone') || k.includes('telefone')) return formatPhone(value)
  if (k.includes('cnpj')) return formatCNPJ(value)
  if (k.includes('zipcode') || k.includes('cep')) return formatZipCode(value)
  if (k.includes('document') || k.includes('documento') || k.includes('cpf')) {
    if (digits.length === 11) return formatCPF(digits)
    if (digits.length === 14) return formatCNPJ(digits)
  }
  return null
}

function formatISODate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ValueDisplay({ fieldKey, value, collaboratorsMap }: { fieldKey: string; value: unknown; collaboratorsMap?: Record<number, string> }) {
  if (fieldKey === 'collaboratorId' && collaboratorsMap) {
    const id = typeof value === 'number' ? value : Number(value)
    return <>{collaboratorsMap[id] ?? (value === null || value === undefined ? '—' : String(value))}</>
  }
  if (fieldKey === 'value') {
    return <>{Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>
  }
  const text = formatValue(fieldKey, value)
  if (isHexColor(value)) {
    return <span style={{ width: 12, height: 12, borderRadius: '50%', background: value, display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
  }
  const isoFormatted = formatISODate(value)
  if (isoFormatted) return <>{isoFormatted}</>
  const formatted = applyNumericFormat(fieldKey, value)
  return <>{formatted ?? text}</>
}

function ChangesTable({ metadata, module, collaboratorsMap }: { metadata: Record<string, unknown>; module?: string; collaboratorsMap?: Record<number, string> }) {
  const before = metadata.before as Record<string, unknown> | undefined
  const after = metadata.after as Record<string, unknown> | undefined
  if (!before || !after) return null

  const keys = Object.keys(after).filter(k => !HIDDEN_KEYS.has(k))
  if (keys.length === 0) return null

  const isAppointmentChange = keys.some(k => APPOINTMENT_ONLY_KEYS.has(k))
  const isProposalChange = keys.some(k => PROPOSAL_ONLY_KEYS.has(k))
  const suffix = isAppointmentChange ? 'do agendamento' : isProposalChange ? 'da proposta' : (module ? MODULE_FIELD_SUFFIX[module] : undefined)

  return (
    <div style={{
      marginTop: 8,
      display: 'grid',
      gridTemplateColumns: 'auto 1fr 16px 1fr',
      alignItems: 'center',
      gap: '4px 6px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 6,
      padding: '6px 8px',
    }}>
      {keys.map((k) => (
        <>
          <span key={`label-${k}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {FIELD_LABELS[k] ?? k}{suffix && FIELD_LABELS[k] && !SUFFIX_EXCLUDED_KEYS.has(k) ? ` ${suffix}` : ''}
          </span>
          <span key={`before-${k}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' as const }}>
            <ValueDisplay fieldKey={k} value={before[k]} collaboratorsMap={collaboratorsMap} />
          </span>
          <span key={`arrow-${k}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' as const }}>→</span>
          <span key={`after-${k}`} style={{ fontSize: 12, color: 'var(--color-app-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' as const }}>
            <ValueDisplay fieldKey={k} value={after[k]} collaboratorsMap={collaboratorsMap} />
          </span>
        </>
      ))}
    </div>
  )
}

function LogRow({ log, collaboratorsMap }: { log: Log; collaboratorsMap?: Record<number, string> }) {
  const color = ACTION_COLORS[log.action] ?? 'rgba(255,255,255,0.5)'
  const label = ACTION_LABELS[log.action] ?? log.action
  const hasChanges = log.action === 'edit' && log.metadata?.before && log.metadata?.after

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '12px 0',
      borderBottom: '1px solid rgba(106,166,193,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color,
          background: `${color}18`,
          border: `1px solid ${color}40`,
          borderRadius: 999,
          padding: '2px 8px',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.06em',
        }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
          {formatDate(log.createdAt)}
        </span>
      </div>
      {!hasChanges && log.description && (
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{log.description}</span>
      )}
      {hasChanges && log.metadata ? <ChangesTable metadata={log.metadata as Record<string, unknown>} module={log.module} collaboratorsMap={collaboratorsMap} /> : null}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>por {log.userName}</span>
    </div>
  )
}

interface EntityHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  module?: string
  entityId: number
  entityName?: string
}

export function EntityHistoryModal({ isOpen, onClose, module, entityId, entityName }: EntityHistoryModalProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['logs', module ?? 'all', entityId, page],
    queryFn: () => logService.listByEntity(entityId, page, module),
    enabled: isOpen,
  })

  const { data: collaboratorsData } = useQuery({
    queryKey: ['collaborators-select'],
    queryFn: () => collaboratorsService.select(),
    staleTime: 1000 * 60 * 5,
  })

  const collaboratorsMap = Object.fromEntries((collaboratorsData ?? []).map(c => [c.id, c.name])) as Record<number, string>

  const logs = data?.data ?? []
  const meta = data?.meta

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        entityName ? (
          <>
            <span className="hidden md:inline">{`Histórico — ${entityName}`}</span>
            <span className="flex flex-col md:hidden">
              <span>Histórico</span>
              <span style={{ fontSize: '0.85em', fontWeight: 500, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                - {entityName}
              </span>
            </span>
          </>
        ) : 'Histórico'
      }
      className="max-w-lg"
    >
      <div style={{ minHeight: 200 }}>
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Carregando...</span>
          </div>
        )}

        {!isLoading && logs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 8 }}>
            <ClockCounterClockwise size={32} color="rgba(255,255,255,0.2)" />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Nenhum registro encontrado</span>
          </div>
        )}

        {!isLoading && logs.length > 0 && (
          <div>
            {logs.map((log) => (
              <LogRow key={log.id} log={log} collaboratorsMap={collaboratorsMap} />
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 16 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(106,166,193,0.3)',
                background: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer',
                color: page === 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)', fontSize: 13,
              }}
            >
              Anterior
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {page} / {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(106,166,193,0.3)',
                background: 'none', cursor: page === meta.totalPages ? 'not-allowed' : 'pointer',
                color: page === meta.totalPages ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)', fontSize: 13,
              }}
            >
              Próximo
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
