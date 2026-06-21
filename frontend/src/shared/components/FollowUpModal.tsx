import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PaperPlaneTilt, Trash, ChatText } from '@phosphor-icons/react'
import { Modal } from './Modal'
import { followUpService, type FollowUp } from '../services/followUpService'
import { useToast } from '../hooks/useToast'
import { useCanAccess } from '../hooks/useMyPermissions'
import { useAuthStore } from '../stores/useAuthStore'

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface FollowUpModalProps {
  clientId: number
  clientName: string
  onClose: () => void
}

export function FollowUpModal({ clientId, clientName, onClose }: FollowUpModalProps) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const canCreate = useCanAccess('clients', 'create')
  const canDelete = useCanAccess('clients', 'delete')
  const [text, setText] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['follow-ups', clientId],
    queryFn: () => followUpService.list(clientId),
    staleTime: 0,
  })

  const followUps = data?.data ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [followUps.length])

  const createMutation = useMutation({
    mutationFn: (content: string) => followUpService.create(content, clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups', clientId] })
      setText('')
      textareaRef.current?.focus()
    },
    onError: (err: any) => addToast(err?.message || 'Erro ao adicionar follow up', 'danger'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => followUpService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups', clientId] })
      setDeletingId(null)
    },
    onError: (err: any) => addToast(err?.message || 'Erro ao excluir follow up', 'danger'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    createMutation.mutate(content)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Follow Up — ${clientName}`}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 480, minHeight: 0 }}>

        {/* Feed */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4, marginBottom: 16 }}>
          {isLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 28, height: 28, border: '2px solid rgba(106,166,193,0.3)', borderTopColor: 'var(--color-app-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : followUps.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.25)' }}>
              <ChatText size={40} weight="thin" />
              <span style={{ fontSize: 13 }}>Nenhum follow up ainda. Adicione o primeiro.</span>
            </div>
          ) : (
            followUps.map((fu: FollowUp) => {
              const isOwn = fu.userId === currentUser?.id
              const isDeleting = deletingId === fu.id
              return (
                <div
                  key={fu.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    position: 'relative',
                  }}
                >
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {fu.content}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: fu.userColor ?? 'var(--color-app-accent)' }}>{fu.userName}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>·</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{formatDateTime(fu.createdAt)}</span>
                    </div>
                    {canDelete && (isOwn || true) && (
                      isDeleting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Excluir?</span>
                          <button
                            onClick={() => deleteMutation.mutate(fu.id)}
                            disabled={deleteMutation.isPending}
                            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(248,113,113,0.2)', color: '#f87171', fontWeight: 500 }}
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(fu.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                        >
                          <Trash size={13} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {canCreate && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Adicione um follow up"
              rows={2}
              style={{
                flex: 1, resize: 'none',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '10px 12px',
                color: '#fff', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', lineHeight: 1.5,
              }}
            />
            <button
              type="submit"
              disabled={!text.trim() || createMutation.isPending}
              style={{
                flexShrink: 0, width: 40, height: 40,
                background: text.trim() ? 'var(--color-app-accent)' : 'rgba(255,255,255,0.06)',
                border: 'none', borderRadius: 10, cursor: text.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <PaperPlaneTilt size={18} weight="fill" color={text.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} />
            </button>
          </form>
        )}
      </div>
    </Modal>
  )
}
