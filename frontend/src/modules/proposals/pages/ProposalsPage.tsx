import { useState, useRef, useEffect } from 'react'
import { useProposalsFilterStore } from '../stores/useProposalsFilterStore'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, List, Trash, PencilSimple, ClockCounterClockwise, X, TrashSimple, Eye, Tag } from '@phosphor-icons/react'
import { PageHeader } from '../../../shared/components/PageHeader'
import { MultiFilterSelect } from '../../../shared/components/MultiFilterSelect'
import { Select } from '../../../shared/components/ui/Select'
import { Pagination } from '../../../shared/components/Pagination'
import { ListCard } from '../../../shared/components/ListCard'
import { Modal } from '../../../shared/components/Modal'
import { EntityHistoryModal } from '../../../shared/components/EntityHistoryModal'
import { proposalService, type Proposal } from '../../../shared/services/proposalService'
import { collaboratorsService } from '../../../shared/services/collaboratorsService'
import { ProposalModal } from '../components/ProposalModal'
import { ProposalDetailModal } from '../components/ProposalDetailModal'
import { useToast } from '../../../shared/hooks/useToast'
import { useCanAccess } from '../../../shared/hooks/useMyPermissions'
import { formatCurrency } from '../../../shared/utils/formatters'
import { useAuthStore } from '../../../shared/stores/useAuthStore'

const MODULE = 'proposals'
const DESKTOP_COLS = '44px minmax(0,130px) minmax(0,1fr) minmax(0,160px) minmax(0,130px) 60px'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  accepted: 'Aceita',
  refused: 'Recusada',
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  sent: '#6AA6C1',
  accepted: '#4ADE80',
  refused: '#F87171',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'pending', label: 'Pendente', color: '#F59E0B' },
  { value: 'sent', label: 'Enviada', color: '#6AA6C1' },
  { value: 'accepted', label: 'Aceita', color: '#4ADE80' },
  { value: 'refused', label: 'Recusada', color: '#F87171' },
]

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#8A919C'
  const label = STATUS_LABELS[status] ?? status
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      borderRadius: 999, fontWeight: 500,
      border: `1px solid ${color}55`,
      background: `${color}22`,
      color,
      padding: '3px 12px', fontSize: 13, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
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

function ActionMenu({ proposal, onView, onEdit, onDelete, onHistory, canEdit, canDelete }: {
  proposal: Proposal
  onView: (p: Proposal) => void
  onEdit: (p: Proposal) => void
  onDelete: (p: Proposal) => void
  onHistory: (p: Proposal) => void
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
      const openUp = window.innerHeight - rect.bottom < 180
      setMenuPos({ top: openUp ? rect.top : rect.bottom + 4, left: rect.right, openUp })
    }
    setOpen(v => !v)
  }

  const dropdown = open ? createPortal(
    <div ref={menuRef} style={{
      position: 'fixed',
      left: menuPos.left,
      zIndex: 9999,
      transform: menuPos.openUp ? 'translateX(-100%) translateY(-100%)' : 'translateX(-100%)',
      top: menuPos.top,
      background: 'var(--color-app-primary)', border: '1px solid rgba(230,194,132,0.2)',
      borderRadius: 10, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
    }}>
      {canEdit && (
        <button
          onClick={() => { onEdit(proposal); setOpen(false) }}
          style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
        >
          <PencilSimple size={15} /> Editar
        </button>
      )}
      {canDelete && (
        <button
          onClick={() => { onDelete(proposal); setOpen(false) }}
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

export function ProposalsPage() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const canCreate = useCanAccess(MODULE, 'create')
  const canEdit = useCanAccess(MODULE, 'edit')
  const canDelete = useCanAccess(MODULE, 'delete')

  const { search, setSearch, page, setPage, filterStatus, setFilterStatus, filterCollaboratorIds, setFilterCollaboratorIds } = useProposalsFilterStore()
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingProposal, setEditingProposal] = useState<Proposal | undefined>(undefined)
  const [viewingProposal, setViewingProposal] = useState<Proposal | undefined>(undefined)
  const [isEditFromDetail, setIsEditFromDetail] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<Proposal | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Proposal | undefined>(undefined)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkStatus, setShowBulkStatus] = useState(false)
  const [bulkStatusValue, setBulkStatusValue] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['proposals', page, search, filterStatus, filterCollaboratorIds],
    queryFn: () => proposalService.list({
      page, limit: 20,
      search: search || undefined,
      status: filterStatus.length === 1 ? filterStatus[0] : undefined,
      collaboratorId: filterCollaboratorIds.length === 1 ? Number(filterCollaboratorIds[0]) : undefined,
    }),
  })

  const { data: collaboratorsData } = useQuery({
    queryKey: ['collaborators-select'],
    queryFn: () => collaboratorsService.select(),
    staleTime: 1000 * 60 * 5,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => proposalService.delete(id),
    onSuccess: () => {
      addToast('Proposta excluída!', 'success')
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      setSelected([])
      setDeleteTarget(undefined)
    },
    onError: (err: any) => addToast(err?.response?.data?.message || 'Erro ao excluir', 'danger'),
  })

  const proposals = data?.data ?? []
  const meta = data?.meta

  function toggleAll() {
    if (selected.length === proposals.length) setSelected([])
    else setSelected(proposals.map(p => p.id))
  }

  function toggleOne(id: number) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSaved() {
    setShowForm(false)
    setEditingProposal(undefined)
    setIsEditFromDetail(false)
    queryClient.invalidateQueries({ queryKey: ['proposals'] })
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(selected.map(id => proposalService.delete(id)))
      addToast(`${selected.length} ${selected.length === 1 ? 'proposta excluída' : 'propostas excluídas'}!`, 'success')
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      setShowBulkDelete(false)
      setSelected([])
    } catch {
      addToast('Erro ao excluir propostas', 'danger')
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleBulkStatus() {
    setBulkUpdating(true)
    try {
      await Promise.all(selected.map(id => proposalService.update(id, { status: bulkStatusValue as Proposal['status'] })))
      addToast('Status atualizado!', 'success')
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      setShowBulkStatus(false)
      setBulkStatusValue('')
      setSelected([])
    } catch {
      addToast('Erro ao atualizar status', 'danger')
    } finally {
      setBulkUpdating(false)
    }
  }

  const allSelected = proposals.length > 0 && selected.length === proposals.length
  const filterActive = filterStatus.length > 0 || filterCollaboratorIds.length > 0

  return (
    <div style={{ paddingBottom: selected.length > 0 ? 64 : 0, transition: 'padding-bottom 0.3s ease' }}>
      <PageHeader
        title="Propostas"
        icon={FileText}
        searchPlaceholder="Buscar proposta..."
        searchValue={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        canCreate={canCreate}
        onAdd={() => { setEditingProposal(undefined); setShowForm(true) }}
        onFilterToggle={() => setShowFilterModal(true)}
        filterActive={filterActive}
      />

      {filterActive && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {filterStatus.map(s => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Status</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                {STATUS_LABELS[s] ?? s}
                <button onClick={() => setFilterStatus(filterStatus.filter(v => v !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          ))}
          {filterCollaboratorIds.map(cid => (
            <div key={cid} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Colaborador</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                {(collaboratorsData ?? []).find(c => String(c.id) === cid)?.name ?? 'Colaborador'}
                <button onClick={() => setFilterCollaboratorIds(filterCollaboratorIds.filter(v => v !== cid))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filtros">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MultiFilterSelect
            label="Status"
            values={filterStatus}
            onChange={setFilterStatus}
            options={STATUS_FILTER_OPTIONS}
            placeholder="Todos os status"
            noCheckbox
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <MultiFilterSelect
            label="Colaborador"
            values={filterCollaboratorIds}
            onChange={setFilterCollaboratorIds}
            options={(collaboratorsData ?? []).map(c => ({
              value: String(c.id),
              label: c.name,
              badge: c.id === currentUser?.id ? 'Você' : undefined,
            }))}
            placeholder="Todos os colaboradores"
            noCheckbox
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
        <div style={{ display: 'grid', gridTemplateColumns: DESKTOP_COLS, background: 'var(--color-app-primary)', borderRadius: '12px 12px 0 0', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-accent)', display: 'flex', alignItems: 'center' }}>
            <Checkbox checked={allSelected} />
          </button>
          {['Valor', 'Cliente', 'Colaborador', 'Status', 'Ação'].map((label, i) => (
            <span key={label} style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textAlign: i === 0 ? 'start' : 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{label}</span>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'var(--color-app-primary)', borderRadius: '0 0 12px 12px' }}>Carregando...</div>
        ) : proposals.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'var(--color-app-primary)', borderRadius: '0 0 12px 12px' }}>Nenhuma proposta encontrada.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
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
                  borderRadius: 10, border: '1px solid rgba(230,194,132,0.4)',
                  pointerEvents: 'none', transition: 'opacity 0.4s ease, clip-path 0.5s ease-out',
                  opacity: selected.includes(proposal.id) ? 1 : 0,
                  clipPath: selected.includes(proposal.id) ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
                }} />
                <button onClick={() => toggleOne(proposal.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Checkbox checked={selected.includes(proposal.id)} />
                </button>

                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-app-secondary)' }}>
                    {formatCurrency(Number(proposal.value))}
                  </span>
                </div>

                <div onClick={() => setViewingProposal(proposal)} style={{ minWidth: 0, cursor: 'pointer', textAlign: 'center' }}>
                  <p style={{ fontWeight: 500, color: '#fff', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {proposal.client.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                    {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proposal.collaborator?.name ?? '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <StatusBadge status={proposal.status} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ActionMenu
                    proposal={proposal}
                    onView={setViewingProposal}
                    onEdit={p => { setEditingProposal(p); setShowForm(true) }}
                    onDelete={p => setDeleteTarget(p)}
                    onHistory={p => setHistoryTarget(p)}
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
        ) : proposals.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Nenhuma proposta encontrada.</div>
        ) : (
          proposals.map((proposal) => (
            <ListCard
              key={proposal.id}
              columns="44px minmax(0, 140px) auto auto"
              isSelected={selected.includes(proposal.id)}
              onSelect={() => toggleOne(proposal.id)}
              onClick={() => setViewingProposal(proposal)}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--color-app-secondary)', fontWeight: 600 }}>
                  {formatCurrency(Number(proposal.value))}
                </p>
                <p style={{ fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                  {proposal.client.name}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[proposal.status] ?? '#8A919C', flexShrink: 0 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ActionMenu
                  proposal={proposal}
                  onView={setViewingProposal}
                  onEdit={p => { setEditingProposal(p); setShowForm(true) }}
                  onDelete={p => setDeleteTarget(p)}
                  onHistory={p => setHistoryTarget(p)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              </div>
            </ListCard>
          ))
        )}
      </div>

      {/* Selection bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        padding: '20px 24px 14px',
        background: 'var(--color-app-primary)',
        borderTop: '1px solid rgba(230,194,132,0.2)',
        transform: selected.length > 0 ? 'translateY(0)' : 'translateY(100%)',
        opacity: selected.length > 0 ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        pointerEvents: selected.length > 0 ? 'auto' : 'none',
      }}>
        <span style={{ position: 'absolute', top: 6, left: 16, fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
          {selected.length} {selected.length === 1 ? 'proposta selecionada' : 'propostas selecionadas'}
        </span>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canDelete && (
              <button
                onClick={() => setShowBulkDelete(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 13, fontWeight: 500 }}
              >
                <TrashSimple size={15} weight="bold" />
                Excluir
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => { setBulkStatusValue(''); setShowBulkStatus(true) }}
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
          itemLabel="proposta"
        />
      )}

      {showForm && (
        <ProposalModal
          proposal={editingProposal}
          onClose={() => { setShowForm(false); setEditingProposal(undefined); setIsEditFromDetail(false) }}
          onSaved={handleSaved}
        />
      )}

      {viewingProposal && !isEditFromDetail && (
        <ProposalDetailModal
          proposal={viewingProposal}
          onClose={() => setViewingProposal(undefined)}
          onEdit={() => { setEditingProposal(viewingProposal); setIsEditFromDetail(true); setShowForm(true); setViewingProposal(undefined) }}
          onDeleted={() => {
            setViewingProposal(undefined)
            queryClient.invalidateQueries({ queryKey: ['proposals'] })
          }}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {historyTarget && (
        <EntityHistoryModal
          isOpen
          onClose={() => setHistoryTarget(undefined)}
          entityId={historyTarget.clientId}
          entityName={historyTarget.client.name}
        />
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(undefined)} title="Excluir Proposta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Tem certeza que deseja excluir a proposta de{' '}
            <strong style={{ color: '#fff' }}>{deleteTarget?.client.name}</strong>?
            <br />Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setDeleteTarget(undefined)} style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}>
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

      <Modal isOpen={showBulkDelete} onClose={() => setShowBulkDelete(false)} title="Excluir propostas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
            Tem certeza que deseja excluir{' '}
            {selected.length === 1
              ? <><strong style={{ color: '#fff' }}>{proposals.find(p => p.id === selected[0])?.client.name}</strong></>
              : <>as <strong style={{ color: '#fff' }}>{selected.length} propostas</strong></>
            }{' '}selecionadas? Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setShowBulkDelete(false)} style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}>
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
            Aplicar para <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{selected.length} {selected.length === 1 ? 'proposta' : 'propostas'}</strong>
          </p>
          <Select
            label="Status"
            value={bulkStatusValue}
            onChange={setBulkStatusValue}
            options={STATUS_FILTER_OPTIONS}
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
              disabled={bulkUpdating || !bulkStatusValue}
              style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--color-app-primary)', fontWeight: 600, fontSize: 14, opacity: (bulkUpdating || !bulkStatusValue) ? 0.6 : 1 }}
            >
              {bulkUpdating ? 'Salvando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
