import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Tag, Plus, PencilSimple, Trash, List } from '@phosphor-icons/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../../shared/components/Modal'
import { SettingsSection } from './SettingsSection'
import { clientStatusService, type ClientStatus } from '../../../shared/services/clientStatusService'
import { useToast } from '../../../shared/hooks/useToast'

const DEFAULT_COLOR = '#6AA6C1'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

export function ClientStatusSection({ isExpanded: isExpandedProp, onToggle: onToggleProp }: { isExpanded?: boolean; onToggle?: () => void } = {}) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(false)
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : isExpandedInternal
  const handleToggle = onToggleProp ?? (() => setIsExpandedInternal(v => !v))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState<ClientStatus | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [nameError, setNameError] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number; openUp: boolean }>({ top: 0, right: 0, openUp: false })
  const menuRef = useRef<HTMLDivElement>(null)

  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['client-statuses'],
    queryFn: clientStatusService.list,
  })

  const createMutation = useMutation({
    mutationFn: () => clientStatusService.create({ name: name.trim(), color }),
    onSuccess: () => {
      addToast('Status criado!', 'success')
      queryClient.invalidateQueries({ queryKey: ['client-statuses'] })
      closeModal()
    },
    onError: (err: any) => addToast(err?.response?.data?.message || 'Erro ao criar status', 'danger'),
  })

  const updateMutation = useMutation({
    mutationFn: () => clientStatusService.update(editingStatus!.id, { name: name.trim(), color }),
    onSuccess: () => {
      addToast('Status atualizado!', 'success')
      queryClient.invalidateQueries({ queryKey: ['client-statuses'] })
      closeModal()
    },
    onError: (err: any) => addToast(err?.response?.data?.message || 'Erro ao atualizar status', 'danger'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientStatusService.delete(id),
    onSuccess: () => {
      addToast('Status excluído!', 'success')
      queryClient.invalidateQueries({ queryKey: ['client-statuses'] })
      setDeleteConfirmId(null)
      setOpenMenuId(null)
    },
    onError: (err: any) => addToast(err?.response?.data?.message || 'Erro ao excluir', 'danger'),
  })

  const handleOpenMenu = (id: number, buttonEl: HTMLButtonElement) => {
    if (openMenuId === id) { setOpenMenuId(null); return }
    const rect = buttonEl.getBoundingClientRect()
    const cardEl = buttonEl.closest('[data-status-card]') as HTMLElement
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

  function openCreateModal() {
    setEditingStatus(null)
    setName('')
    setColor(DEFAULT_COLOR)
    setNameError('')
    setIsModalOpen(true)
  }

  function openEditModal(status: ClientStatus) {
    setEditingStatus(status)
    setName(status.name)
    setColor(status.color)
    setNameError('')
    setIsModalOpen(true)
    setOpenMenuId(null)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingStatus(null)
    setName('')
    setColor(DEFAULT_COLOR)
    setNameError('')
  }

  function handleSave() {
    if (!name.trim()) { setNameError('Nome é obrigatório'); addToast('Preencha os campos obrigatórios corretamente.', 'danger'); return }
    if (editingStatus) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <SettingsSection
        title="Status de Clientes"
        description="Personalize os status disponíveis para seus clientes"
        icon={<Tag size={20} weight="fill" />}
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
            Novo Status
          </button>
        }
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '2px solid rgba(106,166,193,0.3)', borderTopColor: 'var(--color-app-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : statuses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(106,166,193,0.5)' }}>
            <Tag size={48} weight="light" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p>Nenhum status cadastrado</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Clique em "Novo Status" para adicionar o primeiro</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
            {statuses.map(s => (
              <div
                key={s.id}
                data-status-card=""
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, borderRadius: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(106,166,193,0.15)',
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                  background: `${s.color}22`, border: `1px solid ${s.color}55`, color: s.color,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  {s.name}
                </span>

                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => handleOpenMenu(s.id, e.currentTarget)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'rgba(230,194,132,0.7)' }}
                  >
                    <List size={22} weight="bold" />
                  </button>

                  {openMenuId === s.id && createPortal(
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
                        onClick={() => openEditModal(s)}
                        style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}
                      >
                        <PencilSimple size={16} /> Editar
                      </button>
                      {deleteConfirmId === s.id ? (
                        <div style={{ display: 'flex', gap: 8, padding: '8px 12px' }}>
                          <button
                            onClick={() => deleteMutation.mutate(s.id)}
                            disabled={deleteMutation.isPending}
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
                          onClick={() => setDeleteConfirmId(s.id)}
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

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStatus ? 'Editar Status' : 'Novo Status'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Color picker */}
          <div>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{
                  display: 'block', width: 40, height: 40,
                  borderRadius: '50%', background: color,
                  border: '3px solid rgba(255,255,255,0.15)',
                  boxShadow: `0 0 0 2px ${color}55`,
                  transition: 'box-shadow 0.2s',
                }} />
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
              </label>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{color.toUpperCase()}</span>
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 4 }}>Nome *</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); if (nameError) setNameError('') }}
              placeholder="Ex: Em andamento, Aguardando, Concluído..."
              style={{ ...inputStyle, borderColor: nameError ? '#f87171' : 'rgba(255,255,255,0.15)' }}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              autoFocus
            />
            {nameError && <p style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{nameError}</p>}
          </div>

          {/* Preview */}
          {name.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Prévia:</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 500,
                background: `${color}22`, border: `1px solid ${color}55`, color,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                {name.trim()}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={closeModal}
              style={{ padding: '8px 20px', background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, color: 'var(--color-app-primary)', fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: isSaving ? 0.6 : 1 }}
            >
              {isSaving ? 'Salvando...' : editingStatus ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
