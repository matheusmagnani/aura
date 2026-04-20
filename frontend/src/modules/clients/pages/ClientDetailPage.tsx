import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, PencilSimple, Trash, Phone, Envelope, IdentificationCard, ClockCounterClockwise, CalendarPlus } from '@phosphor-icons/react'
import { clientService } from '../../../shared/services/clientService'
import { ClientFormModal } from '../components/ClientFormModal'
import { AppointmentModal } from '../../schedule/components/AppointmentModal'
import { CopyText } from '../../../shared/components/CopyText'
import { Modal } from '../../../shared/components/Modal'
import { EntityHistoryModal } from '../../../shared/components/EntityHistoryModal'
import { useCanAccess } from '../../../shared/hooks/useMyPermissions'
import { StatusDot } from '../../../shared/components/StatusDot'
import { useToast } from '../../../shared/hooks/useToast'
import { formatPhone, formatZipCode, formatCPF, formatCNPJ } from '../../../shared/utils/formatters'

const MODULE = 'clients'

function StatusBadge({ name, color }: { name: string; color: string }) {
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
      {name}
    </span>
  )
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 4 }}>{label}</span>
      {children}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-app-primary)',
  borderRadius: 12,
  border: '1px solid rgba(106,166,193,0.25)',
  padding: '24px',
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const canEdit = useCanAccess(MODULE, 'edit')
  const canDelete = useCanAccess(MODULE, 'delete')
  const canSchedule = useCanAccess('schedule', 'create')

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', Number(id)],
    queryFn: () => clientService.getById(Number(id)),
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: () => clientService.delete(Number(id)),
    onSuccess: () => {
      addToast('Cliente excluído!', 'success')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      navigate('/clients')
    },
    onError: () => {
      addToast('Erro ao excluir cliente', 'danger')
      setIsDeleteConfirm(false)
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Carregando...</span>
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Cliente não encontrado</span>
        <button
          onClick={() => navigate('/clients')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-app-accent)', fontSize: 14, textDecoration: 'underline' }}
        >
          Voltar para listagem
        </button>
      </div>
    )
  }

  const hasAddress = client.address || client.city || client.neighborhood || client.zipCode

  const fullAddress = [
    client.address && `${client.address}${client.addressNumber ? `, ${client.addressNumber}` : ''}`,
    client.neighborhood,
    client.city && client.state ? `${client.city}/${client.state}` : (client.city || client.state),
    client.zipCode && formatZipCode(client.zipCode),
  ].filter(Boolean).join(', ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
        <button
          onClick={() => navigate('/clients')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: 8, color: '#fff', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <ArrowLeft size={20} weight="bold" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIsHistoryOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1px solid rgba(106,166,193,0.25)', borderRadius: 8, cursor: 'pointer', color: 'var(--color-app-accent)', fontSize: 13 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(106,166,193,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <ClockCounterClockwise size={16} />
            <span className="hidden md:inline">Histórico</span>
          </button>
          {canSchedule && (
            <button
              onClick={() => setIsScheduleOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <CalendarPlus size={16} />
              <span className="hidden md:inline">Agendar</span>
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setIsDeleteConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, cursor: 'pointer', color: '#f87171', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Trash size={16} />
              <span className="hidden md:inline">Excluir</span>
            </button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="!pt-10 md:!pt-10" style={{ ...cardStyle, position: 'relative' }}>
        <span style={{ position: 'absolute', top: 10, left: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>
          Cadastrado em {new Date(client.createdAt).toLocaleDateString('pt-BR')}
        </span>
        {/* Name + status + edit */}
        <div className="mt-5 md:mt-0" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: '#fff', margin: 0 }}>{client.name}</h1>
              {client.clientStatus && (
                <span className="hidden md:inline-flex">
                  <StatusBadge name={client.clientStatus.name} color={client.clientStatus.color} />
                </span>
              )}
              <span className="md:hidden">
                <StatusDot name={client.clientStatus?.name} color={client.clientStatus?.color} />
              </span>
            </div>
            {client.user && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Colaborador <span style={{ color: 'rgba(255,255,255,0.65)' }}>{client.user.name}</span>
              </span>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => setIsEditOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1px solid rgba(106,166,193,0.35)', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 13, flexShrink: 0, marginLeft: 'auto', marginTop: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(106,166,193,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <PencilSimple size={15} />
              Editar
            </button>
          )}
        </div>

        {/* Divider + Contatos */}
        <div style={{ borderTop: '1px solid rgba(106,166,193,0.15)', paddingTop: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 40px' }}>
          <InfoItem label="Telefone">
            <CopyText value={client.phone}>
              <span style={{ fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={14} />
                {formatPhone(client.phone)}
              </span>
            </CopyText>
          </InfoItem>

          {client.email && (
            <InfoItem label="E-mail">
              <CopyText value={client.email}>
                <span style={{ fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Envelope size={14} />
                  {client.email}
                </span>
              </CopyText>
            </InfoItem>
          )}

          {client.document && (
            <InfoItem label={client.documentType ?? 'Documento'}>
              <CopyText value={client.document}>
                <span style={{ fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IdentificationCard size={14} />
                  {client.documentType === 'CNPJ' ? formatCNPJ(client.document) : formatCPF(client.document)}
                </span>
              </CopyText>
            </InfoItem>
          )}

          </div>
        </div>

        {/* Address section — same card, separated by divider */}
        {hasAddress && (
          <div style={{ borderTop: '1px solid rgba(106,166,193,0.15)', marginTop: 20, paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(106,166,193,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Endereço</span>
              {fullAddress && <CopyText value={fullAddress}><span /></CopyText>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 20 }}>
              {client.zipCode && (
                <InfoItem label="CEP">
                  <span style={{ fontSize: 14, color: '#fff' }}>{formatZipCode(client.zipCode)}</span>
                </InfoItem>
              )}
              {client.address && (
                <InfoItem label="Logradouro">
                  <span style={{ fontSize: 14, color: '#fff' }}>
                    {client.address}{client.addressNumber ? `, ${client.addressNumber}` : ''}
                  </span>
                </InfoItem>
              )}
              {client.addressComplement && (
                <InfoItem label="Complemento">
                  <span style={{ fontSize: 14, color: '#fff' }}>{client.addressComplement}</span>
                </InfoItem>
              )}
              {client.neighborhood && (
                <InfoItem label="Bairro">
                  <span style={{ fontSize: 14, color: '#fff' }}>{client.neighborhood}</span>
                </InfoItem>
              )}
              {(client.city || client.state) && (
                <InfoItem label="Cidade / UF">
                  <span style={{ fontSize: 14, color: '#fff' }}>
                    {[client.city, client.state].filter(Boolean).join(' / ')}
                  </span>
                </InfoItem>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <ClientFormModal
          client={client}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => {
            setIsEditOpen(false)
            queryClient.invalidateQueries({ queryKey: ['client', Number(id)] })
            queryClient.invalidateQueries({ queryKey: ['clients'] })
          }}
        />
      )}

      {/* History Modal */}
      <EntityHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        module="clients"
        entityId={Number(id)}
        entityName={client.name}
      />

      {/* Schedule Modal */}
      {isScheduleOpen && (
        <AppointmentModal
          prefilledClient={{ id: client.id, name: client.name }}
          onClose={() => setIsScheduleOpen(false)}
          onSaved={() => setIsScheduleOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteConfirm} onClose={() => setIsDeleteConfirm(false)} title="Excluir Cliente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Tem certeza que deseja excluir{' '}
            <strong style={{ color: '#fff' }}>{client.name}</strong>?
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
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={{ padding: '8px 20px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, cursor: 'pointer', color: '#f87171', fontSize: 14, fontWeight: 500, opacity: deleteMutation.isPending ? 0.6 : 1 }}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
