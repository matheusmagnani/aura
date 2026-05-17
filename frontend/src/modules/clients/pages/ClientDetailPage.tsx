import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, PencilSimple, Trash, Phone, Envelope, IdentificationCard, ClockCounterClockwise, CalendarBlank, UserCircle, Plus, CaretLeft, CaretRight, FileText, CurrencyCircleDollar } from '@phosphor-icons/react'
import { clientService } from '../../../shared/services/clientService'
import { scheduleService, type Appointment } from '../../../shared/services/scheduleService'
import { proposalService, type Proposal } from '../../../shared/services/proposalService'
import { dashboardService } from '../../../shared/services/dashboardService'
import { ClientFormModal } from '../components/ClientFormModal'
import { AppointmentModal } from '../../schedule/components/AppointmentModal'
import { AppointmentDetailModal } from '../../schedule/components/AppointmentDetailModal'
import { ProposalModal } from '../../proposals/components/ProposalModal'
import { ProposalDetailModal } from '../../proposals/components/ProposalDetailModal'
import { CopyText } from '../../../shared/components/CopyText'
import { Modal } from '../../../shared/components/Modal'
import { EntityHistoryModal } from '../../../shared/components/EntityHistoryModal'
import { useCanAccess } from '../../../shared/hooks/useMyPermissions'
import { useAuthStore } from '../../../shared/stores/useAuthStore'
import { StatusDot } from '../../../shared/components/StatusDot'
import { useToast } from '../../../shared/hooks/useToast'
import { formatPhone, formatZipCode, formatCPF, formatCNPJ, formatCurrency } from '../../../shared/utils/formatters'
import { StatisticsStatusCards } from '../../../shared/components/StatisticsStatusCards'
import { PROPOSAL_COLORS, PROPOSAL_LABELS, PROPOSAL_STATUS_ORDER } from '../../../shared/constants/proposalStatus'

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
  padding: '24px 16px',
}

export function ClientDetailPage({ fromDashboard = false }: { fromDashboard?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const currentUserId = useAuthStore(s => s.user?.id)

  const _canEdit = useCanAccess(MODULE, 'edit')
  const _canDelete = useCanAccess(MODULE, 'delete')
  const _canSchedule = useCanAccess('schedule', 'create')
  const _canEditSchedule = useCanAccess('schedule', 'edit')
  const _canDeleteSchedule = useCanAccess('schedule', 'delete')
  const _canCreateProposal = useCanAccess('proposals', 'create')
  const _canEditProposal = useCanAccess('proposals', 'edit')
  const _canDeleteProposal = useCanAccess('proposals', 'delete')

  const canEdit = fromDashboard || _canEdit
  const canDelete = fromDashboard || _canDelete
  const canSchedule = fromDashboard || _canSchedule
  const canEditSchedule = fromDashboard || _canEditSchedule
  const canDeleteSchedule = fromDashboard || _canDeleteSchedule
  const canCreateProposal = fromDashboard || _canCreateProposal
  const canEditProposal = fromDashboard || _canEditProposal
  const canDeleteProposal = fromDashboard || _canDeleteProposal

  const backPath = fromDashboard ? '/dashboard' : '/clients'

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false)
  const [apptPage, setApptPage] = useState(0)
  const [isProposalOpen, setIsProposalOpen] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [isEditProposalOpen, setIsEditProposalOpen] = useState(false)
  const [activeProposalStatuses, setActiveProposalStatuses] = useState<string[]>([])
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)

  useEffect(() => {
    const update = () => setIsMobileView(window.innerWidth < 768)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', Number(id), fromDashboard],
    queryFn: () => fromDashboard
      ? dashboardService.getClientById(Number(id))
      : clientService.getById(Number(id)),
    enabled: !!id,
  })

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['client-appointments', Number(id), fromDashboard],
    queryFn: () => fromDashboard
      ? dashboardService.appointments({ clientId: Number(id), collaboratorId: currentUserId })
      : scheduleService.list({ clientId: Number(id) }),
    enabled: !!id,
  })

  const { data: proposalsData, isLoading: isLoadingProposals } = useQuery({
    queryKey: ['client-proposals', Number(id), fromDashboard],
    queryFn: () => fromDashboard
      ? dashboardService.proposals({ clientId: Number(id), collaboratorId: currentUserId, limit: 50 })
      : proposalService.list({ clientId: Number(id), limit: 50 }),
    enabled: !!id,
  })
  const proposals = proposalsData?.data ?? []

  const deleteMutation = useMutation({
    mutationFn: () => fromDashboard
      ? dashboardService.deleteClient(Number(id))
      : clientService.delete(Number(id)),
    onSuccess: () => {
      addToast('Cliente excluído!', 'success')
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      navigate(backPath)
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
          onClick={() => navigate(backPath)}
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
          onClick={() => navigate(-1)}
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

      {/* Appointments + Proposals — stacked on mobile, side by side on desktop */}
      <div className="flex flex-col md:flex-row gap-3 w-full">

      {/* Appointments card */}
      <div className="w-full md:w-fit" style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarBlank size={16} style={{ color: 'var(--color-app-accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(106,166,193,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Agendamentos</span>
            {!isLoadingAppointments && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>({appointments.length})</span>
            )}
          </div>
          {canSchedule && (
            <button
              onClick={() => setIsScheduleOpen(true)}
              style={{ background: 'var(--color-app-accent)', border: 'none', borderRadius: 8, width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Plus size={18} weight="bold" />
            </button>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {isLoadingAppointments ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</div>
          ) : appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Nenhum agendamento encontrado</div>
          ) : (() => {
            const CARD = 143
            const GAP = 10
            const PEEK = 40
            const isMobile = isMobileView
            const cardsPerView = isMobile ? 1 : 2
            const viewportWidth = isMobile ? CARD + GAP + PEEK : cardsPerView * CARD + (cardsPerView - 1) * GAP
            // total de posições de parada: cada bolinha avança 1 card
            const totalDots = Math.max(1, appointments.length - cardsPerView + 1)
            const safeIdx = Math.min(apptPage, totalDots - 1)

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <button
                    onClick={() => setApptPage(p => Math.max(0, p - 1))}
                    disabled={safeIdx === 0}
                    style={{ background: 'none', border: 'none', cursor: safeIdx === 0 ? 'default' : 'pointer', padding: 4, color: '#fff', opacity: safeIdx === 0 ? 0.15 : 0.35, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => { if (safeIdx > 0) e.currentTarget.style.opacity = '0.9' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = safeIdx === 0 ? '0.15' : '0.35' }}
                  >
                    <CaretLeft size={18} weight="bold" />
                  </button>

                  <div style={{ width: viewportWidth, overflow: 'hidden' }}>
                    <div style={{
                      display: 'flex', gap: GAP,
                      transform: `translateX(-${safeIdx * (CARD + GAP)}px)`,
                      transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                      {appointments.map((appt) => (
                        <button
                          key={appt.id}
                          onClick={() => setSelectedAppointment(appt)}
                          style={{
                            width: CARD, height: CARD, flexShrink: 0,
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            padding: 14, borderRadius: 10, border: '1px solid rgba(106,166,193,0.15)',
                            background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left',
                            overflow: 'hidden',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(106,166,193,0.07)'
                            e.currentTarget.style.borderColor = 'rgba(106,166,193,0.3)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                            e.currentTarget.style.borderColor = 'rgba(106,166,193,0.15)'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-app-secondary)', lineHeight: 1 }}>
                              {format(parseISO(appt.startAt), 'dd')}
                            </span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {format(parseISO(appt.startAt), 'MMM yyyy', { locale: ptBR })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {appt.title}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--color-app-accent)', fontWeight: 500 }}>
                              {format(parseISO(appt.startAt), 'HH:mm')}
                            </span>
                            {appt.collaborator && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                                <UserCircle size={11} />
                                <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{appt.collaborator.name}</span>
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setApptPage(p => Math.min(totalDots - 1, p + 1))}
                    disabled={safeIdx === totalDots - 1}
                    style={{ background: 'none', border: 'none', cursor: safeIdx === totalDots - 1 ? 'default' : 'pointer', padding: 4, color: '#fff', opacity: safeIdx === totalDots - 1 ? 0.15 : 0.35, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => { if (safeIdx < totalDots - 1) e.currentTarget.style.opacity = '0.9' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = safeIdx === totalDots - 1 ? '0.15' : '0.35' }}
                  >
                    <CaretRight size={18} weight="bold" />
                  </button>
                </div>

                {totalDots > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                    {Array.from({ length: totalDots }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setApptPage(i)}
                        style={{
                          width: i === safeIdx ? 16 : 6,
                          height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
                          background: i === safeIdx ? 'var(--color-app-accent)' : 'rgba(255,255,255,0.2)',
                          transition: 'width 0.2s, background 0.2s',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Proposals card */}
      <div className="w-full md:flex-1" style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: 'var(--color-app-accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(106,166,193,0.85)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Propostas</span>
            {!isLoadingProposals && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>({proposals.length})</span>
            )}
          </div>
          {canCreateProposal && (
            <button
              onClick={() => setIsProposalOpen(true)}
              style={{ background: 'var(--color-app-accent)', border: 'none', borderRadius: 8, width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Plus size={18} weight="bold" />
            </button>
          )}
        </div>

        {isLoadingProposals ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</div>
        ) : proposals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Nenhuma proposta encontrada</div>
        ) : (() => {
          const PROPOSAL_STATUS_COLORS = PROPOSAL_COLORS
          const PROPOSAL_STATUS_LABELS = PROPOSAL_LABELS

          const proposalStats = PROPOSAL_STATUS_ORDER
            .map(s => ({
              status: s as string,
              count: proposals.filter(p => p.status === s).length,
              totalValue: proposals.filter(p => p.status === s).reduce((sum, p) => sum + Number(p.value), 0),
            }))
            .filter(s => s.count > 0)

          return (
            <>
              {proposalStats.length > 0 && (
                <div style={{ marginBottom: 10, flexShrink: 0 }}>
                  {/* Mobile — igual à dashboard: grid, valor total */}
                  <div className="md:hidden">
                    <StatisticsStatusCards
                      items={proposalStats.map(s => ({
                        id: s.status,
                        label: PROPOSAL_LABELS[s.status],
                        color: PROPOSAL_COLORS[s.status],
                        primaryValue: formatCurrency(s.totalValue),
                        secondaryValue: `${s.count} prop.`,
                      }))}
                      activeIds={activeProposalStatuses}
                      onToggle={(id) => setActiveProposalStatuses(prev =>
                        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                      )}
                      compact
                    />
                  </div>
                  {/* Desktop — row compacto com valor em moeda */}
                  <div className="hidden md:block">
                    <StatisticsStatusCards
                      items={proposalStats.map(s => ({
                        id: s.status,
                        label: PROPOSAL_LABELS[s.status],
                        color: PROPOSAL_COLORS[s.status],
                        primaryValue: formatCurrency(s.totalValue),
                        secondaryValue: `${s.count} prop.`,
                      }))}
                      activeIds={activeProposalStatuses}
                      onToggle={(id) => setActiveProposalStatuses(prev =>
                        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                      )}
                      layout="row"
                      compact
                    />
                  </div>
                </div>
              )}
              <div className="md:max-h-32" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proposals.filter(p => activeProposalStatuses.length === 0 || activeProposalStatuses.includes(p.status)).map((proposal) => {
                  const pColor = PROPOSAL_STATUS_COLORS[proposal.status] ?? '#8A919C'
                  const pLabel = PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status
                  return (
                    <button
                      key={proposal.id}
                      onClick={() => setSelectedProposal(proposal)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 8, padding: '7px 10px', borderRadius: 8,
                        border: '1px solid rgba(106,166,193,0.15)',
                        background: 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', flexShrink: 0,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(106,166,193,0.07)'
                        e.currentTarget.style.borderColor = 'rgba(106,166,193,0.3)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.borderColor = 'rgba(106,166,193,0.15)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <CurrencyCircleDollar size={11} style={{ color: 'var(--color-app-secondary)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-app-secondary)' }}>
                            {formatCurrency(Number(proposal.value))}
                          </span>
                        </div>
                        {proposal.collaborator && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                            <UserCircle size={10} />
                            <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{proposal.collaborator.name}</span>
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 10, fontWeight: 500, color: pColor,
                          background: `${pColor}22`, border: `1px solid ${pColor}44`,
                          borderRadius: 999, padding: '1px 6px',
                        }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                          {pLabel}
                        </span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(proposal.statusChangedAt ?? proposal.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )
        })()}
      </div>

      </div>{/* end appointments + proposals wrapper */}

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
          updateFn={fromDashboard ? dashboardService.updateClient : undefined}
          defaultCollaboratorId={fromDashboard ? currentUserId : undefined}
        />
      )}

      {/* History Modal */}
      <EntityHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        entityId={Number(id)}
        entityName={client.name}
        fetchFn={fromDashboard ? (entityId, page) => dashboardService.clientLogs(entityId, page) : undefined}
        collaboratorsFetchFn={fromDashboard ? () => dashboardService.collaboratorsSelect() : undefined}
      />

      {/* Schedule Modal */}
      {isScheduleOpen && (
        <AppointmentModal
          prefilledClient={{ id: client.id, name: client.name }}
          onClose={() => setIsScheduleOpen(false)}
          onSaved={() => {
            setIsScheduleOpen(false)
            queryClient.invalidateQueries({ queryKey: ['client-appointments', Number(id)] })
          }}
          createFn={fromDashboard ? dashboardService.createAppointment : undefined}
          defaultCollaboratorId={fromDashboard ? currentUserId : undefined}
        />
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && !isEditAppointmentOpen && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onEdit={() => setIsEditAppointmentOpen(true)}
          onDeleted={() => {
            setSelectedAppointment(null)
            queryClient.invalidateQueries({ queryKey: ['client-appointments', Number(id)] })
          }}
          canEdit={canEditSchedule}
          canDelete={canDeleteSchedule}
          deleteFn={fromDashboard ? dashboardService.deleteAppointment : undefined}
        />
      )}

      {/* Appointment Edit Modal */}
      {selectedAppointment && isEditAppointmentOpen && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={() => { setIsEditAppointmentOpen(false); setSelectedAppointment(null) }}
          onSaved={() => {
            setIsEditAppointmentOpen(false)
            setSelectedAppointment(null)
            queryClient.invalidateQueries({ queryKey: ['client-appointments', Number(id)] })
          }}
          updateFn={fromDashboard ? dashboardService.updateAppointment : undefined}
          defaultCollaboratorId={fromDashboard ? currentUserId : undefined}
        />
      )}

      {/* Proposal Create Modal */}
      {isProposalOpen && (
        <ProposalModal
          prefilledClient={{ id: client.id, name: client.name }}
          onClose={() => setIsProposalOpen(false)}
          onSaved={() => {
            setIsProposalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['client-proposals', Number(id)] })
            queryClient.invalidateQueries({ queryKey: ['proposal-status-stats'] })
          }}
          createFn={fromDashboard ? dashboardService.createProposal : undefined}
          defaultCollaboratorId={fromDashboard ? currentUserId : undefined}
        />
      )}

      {/* Proposal Detail Modal */}
      {selectedProposal && !isEditProposalOpen && (
        <ProposalDetailModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onEdit={() => setIsEditProposalOpen(true)}
          onDeleted={() => {
            setSelectedProposal(null)
            queryClient.invalidateQueries({ queryKey: ['client-proposals', Number(id)] })
            queryClient.invalidateQueries({ queryKey: ['proposal-status-stats'] })
          }}
          canEdit={canEditProposal}
          canDelete={canDeleteProposal}
          deleteFn={fromDashboard ? dashboardService.deleteProposal : undefined}
        />
      )}

      {/* Proposal Edit Modal */}
      {selectedProposal && isEditProposalOpen && (
        <ProposalModal
          proposal={selectedProposal}
          onClose={() => { setIsEditProposalOpen(false); setSelectedProposal(null) }}
          onSaved={() => {
            setIsEditProposalOpen(false)
            setSelectedProposal(null)
            queryClient.invalidateQueries({ queryKey: ['client-proposals', Number(id)] })
            queryClient.invalidateQueries({ queryKey: ['proposal-status-stats'] })
          }}
          updateFn={fromDashboard ? dashboardService.updateProposal : undefined}
          defaultCollaboratorId={fromDashboard ? currentUserId : undefined}
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
