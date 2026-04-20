import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClockCounterClockwise, X, CalendarBlank } from '@phosphor-icons/react'
import { MultiFilterSelect } from '../../../shared/components/MultiFilterSelect'
import { format, startOfDay, endOfDay } from 'date-fns'
import { DateRangePicker, type DateRange } from '../../../shared/components/DateRangePicker'
import { logService, type Log } from '../../../shared/services/logService'
import { collaboratorsService } from '../../../shared/services/collaboratorsService'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Pagination } from '../../../shared/components/Pagination'
import { Modal } from '../../../shared/components/Modal'
import { formatPhone, formatCPF, formatCNPJ, formatZipCode } from '../../../shared/utils/formatters'

const MODULE_LABELS: Record<string, string> = {
  clients: 'Clientes',
  collaborators: 'Colaboradores',
  empresa: 'Empresa',
  permissoes: 'Permissões',
  'client-statuses': 'Status de Clientes',
  roles: 'Setores',
  schedule: 'Agenda',
}

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
  color: 'Cor Status de Cliente',
  tradeName: 'Nome fantasia',
  cnpj: 'CNPJ',
  department: 'Departamento',
  roleId: 'Setor',
  notes: 'Observações',
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Ativo' : 'Inativo'
  if (key === 'status' || key.startsWith('Status ')) {
    if (value === 1 || value === 0 || value === '1' || value === '0' || typeof value === 'boolean')
      return value === 1 || value === '1' || value === true ? 'Ativo' : 'Inativo'
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

function ValueDisplay({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const text = formatValue(fieldKey, value)
  if (isHexColor(value)) {
    return <span style={{ width: 12, height: 12, borderRadius: '50%', background: value, display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
  }
  const formatted = applyNumericFormat(fieldKey, value)
  return <>{formatted ?? text}</>
}

const MODULE_FIELD_SUFFIX: Record<string, string> = {
  collaborators: 'do colaborador',
  clients: 'do cliente',
  roles: 'do setor',
  'client-statuses': 'do status',
  empresa: 'da empresa',
}

function ChangesTable({ metadata, module }: { metadata: Record<string, unknown>; module?: string }) {
  const before = metadata.before as Record<string, unknown> | undefined
  const after = metadata.after as Record<string, unknown> | undefined
  if (!before || !after) return null

  const keys = Object.keys(after)
  if (keys.length === 0) return null

  const suffix = module ? MODULE_FIELD_SUFFIX[module] : undefined

  return (
    <div style={{
      marginTop: 6,
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
            {FIELD_LABELS[k] ?? k}{suffix ? ` ${suffix}` : ''}
          </span>
          <span key={`before-${k}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' as const }}>
            <ValueDisplay fieldKey={k} value={before[k]} />
          </span>
          <span key={`arrow-${k}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' as const }}>→</span>
          <span key={`after-${k}`} style={{ fontSize: 12, color: 'var(--color-app-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' as const }}>
            <ValueDisplay fieldKey={k} value={after[k]} />
          </span>
        </>
      ))}
    </div>
  )
}

function LogCard({ log }: { log: Log }) {
  const color = ACTION_COLORS[log.action] ?? 'rgba(255,255,255,0.5)'
  const actionLabel = ACTION_LABELS[log.action] ?? log.action
  const moduleLabel = MODULE_LABELS[log.module] ?? log.module
  const hasChanges = log.action === 'edit' && log.metadata?.before && log.metadata?.after

  return (
    <div style={{ position: 'relative', paddingTop: 12 }}>
      {/* Badge de ação flutuante — igual ao "Você" nos colaboradores */}
      <span style={{
        position: 'absolute', top: 2, left: 16, zIndex: 1,
        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
        background: 'var(--color-app-bg)',
        color,
        border: `1px solid ${color}60`,
      }}>
        {actionLabel}
      </span>

      <div style={{
        background: 'rgba(23,27,36,0.5)',
        border: '1px solid rgba(230,194,132,0.2)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {/* Nome da entidade + data */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: '#6AA6C1',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {log.entityName || '—'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {formatDate(log.createdAt)}
          </span>
        </div>

        {/* Descrição ou changes */}
        {!hasChanges && log.description && (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{log.description}</span>
        )}
        {hasChanges && log.metadata ? <ChangesTable metadata={log.metadata as Record<string, unknown>} module={log.module} /> : null}

        {/* Autor + Módulo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>por {log.userName}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{moduleLabel}</span>
        </div>
      </div>
    </div>
  )
}



const MODULE_OPTIONS = [
  { label: 'Todos os módulos', value: '' },
  { label: 'Clientes', value: 'clients' },
  { label: 'Colaboradores', value: 'collaborators' },
  { label: 'Empresa', value: 'empresa' },
  { label: 'Permissões', value: 'permissoes' },
  { label: 'Setores', value: 'roles' },
  { label: 'Status de Clientes', value: 'client-statuses' },
]

const ACTION_OPTIONS = [
  { label: 'Todas as ações', value: '' },
  { label: 'Criação', value: 'create' },
  { label: 'Edição', value: 'edit' },
  { label: 'Exclusão', value: 'delete' },
]

export function HistoryPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modules, setModules] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [userIds, setUserIds] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [showFilterModal, setShowFilterModal] = useState(false)

  const { data: collaboratorsData } = useQuery({
    queryKey: ['collaborators-select'],
    queryFn: () => collaboratorsService.select(),
    staleTime: 1000 * 60 * 5,
  })

  const userOptions = [
    { label: 'Todos os colaboradores', value: '' },
    ...(collaboratorsData ?? []).map(c => ({ label: c.name, value: String(c.id) })),
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, search, modules, actions, userIds, dateRange],
    queryFn: () =>
      logService.list({
        page,
        limit: 30,
        search: search || undefined,
        modules: modules.length > 0 ? modules : undefined,
        actions: actions.length > 0 ? actions : undefined,
        userIds: userIds.length > 0 ? userIds.map(Number) : undefined,
        dateFrom: dateRange.from ? startOfDay(dateRange.from).toISOString() : undefined,
        dateTo: dateRange.to ? endOfDay(dateRange.to).toISOString() : (dateRange.from ? endOfDay(dateRange.from).toISOString() : undefined),
      }),
  })

  const logs = data?.data ?? []
  const meta = data?.meta

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  const filterActive = !!(modules.length || actions.length || userIds.length || (dateRange.from && dateRange.to))
  const activeDateLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'dd/MM/yy')} – ${format(dateRange.to, 'dd/MM/yy')}`
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Histórico"
        icon={ClockCounterClockwise}
        searchPlaceholder="Buscar no histórico..."
        onSearch={handleSearch}
        onFilterToggle={() => setShowFilterModal(true)}
        filterActive={filterActive}
      />

      {filterActive && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {userIds.map(uid => (
            <div key={uid} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Colaborador</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                {userOptions.find(o => o.value === uid)?.label ?? uid}
                <button onClick={() => { setUserIds(userIds.filter(v => v !== uid)); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          ))}
          {modules.map(m => (
            <div key={m} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Módulo</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                {MODULE_OPTIONS.find(o => o.value === m)?.label ?? m}
                <button onClick={() => { setModules(modules.filter(v => v !== m)); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          ))}
          {actions.map(a => (
            <div key={a} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Ação</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                {ACTION_OPTIONS.find(o => o.value === a)?.label ?? a}
                <button onClick={() => { setActions(actions.filter(v => v !== a)); setPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          ))}
          {activeDateLabel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Período</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                <CalendarBlank size={11} weight="bold" />
                {activeDateLabel}
                <button onClick={() => setDateRange({})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filtros do Histórico" className="min-h-[60vh]">
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(60vh - 140px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
            <MultiFilterSelect
              label="Colaborador"
              values={userIds}
              onChange={(v) => { setUserIds(v); setPage(1) }}
              options={(collaboratorsData ?? []).map(c => ({ value: String(c.id), label: c.name }))}
              placeholder="Todos os colaboradores"
              noCheckbox
            />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            <DateRangePicker
              label="Período"
              value={dateRange}
              onChange={setDateRange}
            />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            <MultiFilterSelect
              label="Módulo"
              values={modules}
              onChange={(v) => { setModules(v); setPage(1) }}
              options={MODULE_OPTIONS.filter(o => o.value !== '')}
              placeholder="Todos os módulos"
              noCheckbox
            />
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
            <MultiFilterSelect
              label="Ação"
              values={actions}
              onChange={(v) => { setActions(v); setPage(1) }}
              options={ACTION_OPTIONS.filter(o => o.value !== '')}
              placeholder="Todas as ações"
              noCheckbox
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 24 }}>
            <button
              onClick={() => setShowFilterModal(false)}
              style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, cursor: 'pointer', color: 'var(--color-app-primary)', fontWeight: 600, fontSize: 14 }}
            >
              Filtrar
            </button>
          </div>
        </div>
      </Modal>

      {/* List */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Carregando...</span>
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
          <ClockCounterClockwise size={40} color="rgba(255,255,255,0.15)" />
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Nenhum registro encontrado</span>
        </div>
      )}

      {!isLoading && logs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}

      {meta && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
