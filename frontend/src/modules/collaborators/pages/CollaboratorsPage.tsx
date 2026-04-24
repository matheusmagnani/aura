import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, PencilSimple, Trash, Key, List, ToggleLeft, ToggleRight, X, TrashSimple, ClockCounterClockwise } from '@phosphor-icons/react'
import { Modal } from '../../../shared/components/Modal'
import { PageHeader } from '../../../shared/components/PageHeader'
import { FilterSelect } from '../../../shared/components/FilterSelect'
import { MultiFilterSelect } from '../../../shared/components/MultiFilterSelect'
import { Pagination } from '../../../shared/components/Pagination'
import { ListCard } from '../../../shared/components/ListCard'
import { Input } from '../../../shared/components/ui/Input'
import { EntityHistoryModal } from '../../../shared/components/EntityHistoryModal'
import { collaboratorsService, type Collaborator } from '../../../shared/services/collaboratorsService'
import { roleService } from '../../../shared/services/roleService'
import { useToast } from '../../../shared/hooks/useToast'
import { useCanAccess } from '../../../shared/hooks/useMyPermissions'
import { useAuthStore } from '../../../shared/stores/useAuthStore'
import { useCollaboratorsFilterStore } from '../stores/useCollaboratorsFilterStore'

const MODULE = 'collaborators'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

function Avatar({ name, avatar, size = 36 }: { name: string; avatar: string | null; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  if (avatar) {
    return (
      <img
        src={`${API_URL}/uploads/${avatar}`}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: '1px solid rgba(230,194,132,0.3)',
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--color-app-secondary)', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, color: 'var(--color-app-primary)',
    }}>
      {initials}
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span style={{ background: '#16a34a', color: '#fff', borderRadius: '999px', padding: '3px 14px', fontSize: 13, fontWeight: 500, display: 'inline-block' }}>
      Ativo
    </span>
  ) : (
    <span style={{ background: '#dc2626', color: '#fff', borderRadius: '999px', padding: '3px 14px', fontSize: 13, fontWeight: 500, display: 'inline-block' }}>
      Inativo
    </span>
  )
}

function ActionMenu({
  collaborator,
  onEdit,
  onDelete,
  onToggleStatus,
  onResetPassword,
  onHistory,
  canEdit,
  canDelete,
}: {
  collaborator: Collaborator
  onEdit: (c: Collaborator) => void
  onDelete: (c: Collaborator) => void
  onToggleStatus: (c: Collaborator) => void
  onResetPassword: (c: Collaborator) => void
  onHistory: (c: Collaborator) => void
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
      const openUp = window.innerHeight - rect.bottom < 200
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
      borderRadius: 10, minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
    }}>
      <button
        onClick={() => { onHistory(collaborator); setOpen(false) }}
        style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-accent)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
      >
        <ClockCounterClockwise size={15} /> Histórico
      </button>
      {canEdit && (
        <>
          <button
            onClick={() => { onEdit(collaborator); setOpen(false) }}
            style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            <PencilSimple size={15} /> Editar
          </button>
          <button
            onClick={() => { onToggleStatus(collaborator); setOpen(false) }}
            style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            {collaborator.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
            {collaborator.active ? 'Inativar' : 'Ativar'}
          </button>
          <button
            onClick={() => { onResetPassword(collaborator); setOpen(false) }}
            style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            <Key size={15} /> Redefinir senha
          </button>
        </>
      )}
      {canDelete && (
        <button
          onClick={() => { onDelete(collaborator); setOpen(false) }}
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

function CollaboratorFormModal({
  collaborator,
  onClose,
  onSaved,
}: {
  collaborator?: Collaborator
  onClose: () => void
  onSaved: () => void
}) {
  const { addToast } = useToast()
  const [name, setName] = useState(collaborator?.name ?? '')
  const [email, setEmail] = useState(collaborator?.email ?? '')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState<number | ''>(collaborator?.roleId ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { data: rolesData } = useQuery({
    queryKey: ['roles-select'],
    queryFn: () => roleService.select(),
    staleTime: 1000 * 60 * 5,
  })
  const roles = rolesData ?? []

  function clearError(field: string) {
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nome é obrigatório'
    if (!email.trim()) errs.email = 'E-mail é obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido'
    if (!collaborator) {
      if (!password) errs.password = 'Senha é obrigatória'
      else if (password.length < 6) errs.password = 'Mínimo 6 caracteres'
    }
    if (roleId === '') errs.roleId = 'Setor é obrigatório'
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); addToast('Preencha os campos obrigatórios corretamente.', 'danger'); return }
    setSaving(true)
    try {
      if (collaborator) {
        await collaboratorsService.update(collaborator.id, { name, email, roleId: Number(roleId) })
      } else {
        await collaboratorsService.create({ name, email, password, roleId: Number(roleId) })
      }
      addToast(collaborator ? 'Colaborador atualizado!' : 'Colaborador criado!', 'success')
      onSaved()
    } catch (err: any) {
      addToast(err?.message || 'Erro ao salvar colaborador', 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={collaborator ? 'Editar Colaborador' : 'Novo Colaborador'}>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <Input
          label="Nome"
          value={name}
          onChange={(e) => { setName(e.target.value); clearError('name') }}
          placeholder="Nome completo"
          error={errors.name}
        />
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError('email') }}
          placeholder="email@exemplo.com"
          error={errors.email}
        />
        {!collaborator && (
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError('password') }}
            placeholder="Mínimo 6 caracteres"
            error={errors.password}
          />
        )}
        <div>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#fff', display: 'block', marginBottom: 8 }}>Setor</label>
          <select
            value={roleId}
            onChange={(e) => { setRoleId(e.target.value === '' ? '' : Number(e.target.value)); clearError('roleId') }}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${errors.roleId ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: 12, padding: '8px 12px',
              color: roleId === '' ? 'rgba(255,255,255,0.4)' : '#fff',
              fontSize: 14, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="" disabled>Selecione um setor</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {errors.roleId && <span style={{ fontSize: 12, color: '#f87171', marginTop: 4, display: 'block' }}>{errors.roleId}</span>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, color: 'var(--color-app-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ResetPasswordModal({
  collaborator,
  onClose,
}: {
  collaborator: Collaborator
  onClose: () => void
}) {
  const { addToast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function clearError(field: string) {
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!newPassword) errs.newPassword = 'Senha é obrigatória'
    else if (newPassword.length < 6) errs.newPassword = 'Mínimo 6 caracteres'
    if (!confirm) errs.confirm = 'Confirmação é obrigatória'
    else if (confirm !== newPassword) errs.confirm = 'As senhas não coincidem'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      await collaboratorsService.resetPassword(collaborator.id, newPassword)
      addToast('Senha redefinida com sucesso!', 'success')
      onClose()
    } catch (err: any) {
      addToast(err?.message || 'Erro ao redefinir senha', 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Redefinir Senha">
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          Redefinindo senha de <strong style={{ color: '#fff' }}>{collaborator.name}</strong>
        </p>
        <Input
          label="Nova senha"
          type="password"
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value); clearError('newPassword') }}
          placeholder="Mínimo 6 caracteres"
          error={errors.newPassword}
        />
        <Input
          label="Confirmar senha"
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); clearError('confirm') }}
          placeholder="Repita a senha"
          error={errors.confirm}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, color: 'var(--color-app-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando...' : 'Redefinir'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function CollaboratorsPage() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const canCreate = useCanAccess(MODULE, 'create')
  const canEdit = useCanAccess(MODULE, 'edit')
  const canDelete = useCanAccess(MODULE, 'delete')

  const { search, setSearch, page, setPage, statusFilters, setStatusFilters, roleIds, setRoleIds } = useCollaboratorsFilterStore()
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Collaborator | undefined>(undefined)
  const [historyTarget, setHistoryTarget] = useState<Collaborator | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Collaborator | undefined>(undefined)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkToggling, setBulkToggling] = useState(false)

  const activeParam = statusFilters.length === 1 ? (statusFilters[0] === '1' ? 1 : 0) : undefined

  const { data, isLoading } = useQuery({
    queryKey: ['collaborators', page, search, statusFilters, roleIds],
    queryFn: () =>
      collaboratorsService.list({
        page,
        limit: 20,
        search: search || undefined,
        active: activeParam,
        roleIds: roleIds.length > 0 ? roleIds.map(Number) : undefined,
      }),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles-select'],
    queryFn: () => roleService.select(),
    staleTime: 1000 * 60 * 5,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => collaboratorsService.delete(id),
    onSuccess: () => {
      addToast('Colaborador excluído!', 'success')
      queryClient.invalidateQueries({ queryKey: ['collaborators'] })
      setSelected([])
      setDeleteTarget(undefined)
    },
    onError: (err: any) => addToast(err?.message || 'Erro ao excluir', 'danger'),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (c: Collaborator) => collaboratorsService.update(c.id, { active: !c.active }),
    onSuccess: () => {
      addToast('Status atualizado!', 'success')
      queryClient.invalidateQueries({ queryKey: ['collaborators'] })
    },
    onError: (err: any) => addToast(err?.message || 'Erro ao atualizar status', 'danger'),
  })

  const collaborators = data?.data ?? []
  const meta = data?.meta

  async function handleBulkToggle(active: boolean) {
    setBulkToggling(true)
    try {
      await Promise.all(selected.map(id => collaboratorsService.update(id, { active })))
      addToast(`${selected.length} ${selected.length === 1 ? 'colaborador' : 'colaboradores'} ${active ? 'ativado(s)' : 'inativado(s)'}!`, 'success')
      queryClient.invalidateQueries({ queryKey: ['collaborators'] })
      setSelected([])
    } catch {
      addToast('Erro ao atualizar status', 'danger')
    } finally {
      setBulkToggling(false)
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      await Promise.all(selected.map(id => collaboratorsService.delete(id)))
      addToast(`${selected.length} ${selected.length === 1 ? 'colaborador excluído' : 'colaboradores excluídos'}!`, 'success')
      queryClient.invalidateQueries({ queryKey: ['collaborators'] })
      setShowBulkDelete(false)
      setSelected([])
    } catch {
      addToast('Erro ao excluir colaboradores', 'danger')
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleAll() {
    if (selected.length === collaborators.length) setSelected([])
    else setSelected(collaborators.map((c) => c.id))
  }

  function toggleOne(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSaved() {
    setShowForm(false)
    setEditingCollaborator(undefined)
    queryClient.invalidateQueries({ queryKey: ['collaborators'] })
  }

  function openEdit(c: Collaborator) {
    setEditingCollaborator(c)
    setShowForm(true)
  }

  const allSelected = collaborators.length > 0 && selected.length === collaborators.length
  const selectedCollaborators = collaborators.filter(c => selected.includes(c.id))
  const allSelectedInactive = selectedCollaborators.length > 0 && selectedCollaborators.every(c => !c.active)
  const bulkToggleActive = allSelectedInactive

  // Desktop table columns: checkbox | avatar+name+email | setor | status | ações
  const DESKTOP_COLS = '44px minmax(0,1fr) minmax(0,180px) minmax(0,130px) 60px'

  return (
    <div style={{ paddingBottom: selected.length > 0 ? 64 : 0, transition: 'padding-bottom 0.3s ease' }}>
      <PageHeader
        title="Colaboradores"
        icon={Users}
        searchPlaceholder="Buscar colaborador..."
        searchValue={search}
        onSearch={(value) => { setSearch(value) }}
        onFilterToggle={() => setShowFilterModal(true)}
        filterActive={!!(statusFilters.length || roleIds.length)}
        canCreate={canCreate}
        onAdd={() => { setEditingCollaborator(undefined); setShowForm(true) }}
      />

      {(statusFilters.length > 0 || roleIds.length > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {statusFilters.map(s => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Status</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999, fontSize: 12,
                background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)',
                color: 'var(--color-app-secondary)',
              }}>
                {s === '1' ? 'Ativos' : 'Inativos'}
                <button onClick={() => setStatusFilters(statusFilters.filter(v => v !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                  <X size={11} weight="bold" />
                </button>
              </span>
            </div>
          ))}
          {roleIds.map(id => (
            <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Setor</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999, fontSize: 12,
                background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)',
                color: 'var(--color-app-secondary)',
              }}>
                {(rolesData ?? []).find(r => String(r.id) === id)?.name ?? 'Setor'}
                <button onClick={() => setRoleIds(roleIds.filter(r => r !== id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
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
            values={statusFilters}
            onChange={setStatusFilters}
            options={[
              { label: 'Ativos', value: '1' },
              { label: 'Inativos', value: '0' },
            ]}
            placeholder="Todos"
            noCheckbox
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <MultiFilterSelect
            label="Setor"
            values={roleIds}
            onChange={setRoleIds}
            options={(rolesData ?? []).map(r => ({ label: r.name, value: String(r.id) }))}
            placeholder="Todos os setores"
            noCheckbox
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
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
            <div style={{
              width: 20, height: 20, borderRadius: 4,
              border: `1px solid ${allSelected ? 'var(--color-app-secondary)' : 'rgba(230,194,132,0.4)'}`,
              background: allSelected ? 'rgba(230,194,132,0.3)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {allSelected && (
                <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5L4.5 9L10 3" stroke="var(--color-app-secondary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
          {[
            { label: 'Colaborador', align: 'left' },
            { label: 'Setor', align: 'center' },
            { label: 'Status', align: 'center' },
            { label: 'Ação', align: 'center' },
          ].map(({ label, align }) => (
            <span key={label} style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textAlign: align as any }}>{label}</span>
          ))}
        </div>

        {/* Rows */}
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'var(--color-app-primary)', borderRadius: '0 0 12px 12px' }}>
            Carregando...
          </div>
        ) : collaborators.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'var(--color-app-primary)', borderRadius: '0 0 12px 12px' }}>
            Nenhum colaborador encontrado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {collaborators.map((c) => (
            <div key={c.id} style={{ position: 'relative' }}>
              {currentUser?.id === c.id && (
                <span style={{
                  position: 'absolute', top: -10, left: 16, zIndex: 1,
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: 'var(--color-app-bg)', color: 'var(--color-app-accent)',
                  border: '1px solid rgba(106,166,193,0.5)',
                }}>
                  Você
                </span>
              )}
              <div
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
                  opacity: selected.includes(c.id) ? 1 : 0,
                  clipPath: selected.includes(c.id) ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
                }} />
              <button
                onClick={() => toggleOne(c.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: `1px solid ${selected.includes(c.id) ? 'var(--color-app-secondary)' : 'rgba(230,194,132,0.4)'}`,
                  background: selected.includes(c.id) ? 'rgba(230,194,132,0.3)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selected.includes(c.id) && (
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5L4.5 9L10 3" stroke="var(--color-app-secondary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Name + email + avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={c.name} avatar={c.avatar} size={34} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 500, color: '#fff', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.email}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                  {c.role?.name ?? <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Sem setor</span>}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}><StatusBadge active={c.active} /></div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ActionMenu
                  collaborator={c}
                  onEdit={openEdit}
                  onDelete={(col) => setDeleteTarget(col)}
                  onToggleStatus={(col) => toggleStatusMutation.mutate(col)}
                  onResetPassword={(col) => setResetPasswordTarget(col)}
                  onHistory={(col) => setHistoryTarget(col)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              </div>
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
        ) : collaborators.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Nenhum colaborador encontrado.</div>
        ) : (
          collaborators.map((c) => (
            <div key={c.id} style={{ position: 'relative' }}>
              {currentUser?.id === c.id && (
                <span style={{
                  position: 'absolute', top: -10, left: 12, zIndex: 1,
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: 'var(--color-app-bg)', color: 'var(--color-app-accent)',
                  border: '1px solid rgba(106,166,193,0.5)',
                }}>
                  Você
                </span>
              )}
            <ListCard
              columns="44px minmax(0, 140px) auto auto"
              isSelected={selected.includes(c.id)}
              onSelect={() => toggleOne(c.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Avatar name={c.name} avatar={c.avatar} size={26} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 500, color: '#fff', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </p>
                  {c.role && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.role.name}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                  background: c.active ? '#16a34a' : '#dc2626',
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ActionMenu
                  collaborator={c}
                  onEdit={openEdit}
                  onDelete={(col) => setDeleteTarget(col)}
                  onToggleStatus={(col) => toggleStatusMutation.mutate(col)}
                  onResetPassword={(col) => setResetPasswordTarget(col)}
                  onHistory={(col) => setHistoryTarget(col)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              </div>
            </ListCard>
            </div>
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
          {selected.length} {selected.length === 1 ? 'colaborador selecionado' : 'colaboradores selecionados'}
        </span>

        {/* Área de ações */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canDelete && (
              <button
                onClick={() => setShowBulkDelete(true)}
                title="Excluir selecionados"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}
              >
                <TrashSimple size={15} weight="bold" />
                Excluir
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => handleBulkToggle(bulkToggleActive)}
                disabled={bulkToggling}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: bulkToggleActive ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.6)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', fontSize: 13, fontWeight: 500,
                  opacity: bulkToggling ? 0.5 : 1,
                }}
              >
                {bulkToggleActive ? <ToggleRight size={15} weight="bold" /> : <ToggleLeft size={15} weight="bold" />}
                {bulkToggleActive ? 'Ativar' : 'Inativar'}
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
          itemLabel="colaborador"
        />
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(undefined)} title="Excluir Colaborador">
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

      {/* Bulk delete confirmation */}
      <Modal isOpen={showBulkDelete} onClose={() => setShowBulkDelete(false)} title="Excluir colaboradores">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
              Tem certeza que deseja excluir{' '}
              {selected.length === 1
                ? <><strong style={{ color: '#fff' }}>{collaborators.find(c => c.id === selected[0])?.name}</strong></>
                : <>os <strong style={{ color: '#fff' }}>{selected.length} colaboradores</strong></>
              }{' '}
              abaixo? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
              {collaborators.filter(c => selected.includes(c.id)).map(c => (
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

      {/* Modals */}
      {showForm && (
        <CollaboratorFormModal
          collaborator={editingCollaborator}
          onClose={() => { setShowForm(false); setEditingCollaborator(undefined) }}
          onSaved={handleSaved}
        />
      )}
      {resetPasswordTarget && (
        <ResetPasswordModal
          collaborator={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(undefined)}
        />
      )}
      {historyTarget && (
        <EntityHistoryModal
          isOpen
          onClose={() => setHistoryTarget(undefined)}
          module="collaborators"
          entityId={historyTarget.id}
          entityName={historyTarget.name}
        />
      )}
    </div>
  )
}
