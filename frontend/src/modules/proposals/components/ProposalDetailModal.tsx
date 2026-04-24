import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PencilSimple, Trash, User, UserCircle, AlignLeft, CurrencyCircleDollar, CalendarBlank, ChatText, Tag } from '@phosphor-icons/react'
import { Modal } from '../../../shared/components/Modal'
import { proposalService, type Proposal } from '../../../shared/services/proposalService'
import { useToast } from '../../../shared/hooks/useToast'
import { formatCurrency } from '../../../shared/utils/formatters'

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

interface ProposalDetailModalProps {
  proposal: Proposal
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
  canEdit?: boolean
  canDelete?: boolean
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ color: 'var(--color-app-accent)', marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-app-gray)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'white' }}>{children}</div>
      </div>
    </div>
  )
}

export function ProposalDetailModal({
  proposal,
  onClose,
  onEdit,
  onDeleted,
  canEdit,
  canDelete,
}: ProposalDetailModalProps) {
  const { addToast } = useToast()
  const [deleting, setDeleting] = useState(false)
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false)

  const color = STATUS_COLORS[proposal.status] ?? '#8A919C'
  const label = STATUS_LABELS[proposal.status] ?? proposal.status
  const statusDate = proposal.statusChangedAt
    ? format(parseISO(proposal.statusChangedAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : format(parseISO(proposal.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })

  async function handleDelete() {
    setDeleting(true)
    try {
      await proposalService.delete(proposal.id)
      addToast('Proposta excluída!', 'success')
      onDeleted()
      onClose()
    } catch (err: any) {
      addToast(err?.response?.data?.message ?? 'Erro ao excluir proposta', 'danger')
      setIsDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Modal isOpen onClose={onClose} title="Detalhes da Proposta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <DetailRow icon={<User size={16} />} label="Cliente">
              {proposal.client.name}
            </DetailRow>

            <DetailRow icon={<CurrencyCircleDollar size={16} />} label="Valor">
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-app-secondary)' }}>
                {formatCurrency(Number(proposal.value))}
              </span>
            </DetailRow>

            <DetailRow icon={<Tag size={16} />} label="Status">
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '2px 10px', borderRadius: 999, fontSize: 13,
                background: `${color}22`, border: `1px solid ${color}55`, color,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}
              </span>
            </DetailRow>

            {proposal.collaborator && (
              <DetailRow icon={<UserCircle size={16} />} label="Colaborador responsável">
                {proposal.collaborator.name}
              </DetailRow>
            )}

            {proposal.description && (
              <DetailRow icon={<AlignLeft size={16} />} label="Descrição">
                {proposal.description}
              </DetailRow>
            )}

            {proposal.clientObservation && (
              <DetailRow icon={<ChatText size={16} />} label="Observação do cliente">
                {proposal.clientObservation}
              </DetailRow>
            )}

            <DetailRow icon={<CalendarBlank size={16} />} label={`Status "${STATUS_LABELS[proposal.status] ?? proposal.status}" desde`}>
              {statusDate}
            </DetailRow>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
            {canDelete ? (
              <button
                type="button"
                onClick={() => setIsDeleteConfirm(true)}
                style={{
                  padding: '8px 16px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Trash size={15} />
                Excluir
              </button>
            ) : <div />}

            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                style={{
                  padding: '8px 20px', borderRadius: 10,
                  background: 'var(--color-app-accent)', border: 'none',
                  color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <PencilSimple size={15} weight="bold" />
                Editar
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDeleteConfirm} onClose={() => setIsDeleteConfirm(false)} title="Excluir Proposta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Tem certeza que deseja excluir a proposta de{' '}
            <strong style={{ color: '#fff' }}>{proposal.client.name}</strong>?
            <br />Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={() => setIsDeleteConfirm(false)}
              style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, borderRadius: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: '8px 20px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, cursor: 'pointer', color: '#f87171', fontSize: 14, fontWeight: 500, opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
