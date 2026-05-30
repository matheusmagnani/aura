import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FileText, Plus, PencilSimple, Trash, List, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SettingsSection } from './SettingsSection'
import { ContractStudio } from '../../../shared/components/contract-studio/ContractStudio'
import { ContractPreview } from '../../../shared/components/contract-studio/ContractPreview'
import { useToast } from '../../../shared/hooks/useToast'
import { getApiError } from '../../../shared/utils/getApiError'
import {
  useContractTemplates,
  useCreateContractTemplate,
  useUpdateContractTemplate,
  useDeleteContractTemplate,
} from '../hooks/useContractTemplates'
import type { ContractTemplate } from '../../../shared/services/contractTemplateService'

export function ContractsSection({
  isExpanded: isExpandedProp,
  onToggle: onToggleProp,
}: {
  isExpanded?: boolean
  onToggle?: () => void
} = {}) {
  const [isExpandedInternal, setIsExpandedInternal] = useState(false)
  const isExpanded = isExpandedProp !== undefined ? isExpandedProp : isExpandedInternal
  const handleToggle = onToggleProp ?? (() => setIsExpandedInternal((v) => !v))

  const [studioOpen, setStudioOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [templatePage, setTemplatePage] = useState(0)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number; openUp: boolean }>({ top: 0, right: 0, openUp: false })
  const menuRef = useRef<HTMLDivElement>(null)

  const { addToast } = useToast()
  const { data: templates = [], isLoading } = useContractTemplates()
  const createMutation = useCreateContractTemplate()
  const updateMutation = useUpdateContractTemplate()
  const deleteMutation = useDeleteContractTemplate()

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

  function openCreate() {
    setEditingTemplate(null)
    setStudioOpen(true)
  }

  function openEdit(template: ContractTemplate) {
    setEditingTemplate(template)
    setOpenMenuId(null)
    setStudioOpen(true)
  }

  function handleMenuOpen(id: number, btn: HTMLButtonElement) {
    if (openMenuId === id) { setOpenMenuId(null); return }
    const rect = btn.getBoundingClientRect()
    const openUp = window.innerHeight - rect.bottom < 80
    setMenuPos({ top: openUp ? rect.top : rect.bottom + 4, right: window.innerWidth - rect.right, openUp })
    setOpenMenuId(id)
    setDeleteConfirmId(null)
  }

  async function handleStudioSave(name: string, content: Record<string, unknown>) {
    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({ id: editingTemplate.id, name, content })
        addToast('Modelo atualizado!', 'success')
      } else {
        await createMutation.mutateAsync({ name, content })
        addToast('Modelo criado!', 'success')
      }
    } catch (err: any) {
      addToast(getApiError(err), 'danger')
      throw err
    }
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        addToast('Modelo excluído!', 'success')
        setOpenMenuId(null)
        setDeleteConfirmId(null)
      },
      onError: (err: any) => addToast(getApiError(err), 'danger'),
    })
  }

  return (
    <>
      <SettingsSection
        title="Modelos de Contrato"
        description="Crie e gerencie os modelos de contrato da empresa"
        icon={<FileText size={20} weight="fill" />}
        isExpanded={isExpanded}
        onToggle={handleToggle}
        actions={
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (!isExpanded) handleToggle()
              openCreate()
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: 'none', color: 'var(--color-app-accent)',
            }}
          >
            <Plus size={16} weight="bold" />
            Novo Modelo
          </button>
        }
      >
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div style={{ width: 32, height: 32, border: '2px solid rgba(106,166,193,0.3)', borderTopColor: 'var(--color-app-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(106,166,193,0.5)' }}>
            <FileText size={48} weight="light" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p>Nenhum modelo cadastrado</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Clique em "Novo Modelo" para criar o primeiro</p>
          </div>
        ) : (() => {
          const total = Math.max(1, templates.length)
          const safeIdx = Math.min(templatePage, total - 1)

          const templateCard = (t: ContractTemplate) => (
            <div
              key={t.id}
              style={{
                borderRadius: 12,
                border: '1px solid rgba(106,166,193,0.2)',
                background: 'rgba(255,255,255,0.02)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div style={{ padding: '10px 10px 0' }}>
                <ContractPreview content={t.content} />
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-app-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-app-gray)', margin: '2px 0 0' }}>
                    {format(parseISO(t.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={(e) => handleMenuOpen(t.id, e.currentTarget)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(230,194,132,0.7)' }}
                  >
                    <List size={18} weight="bold" />
                  </button>
                  {openMenuId === t.id && createPortal(
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
                        onClick={() => openEdit(t)}
                        style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}
                      >
                        <PencilSimple size={16} /> Editar
                      </button>
                      {deleteConfirmId === t.id ? (
                        <div style={{ display: 'flex', gap: 8, padding: '8px 12px' }}>
                          <button
                            onClick={() => handleDelete(t.id)}
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
                          onClick={() => setDeleteConfirmId(t.id)}
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
            </div>
          )

          return (
            <>
              {/* Mobile — carousel horizontal */}
              <div className="md:hidden">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setTemplatePage(p => Math.max(0, p - 1))}
                    disabled={safeIdx === 0}
                    style={{ background: 'none', border: 'none', cursor: safeIdx === 0 ? 'default' : 'pointer', padding: 4, color: '#fff', opacity: safeIdx === 0 ? 0.15 : 0.35, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  >
                    <CaretLeft size={18} weight="bold" />
                  </button>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', transform: `translateX(-${safeIdx * 100}%)`, transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
                      {templates.map((t) => (
                        <div key={t.id} style={{ minWidth: '100%' }}>
                          {templateCard(t)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setTemplatePage(p => Math.min(total - 1, p + 1))}
                    disabled={safeIdx === total - 1}
                    style={{ background: 'none', border: 'none', cursor: safeIdx === total - 1 ? 'default' : 'pointer', padding: 4, color: '#fff', opacity: safeIdx === total - 1 ? 0.15 : 0.35, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  >
                    <CaretRight size={18} weight="bold" />
                  </button>
                </div>
                {total > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                    {Array.from({ length: total }).map((_, i) => (
                      <button key={i} onClick={() => setTemplatePage(i)} style={{ width: i === safeIdx ? 16 : 6, height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: i === safeIdx ? 'var(--color-app-accent)' : 'rgba(255,255,255,0.2)', transition: 'width 0.2s, background 0.2s' }} />
                    ))}
                  </div>
                )}
              </div>
              </div>

              {/* Desktop — grid */}
              <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '4px 0 8px' }}>
                {templates.map((t) => templateCard(t))}
              </div>
            </>
          )
        })()}
      </SettingsSection>

      <ContractStudio
        isOpen={studioOpen}
        template={editingTemplate}
        onClose={() => setStudioOpen(false)}
        onSave={handleStudioSave}
      />
    </>
  )
}
