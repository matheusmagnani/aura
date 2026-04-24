import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { UserGear, Plus, PencilSimple, Trash, ToggleLeft, ToggleRight, List } from '@phosphor-icons/react'
import { Input } from '../../../shared/components/ui/Input'
import { Modal } from '../../../shared/components/Modal'
import { SettingsSection } from './SettingsSection'
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '../hooks/useRoles'
import { useToast } from '../../../shared/hooks/useToast'
import type { Role } from '../../../shared/services/roleService'

export function RolesSection({ isExpanded: isExpandedProp, onToggle: onToggleProp }: { isExpanded?: boolean; onToggle?: () => void } = {}) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(false)
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : isExpandedInternal
  const handleToggle = onToggleProp ?? (() => setIsExpandedInternal(v => !v))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleName, setRoleName] = useState('')
  const [nameError, setNameError] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number; openUp: boolean }>({ top: 0, right: 0, openUp: false })
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: rolesData, isLoading } = useRoles()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()
  const { addToast } = useToast()

  const roles = rolesData?.data ?? []

  const handleOpenMenu = (id: number, buttonEl: HTMLButtonElement) => {
    if (openMenuId === id) { setOpenMenuId(null); return }
    const rect = buttonEl.getBoundingClientRect()
    const cardEl = buttonEl.closest('[data-role-card]') as HTMLElement
    const cardRect = cardEl ? cardEl.getBoundingClientRect() : rect
    const openUp = window.innerHeight - cardRect.bottom < 70
    setMenuPos({ top: openUp ? cardRect.top : cardRect.bottom + 4, right: window.innerWidth - cardRect.right, openUp })
    setOpenMenuId(id)
    setDeleteConfirmId(null)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
        setDeleteConfirmId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openCreateModal = () => {
    setEditingRole(null)
    setRoleName('')
    setNameError('')
    setIsModalOpen(true)
  }

  const openEditModal = (role: Role) => {
    setEditingRole(role)
    setRoleName(role.name)
    setNameError('')
    setIsModalOpen(true)
    setOpenMenuId(null)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRole(null)
    setRoleName('')
    setNameError('')
  }

  const handleSave = async () => {
    if (!roleName.trim()) { setNameError('Nome do setor é obrigatório'); addToast('Preencha os campos obrigatórios corretamente.', 'danger'); return }
    if (roleName.trim().length < 2) { setNameError('Nome deve ter pelo menos 2 caracteres'); addToast('Preencha os campos obrigatórios corretamente.', 'danger'); return }
    try {
      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole.id, data: { name: roleName.trim() } })
        addToast('Setor atualizado com sucesso!', 'success')
      } else {
        await createRole.mutateAsync({ name: roleName.trim() })
        addToast('Setor criado com sucesso!', 'success')
      }
      closeModal()
    } catch {
      addToast(editingRole ? 'Erro ao atualizar setor' : 'Erro ao criar setor', 'danger')
    }
  }

  const handleToggleStatus = async (role: Role) => {
    const newStatus = role.status === 1 ? 0 : 1
    try {
      await updateRole.mutateAsync({ id: role.id, data: { status: newStatus } })
      addToast(newStatus === 1 ? 'Setor ativado!' : 'Setor inativado!', 'success')
      setOpenMenuId(null)
    } catch {
      addToast('Erro ao alterar status do setor', 'danger')
      setOpenMenuId(null)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteRole.mutateAsync(id)
      addToast('Setor excluído com sucesso!', 'success')
      setDeleteConfirmId(null)
      setOpenMenuId(null)
    } catch {
      addToast('Erro ao excluir setor. Verifique se não há colaboradores vinculados.', 'danger')
      setDeleteConfirmId(null)
      setOpenMenuId(null)
    }
  }

  const isSaving = createRole.isPending || updateRole.isPending

  return (
    <>
      <SettingsSection
        title="Setores"
        description="Gerencie os setores da empresa"
        icon={<UserGear size={20} weight="fill" />}
        isExpanded={isExpanded}
        onToggle={handleToggle}
        actions={
          <button
            onClick={(e) => { e.stopPropagation(); if (!isExpanded) handleToggle(); openCreateModal() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: 'none', color: 'var(--color-app-accent)',
            }}
          >
            <Plus size={16} weight="bold" />
            Novo Setor
          </button>
        }
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '2px solid rgba(106,166,193,0.3)', borderTopColor: 'var(--color-app-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : roles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(106,166,193,0.5)' }}>
            <UserGear size={48} weight="light" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p>Nenhum setor cadastrado</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Clique em "Novo Setor" para adicionar o primeiro</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
            {roles.map((role) => (
              <div
                key={role.id}
                data-role-card=""
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(106,166,193,0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-app-accent)' }}>{role.name}</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                    background: role.status === 1 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                    color: role.status === 1 ? '#4ade80' : '#f87171',
                  }}>
                    {role.status === 1 ? 'Ativo' : 'Inativo'}
                  </span>
                  {role._count && role._count.users > 0 && (
                    <span className="desktop-table" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'none' }}>
                      {role._count.users} {role._count.users === 1 ? 'colaborador' : 'colaboradores'}
                    </span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => handleOpenMenu(role.id, e.currentTarget)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'rgba(230,194,132,0.7)' }}
                  >
                    <List size={22} weight="bold" />
                  </button>

                  {openMenuId === role.id && createPortal(
                    <div
                      ref={menuRef}
                      style={{
                        position: 'fixed', zIndex: 9999,
                        top: menuPos.top, right: menuPos.right,
                        transform: menuPos.openUp ? 'translateY(-100%)' : 'none',
                        background: 'var(--color-app-primary)',
                        border: '1px solid rgba(230,194,132,0.2)',
                        borderRadius: 10, minWidth: 160,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => handleToggleStatus(role)}
                        style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: role.status === 1 ? 'rgba(255,255,255,0.8)' : '#4ade80' }}
                      >
                        {role.status === 1
                          ? <><ToggleLeft size={20} />Inativar</>
                          : <><ToggleRight size={20} style={{ color: '#4ade80' }} />Ativar</>
                        }
                      </button>
                      <button
                        onClick={() => openEditModal(role)}
                        style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}
                      >
                        <PencilSimple size={16} /> Editar
                      </button>
                      {deleteConfirmId === role.id ? (
                        <div style={{ display: 'flex', gap: 8, padding: '8px 12px' }}>
                          <button
                            onClick={() => handleDelete(role.id)}
                            disabled={deleteRole.isPending}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'rgba(248,113,113,0.2)', color: '#f87171' }}
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(role.id)}
                          style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#f87171' }}
                        >
                          <Trash size={16} /> Excluir
                        </button>
                      )}
                    </div>,
                    document.body
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingRole ? 'Editar Setor' : 'Novo Setor'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Nome do Setor"
            placeholder="Ex: Financeiro, Marketing, TI..."
            value={roleName}
            onChange={(e) => { setRoleName(e.target.value); if (nameError) setNameError('') }}
            error={nameError}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={closeModal} style={{ padding: '8px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={isSaving} style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, color: 'var(--color-app-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: isSaving ? 0.6 : 1 }}>
              {isSaving ? 'Salvando...' : editingRole ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
