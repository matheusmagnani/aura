import { useState, useRef, useEffect } from 'react'
import { useClientsFilterStore } from '../stores/useClientsFilterStore'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UsersThree, PencilSimple, Trash, List, X, Tag, TrashSimple, ClockCounterClockwise, CalendarBlank } from '@phosphor-icons/react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { MultiFilterSelect } from '../../../shared/components/MultiFilterSelect'
import { DateRangePicker, type DateRange } from '../../../shared/components/DateRangePicker'
import { format, startOfDay, endOfDay } from 'date-fns'
import { Pagination } from '../../../shared/components/Pagination'
import { ListCard } from '../../../shared/components/ListCard'
import { Modal } from '../../../shared/components/Modal'
import { Select } from '../../../shared/components/ui/Select'
import { clientService, type Client } from '../../../shared/services/clientService'
import { clientStatusService } from '../../../shared/services/clientStatusService'
import { collaboratorsService } from '../../../shared/services/collaboratorsService'
import { ClientFormModal } from '../components/ClientFormModal'
import { EntityHistoryModal } from '../../../shared/components/EntityHistoryModal'
import { useToast } from '../../../shared/hooks/useToast'
import { useCanAccess } from '../../../shared/hooks/useMyPermissions'
import { formatPhone } from '../../../shared/utils/formatters'
import { useAuthStore } from '../../../shared/stores/useAuthStore'

const MODULE = 'clients'
const DESKTOP_COLS = '44px minmax(0,0.8fr) minmax(0,1fr) minmax(0,130px) 60px'

function StatusBadge({ status }: { status: { name: string; color: string } | null }) {
  if (!status) return <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      borderRadius: 999, fontWeight: 500,
      border: `1px solid ${status.color}55`,
      background: `${status.color}22`,
      color: status.color,
      padding: '3px 12px', fontSize: 13, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, flexShrink: 0 }} />
      {status.name}
    </span>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: 4,
      border: `1px solid ${checked ? 'var(--color-app-secondary)' : 'rgba(230,194,132,0.4)'}`,
      background: checked ? 'rgba(230,194,132,0.3)' : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {checked && (
        <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5L4.5 9L10 3" stroke="var(--color-app-secondary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

function ActionMenu({ client, onEdit, onDelete, onHistory, canEdit, canDelete }: {
  client: Client
  onEdit: (c: Client) => void
  onDelete: (c: Client) => void
  onHistory: (c: Client) => void
  canEdit: boolean
  canDelete: boolean
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, openUp: false })
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const openUp = window.innerHeight - rect.bottom < 120
      setMenuPos({
        top: openUp ? rect.top : rect.bottom + 4,
        left: rect.right,
        openUp,
      })
    }
    setOpen(v => !v)
  }

  const dropdown = open ? createPortal(
    <div ref={menuRef} style={{
      position: 'fixed',
      right: 'auto',
      left: menuPos.left,
      zIndex: 9999,
      transform: 'translateX(-100%)',
      ...(menuPos.openUp
        ? { bottom: 'auto', top: menuPos.top, transform: 'translateX(-100%) translateY(-100%)' }
        : { top: menuPos.top }),
      background: 'var(--color-app-primary)', border: '1px solid rgba(230,194,132,0.2)',
      borderRadius: 10, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
    }}>
      <button
        onClick={() => { onHistory(client); setOpen(false) }}
        style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-accent)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
      >
        <ClockCounterClockwise size={15} /> Histórico
      </button>
      {canEdit && (
        <button
          onClick={() => { onEdit(client); setOpen(false) }}
          style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
        >
          <PencilSimple size={15} /> Editar
        </button>
      )}
      {canDelete && (
        <button
          onClick={() => { onDelete(client); setOpen(false) }}
          style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
        >
          <Trash size={15} /> Excluir
        </button>
      )}
    </div>,
    document.body
  ) : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'rgba(255,255,255,0.6)' }}
      >
        <List size={20} weight="bold" />
      </button>
      {dropdown}
    </div>
  )
}

export function ClientsPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const canCreate = useCanAccess(MODULE, 'create')
  const canEdit = useCanAccess(MODULE, 'edit')
  const canDelete = useCanAccess(MODULE, 'delete')

  const {
    search, setSearch,
    page, setPage,
    filterStatusIds, setFilterStatusIds,
    filterUserIds, setFilterUserIds,
    filterDateRange, setFilterDateRange,
    filterAppointmentDateRange, setFilterAppointmentDateRange,
  } = useClientsFilterStore()
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [showBulkStatus, setShowBulkStatus] = useState(false)
  const [bulkStatusId, setBulkStatusId] = useState('')
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<Client | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Client | undefined>(undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page, search, filterStatusIds, filterUserIds, filterDateRange, filterAppointmentDateRange],
    queryFn: () => clientService.list({
      page, limit: 20,
      search: search || undefined,
      statusIds: filterStatusIds.length > 0 ? filterStatusIds.map(Number) : undefined,
      userIds: filterUserIds.length > 0 ? filterUserIds.map(Number) : undefined,
      dateFrom: filterDateRange.from ? startOfDay(filterDateRange.from).toISOString() : undefined,
      dateTo: filterDateRange.to ? endOfDay(filterDateRange.to).toISOString() : (filterDateRange.from ? endOfDay(filterDateRange.from).toISOString() : undefined),
      appointmentDateFrom: filterAppointmentDateRange.from ? startOfDay(filterAppointmentDateRange.from).toISOString() : undefined,
      appointmentDateTo: filterAppointmentDateRange.to ? endOfDay(filterAppointmentDateRange.to).toISOString() : (filterAppointmentDateRange.from ? endOfDay(filterAppointmentDateRange.from).toISOString() : undefined),
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientService.delete(id),
    onSuccess: () => {
      addToast('Cliente excluído!', 'success')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setSelected([])
      setDeleteTarget(undefined)
    },
    onError: (err: any) => addToast(err?.response?.data?.message || 'Erro ao excluir', 'danger'),
  })

  const { data: statusesData = [] } = useQuery({
    queryKey: ['client-statuses'],
    queryFn: clientStatusService.list,
    staleTime: 1000 * 60 * 5,
  })

  const { data: collaboratorsData } = useQuery({
    queryKey: ['collaborators-select'],
    queryFn: () => collaboratorsService.select(),
    staleTime: 1000 * 60 * 5,
  })

  const statusOptions = [
    { value: '', label: 'Sem status' },
    ...statusesData.map(s => ({ value: String(s.id), label: s.name })),
  ]

  const [bulkUpdating, setBulkUpdating] = useState(false)

  async function handleBulkStatus() {
    setBulkUpdating(true)
    try {
      await Promise.all(
        selected.map(id =>
          clientService.update(id, { statusId: bulkStatusId ? Number(bulkStatusId) : null })
        )
      )
      addToast('Status atualizado!', 'success')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setShowBulkStatus(false)
      setBulkStatusId('')
      setSelected([])
    } catch {
      addToast('Erro ao atualizar status', 'danger')
    } finally {
      setBulkUpdating(false)
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(selected.map(id => clientService.delete(id)))
      addToast(`${selected.length} ${selected.length === 1 ? 'cliente excluído' : 'clientes excluídos'}!`, 'success')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setShowBulkDelete(false)
      setSelected([])
    } catch {
      addToast('Erro ao excluir clientes', 'danger')
    } finally {
      setBulkDeleting(false)
    }
  }

  const clients = data?.data ?? []
  const meta = data?.meta

  function toggleAll() {
    if (selected.length === clients.length) setSelected([])
    else setSelected(clients.map(c => c.id))
  }

  function toggleOne(id: number) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSaved() {
    setShowForm(false)
    setEditingClient(undefined)
    queryClient.invalidateQueries({ queryKey: ['clients'] })
  }

  function openEdit(client: Client) {
    setEditingClient(client)
    setShowForm(true)
  }

  const allSelected = clients.length > 0 && selected.length === clients.length

  return (
    <div style={{ paddingBottom: selected.length > 0 ? 64 : 0, transition: 'padding-bottom 0.3s ease' }}>
      <PageHeader
        title="Clientes"
        icon={UsersThree}
        searchPlaceholder="Buscar cliente..."
        searchValue={search}
        onSearch={(value) => { setSearch(value); setPage(1) }}
        canCreate={canCreate}
        onAdd={() => { setEditingClient(undefined); setShowForm(true) }}
        onFilterToggle={() => setShowFilterModal(true)}
        filterActive={!!(filterStatusIds.length || filterUserIds.length || filterDateRange.from || filterAppointmentDateRange.from)}
      />

      {(filterStatusIds.length > 0 || filterUserIds.length > 0 || filterDateRange.from || filterAppointmentDateRange.from) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {filterUserIds.map(uid => (
            <div key={uid} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Colaborador</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999, fontSize: 12,
                background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)',
                color: 'var(--color-app-secondary)',
              }}>
                {(collaboratorsData ?? []).find(c => String(c.id) === uid)?.name ?? 'Colaborador'}
                <button onClick={() => setFilterUserIds(filterUserIds.filter(v => v !== uid))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          ))}
          {filterStatusIds.map(sid => (
            <div key={sid} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Status</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999, fontSize: 12,
                background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)',
                color: 'var(--color-app-secondary)',
              }}>
                {statusesData.find(s => String(s.id) === sid)?.name ?? 'Status'}
                <button onClick={() => setFilterStatusIds(filterStatusIds.filter(v => v !== sid))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          ))}
          {filterDateRange.from && filterDateRange.to && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Período de cadastro</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999, fontSize: 12,
                background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)',
                color: 'var(--color-app-secondary)',
              }}>
                {format(filterDateRange.from, 'dd/MM/yy')} – {format(filterDateRange.to, 'dd/MM/yy')}
                <button onClick={() => setFilterDateRange({})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          )}
          {filterAppointmentDateRange.from && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Período de agendamento</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999, fontSize: 12,
                background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)',
                color: 'var(--color-app-secondary)',
              }}>
                <CalendarBlank size={11} weight="bold" />
                {format(filterAppointmentDateRange.from, 'dd/MM/yy')}{filterAppointmentDateRange.to ? ` – ${format(filterAppointmentDateRange.to, 'dd/MM/yy')}` : ''}
                <button onClick={() => setFilterAppointmentDateRange({})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filtros">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MultiFilterSelect
            label="Colaborador"
            values={filterUserIds}
            onChange={setFilterUserIds}
            options={(collaboratorsData ?? []).map(c => ({
              value: String(c.id),
              label: c.name,
              badge: c.id === currentUser?.id ? 'Você' : undefined,
            }))}
            placeholder="Todos os colaboradores"
            noCheckbox
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <MultiFilterSelect
            label="Status"
            values={filterStatusIds}
            onChange={setFilterStatusIds}
            options={statusesData.map(s => ({ value: String(s.id), label: s.name, color: s.color }))}
            placeholder="Todos os status"
            noCheckbox
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <DateRangePicker
            label="Período de cadastro"
            value={filterDateRange}
            onChange={(v) => { setFilterDateRange(v); setPage(1) }}
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <DateRangePicker
            label="Período de agendamento"
            value={filterAppointmentDateRange}
            onChange={(v) => { setFilterAppointmentDateRange(v); setPage(1) }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowFilterModal(false)}
              style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, cursor: 'pointer', color: 'var(--color-app-primary)', fontWeight: 600, fontSize: 14 }}
            >
              Filtrar
            </button>
          </div>
        </div>
      </Modal>

      {/* Desktop Table */}
      <div className="desktop-table" style={{ marginTop: '1.5rem' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: DESKTOP_COLS, background: 'var(--color-app-primary)', borderRadius: '12px 12px 0 0', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={toggleAll}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-accent)', display: 'flex', alignItems: 'center' }}
          >
            <Checkbox checked={allSelected} />
          </button>
          {[
            { label: 'Cliente', align: 'left' },
            { label: 'Cadastrado', align: 'center' },
            { label: 'Status', align: 'center' },
            { label: 'Ação', align: 'center' },
          ].map(({ label, align }) => (
            <span key={label} style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textAlign: align as any, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{label}</span>
          ))}
        </div>

        {/* Rows */}
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'var(--color-app-primary)', borderRadius: '0 0 12px 12px' }}>
            Carregando...
          </div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'var(--color-app-primary)', borderRadius: '0 0 12px 12px' }}>
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {clients.map((client) => (
              <div
                key={client.id}
                style={{
                  display: 'grid', gridTemplateColumns: DESKTOP_COLS,
                  padding: '12px 16px', background: 'rgba(23,27,36,0.5)',
                  borderRadius: 10, alignItems: 'center',
                  border: '1px solid rgba(230,194,132,0.2)',
                  position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                  borderRadius: 10,
                  border: '1px solid rgba(230,194,132,0.4)',
                  pointerEvents: 'none',
                  transition: 'opacity 0.4s ease, clip-path 0.5s ease-out',
                  opacity: selected.includes(client.id) ? 1 : 0,
                  clipPath: selected.includes(client.id) ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
                }} />
                <button
                  onClick={() => toggleOne(client.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Checkbox checked={selected.includes(client.id)} />
                </button>

                {/* Name + phone */}
                <div
                  onClick={() => navigate(`/clients/${client.id}`)}
                  style={{ minWidth: 0, cursor: 'pointer' }}
                >
                  <p style={{ fontWeight: 500, color: '#fff', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {client.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                    {formatPhone(client.phone)}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <StatusBadge status={client.clientStatus} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ActionMenu
                    client={client}
                    onEdit={openEdit}
                    onDelete={c => setDeleteTarget(c)}
                    onHistory={c => setHistoryTarget(c)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile List */}
      <div className="mobile-list" style={{ marginTop: '1rem' }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Carregando...</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Nenhum cliente encontrado.</div>
        ) : (
          clients.map((client) => (
            <ListCard
              key={client.id}
              columns="44px minmax(0, 140px) auto auto"
              isSelected={selected.includes(client.id)}
              onSelect={() => toggleOne(client.id)}
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 500, color: '#fff', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {client.name}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                  {formatPhone(client.phone)}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: client.clientStatus ? client.clientStatus.color : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ActionMenu
                  client={client}
                  onEdit={openEdit}
                  onDelete={c => setDeleteTarget(c)}
                  onHistory={c => setHistoryTarget(c)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              </div>
            </ListCard>
          ))
        )}
      </div>

      {/* Selection bar — fixed footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 100,
        padding: '20px 24px 14px',
        background: 'var(--color-app-primary)',
        borderTop: '1px solid rgba(230,194,132,0.2)',
        transform: selected.length > 0 ? 'translateY(0)' : 'translateY(100%)',
        opacity: selected.length > 0 ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        pointerEvents: selected.length > 0 ? 'auto' : 'none',
      }}>
        {/* Contador — canto superior esquerdo */}
        <span style={{
          position: 'absolute', top: 6, left: 16,
          fontSize: 10, fontWeight: 500,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.02em',
        }}>
          {selected.length} {selected.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}
        </span>

        {/* Área de ações */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canDelete && (
              <button
                onClick={() => setShowBulkDelete(true)}
                title="Excluir selecionados"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  background: 'none', border: 'none',
                  cursor: 'pointer',
                  color: '#f87171',
                  fontSize: 13, fontWeight: 500,
                }}
              >
                <TrashSimple size={15} weight="bold" />
                Excluir
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => { setBulkStatusId(''); setShowBulkStatus(true) }}
                title="Editar status"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  background: 'rgba(var(--color-app-secondary-rgb) / 0.12)',
                  border: '1px solid rgba(var(--color-app-secondary-rgb) / 0.3)',
                  borderRadius: 8, cursor: 'pointer',
                  color: 'var(--color-app-secondary)',
                  fontSize: 13, fontWeight: 500,
                }}
              >
                <Tag size={15} weight="bold" />
                Editar status
              </button>
            )}
          </div>
          <button
            onClick={() => setSelected([])}
            title="Limpar seleção"
            style={{ position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-accent)', display: 'flex', alignItems: 'center', padding: 4 }}
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      </div>

      {meta && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
          itemLabel="cliente"
        />
      )}

      {showForm && (
        <ClientFormModal
          client={editingClient}
          onClose={() => { setShowForm(false); setEditingClient(undefined) }}
          onSaved={handleSaved}
        />
      )}

      {historyTarget && (
        <EntityHistoryModal
          isOpen
          onClose={() => setHistoryTarget(undefined)}
          entityId={historyTarget.id}
          entityName={historyTarget.name}
        />
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(undefined)} title="Excluir Cliente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Tem certeza que deseja excluir{' '}
            <strong style={{ color: '#fff' }}>{deleteTarget?.name}</strong>?
            <br />Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setDeleteTarget(undefined)}
              style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              style={{ padding: '8px 20px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, cursor: 'pointer', color: '#f87171', fontSize: 14, fontWeight: 500, opacity: deleteMutation.isPending ? 0.6 : 1 }}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showBulkDelete} onClose={() => setShowBulkDelete(false)} title="Excluir clientes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
              Tem certeza que deseja excluir{' '}
              {selected.length === 1
                ? <><strong style={{ color: '#fff' }}>{clients.find(c => c.id === selected[0])?.name}</strong></>
                : <>os <strong style={{ color: '#fff' }}>{selected.length} clientes</strong></>
              }{' '}
              abaixo? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
              {clients.filter(c => selected.includes(c.id)).map(c => (
                <div key={c.id} style={{
                  padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  fontSize: 13, color: 'rgba(255,255,255,0.8)',
                }}>
                  {c.name}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowBulkDelete(false)}
              style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{ padding: '8px 20px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, cursor: 'pointer', color: '#f87171', fontWeight: 600, fontSize: 14, opacity: bulkDeleting ? 0.6 : 1 }}
            >
              {bulkDeleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showBulkStatus} onClose={() => setShowBulkStatus(false)} title="Editar status">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Aplicar para <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{selected.length} {selected.length === 1 ? 'cliente' : 'clientes'}</strong>
          </p>
          <Select
            label="Status"
            value={bulkStatusId}
            onChange={setBulkStatusId}
            options={statusOptions}
            placeholder="Selecione um status"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowBulkStatus(false)}
              style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleBulkStatus}
              disabled={bulkUpdating}
              style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--color-app-primary)', fontWeight: 600, fontSize: 14, opacity: bulkUpdating ? 0.6 : 1 }}
            >
              {bulkUpdating ? 'Salvando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
