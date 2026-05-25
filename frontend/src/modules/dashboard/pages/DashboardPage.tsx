import { useState, useRef } from 'react'
import { useDashboardClientFilterStore } from '../stores/useDashboardClientFilterStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  startOfWeek, endOfWeek, startOfDay, endOfDay, format, addDays, subDays, addWeeks, subWeeks,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarBlank, CaretLeft, CaretRight, Plus, Funnel, X, UsersThree, FileText, MagnifyingGlass, ChartPieSlice, Rows,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import type { Appointment } from '../../../shared/services/scheduleService'
import type { ClientStatusStat } from '../../../shared/services/clientService'
import type { Proposal, ProposalStatusStat } from '../../../shared/services/proposalService'
import { dashboardService } from '../../../shared/services/dashboardService'
import { WeekView } from '../../schedule/components/WeekView'
import { DayView } from '../../schedule/components/DayView'
import { AppointmentModal } from '../../schedule/components/AppointmentModal'
import { AppointmentDetailModal } from '../../schedule/components/AppointmentDetailModal'
import { ClientFormModal } from '../../clients/components/ClientFormModal'
import { StatisticsStatusCards } from '../../../shared/components/StatisticsStatusCards'
import { ProposalModal } from '../../proposals/components/ProposalModal'
import { ProposalDetailModal } from '../../proposals/components/ProposalDetailModal'
import { PROPOSAL_COLORS, PROPOSAL_LABELS, PROPOSAL_STATUS_ORDER } from '../../../shared/constants/proposalStatus'
import { PageHeader } from '../../../shared/components/PageHeader'
import { Modal } from '../../../shared/components/Modal'
import { Select } from '../../../shared/components/ui/Select'
import { MultiFilterSelect } from '../../../shared/components/MultiFilterSelect'
import { DateRangePicker, type DateRange } from '../../../shared/components/DateRangePicker'
import { Pagination } from '../../../shared/components/Pagination'
import { useAuthStore } from '../../../shared/stores/useAuthStore'
import { useToast } from '../../../shared/hooks/useToast'
import { formatCurrency, formatPhone } from '../../../shared/utils/formatters'

// ── helpers de agenda ─────────────────────────────────────────────────────────

type DashView = 'day' | 'week'

function getRangeLabel(view: DashView, date: Date): string {
  if (view === 'day') {
    const raw = format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }
  const s = startOfWeek(date, { weekStartsOn: 0 })
  const e = endOfWeek(date, { weekStartsOn: 0 })
  if (format(s, 'MM') === format(e, 'MM'))
    return `${format(s, 'd')} – ${format(e, 'd MMM yyyy', { locale: ptBR })}`
  return `${format(s, 'd MMM', { locale: ptBR })} – ${format(e, 'd MMM yyyy', { locale: ptBR })}`
}

function getRangeParams(view: DashView, date: Date) {
  if (view === 'day') return {
    dateFrom: startOfDay(date).toISOString(),
    dateTo: endOfDay(date).toISOString(),
  }
  return {
    dateFrom: startOfWeek(date, { weekStartsOn: 0 }).toISOString(),
    dateTo: endOfWeek(date, { weekStartsOn: 0 }).toISOString(),
  }
}

function navigateDate(view: DashView, date: Date, dir: 'prev' | 'next'): Date {
  if (view === 'day') return dir === 'next' ? addDays(date, 1) : subDays(date, 1)
  return dir === 'next' ? addWeeks(date, 1) : subWeeks(date, 1)
}

const btnNav: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6,
  padding: '4px 6px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
}

// ── status badge de proposta ──────────────────────────────────────────────────

function ProposalBadge({ status }: { status: string }) {
  const color = PROPOSAL_COLORS[status] ?? '#8A919C'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
      fontSize: 11, fontWeight: 500, color,
      border: `1px solid ${color}55`, background: `${color}22`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {PROPOSAL_LABELS[status] ?? status}
    </span>
  )
}

const STATUS_VALUES = PROPOSAL_STATUS_ORDER

// ── box styles ────────────────────────────────────────────────────────────────

const boxStyle: React.CSSProperties = {
  background: 'var(--color-app-primary)',
  borderRadius: 16,
  border: '1px solid rgba(230,194,132,0.1)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const boxHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  flexShrink: 0,
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

export function DashboardPage() {
  const routerNavigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore(s => s.user)
  const { addToast } = useToast()

  const isAdmin = user?.roleId === null
  const userId = user?.id ?? 0

  // ── Agenda — estado local (não usa o store compartilhado) ─────────────────
  const [dashView, setDashView] = useState<DashView>('day')
  const [agendaDisplayMode, setAgendaDisplayMode] = useState<'list' | 'grid'>('list')
  const [agendaDate, setAgendaDate] = useState<Date>(() => startOfDay(new Date()))

  function switchView(v: DashView) {
    setDashView(v)
    setAgendaDate(v === 'day' ? startOfDay(new Date()) : startOfWeek(new Date(), { weekStartsOn: 0 }))
  }

  function handleNavigate(dir: 'prev' | 'next') {
    setAgendaDate(d => navigateDate(dashView, d, dir))
  }

  // No dashboard todos os usuários podem CRUD nos próprios registros; backend enforce ownership
  const canCreateSchedule = true
  const canEditSchedule = true
  const canDeleteSchedule = true

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>()
  const [prefilledDate, setPrefilledDate] = useState<Date | undefined>()
  const [detailScheduleOpen, setDetailScheduleOpen] = useState(false)
  const [detailAppointment, setDetailAppointment] = useState<Appointment | undefined>()
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filterCollaboratorId, setFilterCollaboratorId] = useState<string>('')

  const { data: collaboratorsData } = useQuery({
    queryKey: ['dashboard-collaborators-select'],
    queryFn: () => dashboardService.collaboratorsSelect(),
    staleTime: 1000 * 60 * 5,
  })

  const scheduleCollaboratorId = isAdmin
    ? (filterCollaboratorId ? Number(filterCollaboratorId) : undefined)
    : userId

  const rangeParams = getRangeParams(dashView, agendaDate)
  const scheduleQK = ['dashboard-appointments', rangeParams.dateFrom, rangeParams.dateTo, scheduleCollaboratorId]

  const { data: appointments = [] } = useQuery({
    queryKey: scheduleQK,
    queryFn: () => dashboardService.appointments({ ...rangeParams, collaboratorId: scheduleCollaboratorId }),
    staleTime: 1000 * 30,
    enabled: !!userId,
  })

  function openCreateSchedule(date?: Date) {
    if (!canCreateSchedule) return
    setEditingAppointment(undefined)
    setPrefilledDate(date)
    setScheduleModalOpen(true)
  }

  function openDetailSchedule(a: Appointment) {
    setDetailAppointment(a)
    setDetailScheduleOpen(true)
  }

  function openEditFromDetail() {
    setDetailScheduleOpen(false)
    setEditingAppointment(detailAppointment)
    setPrefilledDate(undefined)
    setScheduleModalOpen(true)
  }

  function handleScheduleSaved() {
    queryClient.invalidateQueries({ queryKey: ['dashboard-appointments'] })
  }

  async function handleReschedule(appointmentId: number, newStartAt: string) {
    if (!canEditSchedule) return
    queryClient.setQueryData<Appointment[]>(scheduleQK, (old = []) =>
      old.map(a => a.id === appointmentId ? { ...a, startAt: newStartAt } : a)
    )
    try {
      await dashboardService.updateAppointment(appointmentId, { startAt: newStartAt })
      queryClient.invalidateQueries({ queryKey: ['dashboard-appointments'] })
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ['dashboard-appointments'] })
      addToast(err.message ?? 'Erro ao reagendar', 'danger')
    }
  }

  const filterActive = !!filterCollaboratorId
  const rangeLabel = getRangeLabel(dashView, agendaDate)

  const VIEW_BUTTONS = [
    { key: 'day' as DashView, label: 'Dia' },
    { key: 'week' as DashView, label: 'Semana' },
  ]

  const filterBtn = isAdmin ? (
    <button
      onClick={() => setShowFilterModal(true)}
      style={{ flexShrink: 0, display: 'flex', position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <Funnel size={18} weight={filterActive ? 'fill' : 'regular'} style={{ color: filterActive ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.6)' }} />
      {filterActive && (
        <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: 'var(--color-app-secondary)' }} />
      )}
    </button>
  ) : null

  const createScheduleBtn = canCreateSchedule ? (
    <button
      onClick={() => openCreateSchedule()}
      style={{ background: 'var(--color-app-accent)', border: 'none', borderRadius: 7, width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <Plus size={14} weight="bold" />
    </button>
  ) : null

  // ── Clientes ──────────────────────────────────────────────────────────────
  const canCreateClient = true
  const {
    clientPage, setClientPage,
    clientSearch, setClientSearch,
    clientFilterStatusIds: _clientFilterStatusIds, setClientFilterStatusIds,
    clientFilterDateRange, setClientFilterDateRange,
    clientFilterApptDateRange, setClientFilterApptDateRange,
  } = useDashboardClientFilterStore()
  const clientFilterStatusIds = Array.isArray(_clientFilterStatusIds) ? _clientFilterStatusIds : []
  const [clientFormOpen, setClientFormOpen] = useState(false)
  const [showClientFilterModal, setShowClientFilterModal] = useState(false)

  const { data: clientStatusesData = [] } = useQuery({
    queryKey: ['dashboard-client-statuses'],
    queryFn: () => dashboardService.clientStatuses(),
    staleTime: 1000 * 60 * 5,
  })

  const { data: clientStatusStats = [] } = useQuery<ClientStatusStat[]>({
    queryKey: ['dashboard-client-status-stats', clientSearch, clientFilterDateRange, clientFilterApptDateRange],
    queryFn: () => dashboardService.clientStats({
      search: clientSearch || undefined,
      dateFrom: clientFilterDateRange.from ? startOfDay(clientFilterDateRange.from).toISOString() : undefined,
      dateTo: clientFilterDateRange.to ? endOfDay(clientFilterDateRange.to).toISOString() : clientFilterDateRange.from ? endOfDay(clientFilterDateRange.from).toISOString() : undefined,
      appointmentDateFrom: clientFilterApptDateRange.from ? startOfDay(clientFilterApptDateRange.from).toISOString() : undefined,
      appointmentDateTo: clientFilterApptDateRange.to ? endOfDay(clientFilterApptDateRange.to).toISOString() : clientFilterApptDateRange.from ? endOfDay(clientFilterApptDateRange.from).toISOString() : undefined,
    }),
    staleTime: 1000 * 30,
    enabled: !!userId,
  })



  const clientFilterActive = clientFilterStatusIds.length > 0 || !!clientFilterDateRange.from || !!clientFilterApptDateRange.from

  const { data: clientsData } = useQuery({
    queryKey: ['dashboard-clients', clientPage, clientSearch, clientFilterStatusIds, clientFilterDateRange, clientFilterApptDateRange],
    queryFn: () => dashboardService.clients({
      page: clientPage,
      limit: 10,
      search: clientSearch || undefined,
      statusIds: clientFilterStatusIds.length > 0 ? clientFilterStatusIds.map(Number) : undefined,
      dateFrom: clientFilterDateRange.from ? startOfDay(clientFilterDateRange.from).toISOString() : undefined,
      dateTo: clientFilterDateRange.to ? endOfDay(clientFilterDateRange.to).toISOString() : clientFilterDateRange.from ? endOfDay(clientFilterDateRange.from).toISOString() : undefined,
      appointmentDateFrom: clientFilterApptDateRange.from ? startOfDay(clientFilterApptDateRange.from).toISOString() : undefined,
      appointmentDateTo: clientFilterApptDateRange.to ? endOfDay(clientFilterApptDateRange.to).toISOString() : clientFilterApptDateRange.from ? endOfDay(clientFilterApptDateRange.from).toISOString() : undefined,
    }),
    staleTime: 1000 * 30,
    enabled: !!userId,
  })

  function handleClientSaved() {
    queryClient.invalidateQueries({ queryKey: ['dashboard-clients'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-client-status-stats'] })
  }

  // ── Propostas ─────────────────────────────────────────────────────────────
  const canCreateProposal = true
  const canEditProposal = true
  const canDeleteProposal = true

  const [proposalPage, setProposalPage] = useState(1)
  const [proposalSearch, setProposalSearch] = useState('')
  const [showProposalFilterModal, setShowProposalFilterModal] = useState(false)
  const [proposalFilterStatuses, setProposalFilterStatuses] = useState<string[]>([])
  const [proposalFilterDateRange, setProposalFilterDateRange] = useState<DateRange>({})
  const [proposalFilterStatusChangedRange, setProposalFilterStatusChangedRange] = useState<DateRange>({})
  const [proposalModalOpen, setProposalModalOpen] = useState(false)
  const [editingProposal, setEditingProposal] = useState<Proposal | undefined>()
  const [proposalDetailOpen, setProposalDetailOpen] = useState(false)
  const [detailProposal, setDetailProposal] = useState<Proposal | undefined>()

  const proposalFilterActive = proposalFilterStatuses.length > 0 || !!proposalFilterDateRange.from || !!proposalFilterStatusChangedRange.from

  const { data: proposalStatusStats = [] } = useQuery<ProposalStatusStat[]>({
    queryKey: ['dashboard-proposal-status-stats', proposalFilterDateRange, proposalFilterStatusChangedRange],
    queryFn: () => dashboardService.proposalStats({
      dateFrom: proposalFilterDateRange.from ? startOfDay(proposalFilterDateRange.from).toISOString() : undefined,
      dateTo: proposalFilterDateRange.to ? endOfDay(proposalFilterDateRange.to).toISOString() : proposalFilterDateRange.from ? endOfDay(proposalFilterDateRange.from).toISOString() : undefined,
      statusChangedFrom: proposalFilterStatusChangedRange.from ? startOfDay(proposalFilterStatusChangedRange.from).toISOString() : undefined,
      statusChangedTo: proposalFilterStatusChangedRange.to ? endOfDay(proposalFilterStatusChangedRange.to).toISOString() : proposalFilterStatusChangedRange.from ? endOfDay(proposalFilterStatusChangedRange.from).toISOString() : undefined,
    }),
    staleTime: 1000 * 30,
    enabled: !!userId,
  })

  const { data: proposalsData } = useQuery({
    queryKey: ['dashboard-proposals', proposalPage, proposalSearch, proposalFilterStatuses, proposalFilterDateRange, proposalFilterStatusChangedRange],
    queryFn: () => dashboardService.proposals({
      page: proposalPage,
      limit: 10,
      search: proposalSearch || undefined,
      statuses: proposalFilterStatuses.length > 0 ? proposalFilterStatuses : undefined,
      dateFrom: proposalFilterDateRange.from ? startOfDay(proposalFilterDateRange.from).toISOString() : undefined,
      dateTo: proposalFilterDateRange.to ? endOfDay(proposalFilterDateRange.to).toISOString() : proposalFilterDateRange.from ? endOfDay(proposalFilterDateRange.from).toISOString() : undefined,
      statusChangedFrom: proposalFilterStatusChangedRange.from ? startOfDay(proposalFilterStatusChangedRange.from).toISOString() : undefined,
      statusChangedTo: proposalFilterStatusChangedRange.to ? endOfDay(proposalFilterStatusChangedRange.to).toISOString() : proposalFilterStatusChangedRange.from ? endOfDay(proposalFilterStatusChangedRange.from).toISOString() : undefined,
    }),
    staleTime: 1000 * 30,
    enabled: !!userId,
  })

  function handleProposalSaved() {
    queryClient.invalidateQueries({ queryKey: ['dashboard-proposals'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-proposal-status-stats'] })
  }

  function openProposalDetail(p: Proposal) {
    setDetailProposal(p)
    setProposalDetailOpen(true)
  }

  function openEditProposalFromDetail() {
    setProposalDetailOpen(false)
    setEditingProposal(detailProposal)
    setProposalModalOpen(true)
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col pb-8">

      {/* Global Dashboard Header */}
      <PageHeader title="Dashboard" icon={ChartPieSlice} />

      {/* Three boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">

        {/* ─── Box: Agenda ─── */}
        <div className="flex flex-col md:col-span-2 md:h-[580px]" style={boxStyle}>
          <div style={boxHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <CalendarBlank size={17} className="text-app-secondary" />
                <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Agenda</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {filterBtn}
                {createScheduleBtn}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 md:flex-row md:justify-between">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button onClick={() => handleNavigate('prev')} style={btnNav}>
                  <CaretLeft size={11} color="var(--color-app-gray)" />
                </button>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize', minWidth: 90, textAlign: 'center' }}>
                  {rangeLabel}
                </span>
                <button onClick={() => handleNavigate('next')} style={btnNav}>
                  <CaretRight size={11} color="var(--color-app-gray)" />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, overflow: 'hidden' }}>
                  {VIEW_BUTTONS.map(btn => (
                    <button
                      key={btn.key}
                      onClick={() => switchView(btn.key)}
                      style={{
                        padding: '4px 10px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                        background: dashView === btn.key ? 'var(--color-app-accent)' : 'transparent',
                        color: dashView === btn.key ? 'white' : 'var(--color-app-gray)',
                        transition: 'background 0.2s',
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
                <div className="hidden md:flex" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, overflow: 'hidden' }}>
                  {([
                    { mode: 'list' as const, icon: <Rows size={13} /> },
                    { mode: 'grid' as const, icon: <CalendarBlank size={13} /> },
                  ]).map(({ mode, icon }) => (
                    <button
                      key={mode}
                      onClick={() => setAgendaDisplayMode(mode)}
                      style={{
                        padding: '0 8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        background: agendaDisplayMode === mode ? 'var(--color-app-accent)' : 'transparent',
                        color: agendaDisplayMode === mode ? 'white' : 'var(--color-app-gray)',
                        transition: 'background 0.2s',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {isAdmin && filterActive && (
              <div style={{ marginTop: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 999, fontSize: 11, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                  {(collaboratorsData ?? []).find(c => String(c.id) === filterCollaboratorId)?.name ?? 'Colaborador'}
                  <button onClick={() => setFilterCollaboratorId('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                    <X size={10} weight="bold" />
                  </button>
                </span>
              </div>
            )}
          </div>
          {/* Calendar body */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {dashView === 'day' && (
              <DayView
                currentDate={agendaDate}
                appointments={appointments}
                onSlotClick={canCreateSchedule ? openCreateSchedule : undefined}
                onAppointmentClick={openDetailSchedule}
                onReschedule={canEditSchedule ? handleReschedule : undefined}
                canEdit={canEditSchedule}
                forceMode={agendaDisplayMode}
              />
            )}
            {dashView === 'week' && (
              <WeekView
                currentDate={agendaDate}
                appointments={appointments}
                onSlotClick={canCreateSchedule ? openCreateSchedule : undefined}
                onAppointmentClick={openDetailSchedule}
                onReschedule={canEditSchedule ? handleReschedule : undefined}
                canEdit={canEditSchedule}
                forceMode={agendaDisplayMode}
              />
            )}
          </div>
        </div>

        {/* ─── Box: Clientes ─── */}
        <div className="flex flex-col h-[560px] md:h-[580px]" style={boxStyle}>
          <div style={boxHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <UsersThree size={17} className="text-app-secondary" />
                <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Clientes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setShowClientFilterModal(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <Funnel size={18} weight={clientFilterActive ? 'fill' : 'regular'} style={{ color: clientFilterActive ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.6)' }} />
                  {clientFilterActive && <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: 'var(--color-app-secondary)' }} />}
                </button>
                {canCreateClient && (
                  <button onClick={() => setClientFormOpen(true)} style={{ background: 'var(--color-app-accent)', border: 'none', borderRadius: 7, width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={14} weight="bold" />
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <MagnifyingGlass size={14} color="var(--color-app-gray)" />
              <input
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setClientPage(1) }}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#fff' }}
              />
              {clientSearch && (
                <button onClick={() => { setClientSearch(''); setClientPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                  <X size={13} weight="bold" />
                </button>
              )}
            </div>
            {clientFilterActive && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {clientFilterStatusIds.map(sid => {
                  const s = clientStatusesData.find(x => String(x.id) === sid)
                  return s ? (
                    <span key={sid} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 11, background: `${s.color}22`, border: `1px solid ${s.color}55`, color: s.color }}>
                      {s.name}
                      <button onClick={() => setClientFilterStatusIds(clientFilterStatusIds.filter(x => x !== sid))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={9} weight="bold" /></button>
                    </span>
                  ) : null
                })}
                {clientFilterDateRange.from && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 11, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                    {format(clientFilterDateRange.from, 'dd/MM/yy')}{clientFilterDateRange.to ? ` – ${format(clientFilterDateRange.to, 'dd/MM/yy')}` : ''}
                    <button onClick={() => setClientFilterDateRange({})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={9} weight="bold" /></button>
                  </span>
                )}
                {clientFilterApptDateRange.from && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 11, background: 'rgba(106,166,193,0.1)', border: '1px solid rgba(106,166,193,0.3)', color: 'var(--color-app-accent)' }}>
                    <CalendarBlank size={10} />
                    {format(clientFilterApptDateRange.from, 'dd/MM/yy')}{clientFilterApptDateRange.to ? ` – ${format(clientFilterApptDateRange.to, 'dd/MM/yy')}` : ''}
                    <button onClick={() => setClientFilterApptDateRange({})} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={9} weight="bold" /></button>
                  </span>
                )}
              </div>
            )}
          </div>
          {clientStatusStats.length > 0 && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, padding: '10px 16px' }}>
              <StatisticsStatusCards
                items={clientStatusStats.map(s => ({ id: String(s.id), label: s.name, color: s.color, primaryValue: s.count }))}
                activeIds={clientFilterStatusIds}
                onToggle={(id) => {
                  setClientFilterStatusIds(
                    clientFilterStatusIds.includes(id) ? clientFilterStatusIds.filter(x => x !== id) : [...clientFilterStatusIds, id]
                  )
                  setClientPage(1)
                }}
                layout="grid"
                pageSize={4}
              />
            </div>
          )}
          {/* List body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!clientsData && [1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl bg-white/5" style={{ height: 56, flexShrink: 0 }} />
            ))}
            {clientsData?.data.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-app-gray)', fontSize: 13 }}>
                Nenhum cliente encontrado
              </div>
            )}
            {clientsData?.data.map(client => (
              <button
                key={client.id}
                onClick={() => routerNavigate(`/dashboard/clients/${client.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 10, gap: 10, flexShrink: 0,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(230,194,132,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: client.clientStatus?.color ?? 'var(--color-app-gray)' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-app-gray)', marginTop: 1 }}>
                      {formatPhone(client.phone)}
                    </div>
                  </div>
                </div>
                {client.clientStatus && (
                  <span style={{ fontSize: 11, fontWeight: 500, flexShrink: 0, padding: '2px 8px', borderRadius: 999, background: `${client.clientStatus.color}22`, border: `1px solid ${client.clientStatus.color}55`, color: client.clientStatus.color }}>
                    {client.clientStatus.name}
                  </span>
                )}
              </button>
            ))}
          </div>
          {clientsData && clientsData.meta.totalPages > 1 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, padding: '2px 8px' }}>
              <Pagination compact page={clientPage} totalPages={clientsData.meta.totalPages} total={clientsData.meta.total} onPageChange={setClientPage} itemLabel="cliente" />
            </div>
          )}
        </div>

        {/* ─── Box: Propostas ─── */}
        <div className="flex flex-col h-[560px] md:col-span-3 md:h-[460px]" style={boxStyle}>
          <div style={boxHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FileText size={17} className="text-app-secondary" />
                <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Propostas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setShowProposalFilterModal(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <Funnel size={18} weight={proposalFilterActive ? 'fill' : 'regular'} style={{ color: proposalFilterActive ? 'var(--color-app-secondary)' : 'rgba(255,255,255,0.6)' }} />
                  {proposalFilterActive && <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: 'var(--color-app-secondary)' }} />}
                </button>
                {canCreateProposal && (
                  <button onClick={() => { setEditingProposal(undefined); setProposalModalOpen(true) }} style={{ background: 'var(--color-app-accent)', border: 'none', borderRadius: 7, width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={14} weight="bold" />
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <MagnifyingGlass size={14} color="var(--color-app-gray)" />
              <input
                placeholder="Buscar proposta..."
                value={proposalSearch}
                onChange={e => { setProposalSearch(e.target.value); setProposalPage(1) }}
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#fff' }}
              />
              {proposalSearch && (
                <button onClick={() => { setProposalSearch(''); setProposalPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                  <X size={13} weight="bold" />
                </button>
              )}
            </div>
            {proposalFilterActive && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {proposalFilterStatuses.map(s => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 11, background: `${PROPOSAL_COLORS[s]}22`, border: `1px solid ${PROPOSAL_COLORS[s]}55`, color: PROPOSAL_COLORS[s] }}>
                    {PROPOSAL_LABELS[s]}
                    <button onClick={() => setProposalFilterStatuses(proposalFilterStatuses.filter(x => x !== s))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={9} weight="bold" /></button>
                  </span>
                ))}
                {proposalFilterDateRange.from && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 11, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                    Criação: {format(proposalFilterDateRange.from, 'dd/MM/yy')}{proposalFilterDateRange.to && proposalFilterDateRange.to !== proposalFilterDateRange.from ? ` – ${format(proposalFilterDateRange.to, 'dd/MM/yy')}` : ''}
                    <button onClick={() => { setProposalFilterDateRange({}); setProposalPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={9} weight="bold" /></button>
                  </span>
                )}
                {proposalFilterStatusChangedRange.from && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 11, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
                    Mudança status: {format(proposalFilterStatusChangedRange.from, 'dd/MM/yy')}{proposalFilterStatusChangedRange.to && proposalFilterStatusChangedRange.to !== proposalFilterStatusChangedRange.from ? ` – ${format(proposalFilterStatusChangedRange.to, 'dd/MM/yy')}` : ''}
                    <button onClick={() => { setProposalFilterStatusChangedRange({}); setProposalPage(1) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={9} weight="bold" /></button>
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Status cards — apenas mobile */}
          {proposalStatusStats.length > 0 && (
            <div className="md:hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, padding: '10px 16px' }}>
              <StatisticsStatusCards
                items={PROPOSAL_STATUS_ORDER.flatMap(o => { const s = proposalStatusStats.find(x => x.status === o); return s ? [{ id: s.status, label: PROPOSAL_LABELS[s.status], color: PROPOSAL_COLORS[s.status], primaryValue: formatCurrency(s.totalValue), secondaryValue: `${s.count} prop.` }] : [] })}
                activeIds={proposalFilterStatuses}
                onToggle={(s) => {
                  setProposalFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
                  setProposalPage(1)
                }}
                compact
              />
            </div>
          )}
          {/* Body: status cards (esq) + lista (dir) */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* Painel de status — apenas desktop */}
            <div className="hidden md:flex" style={{ width: 250, flexShrink: 0, flexDirection: 'column', justifyContent: 'center', padding: '14px', borderRight: '1px solid rgba(255,255,255,0.06)', gap: 8 }}>
              <StatisticsStatusCards
                items={PROPOSAL_STATUS_ORDER.flatMap(o => { const s = proposalStatusStats.find(x => x.status === o); return s ? [{ id: s.status, label: PROPOSAL_LABELS[s.status], color: PROPOSAL_COLORS[s.status], primaryValue: formatCurrency(s.totalValue), secondaryValue: `${s.count} prop.` }] : [] })}
                activeIds={proposalFilterStatuses}
                onToggle={(s) => {
                  setProposalFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
                  setProposalPage(1)
                }}
                layout="sidebar"
              />
            </div>

            {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {!proposalsData && [1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl bg-white/5" style={{ height: 56, flexShrink: 0 }} />
            ))}
            {proposalsData?.data.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-app-gray)', fontSize: 13 }}>
                Nenhuma proposta encontrada
              </div>
            )}
            {proposalsData?.data.map(proposal => (
              <div key={proposal.id} style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => openProposalDetail(proposal)}>

                {/* Mobile */}
                <div className="flex md:hidden" style={{
                  alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '10px 12px', borderRadius: 10,
                  background: 'rgba(23,27,36,0.5)', border: '1px solid rgba(230,194,132,0.2)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-app-secondary)', margin: 0 }}>
                      {formatCurrency(Number(proposal.value))}
                    </p>
                    <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.55)', margin: 0, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {proposal.client.name}
                    </p>
                  </div>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: PROPOSAL_COLORS[proposal.status] ?? 'var(--color-app-gray)' }} />
                </div>

                {/* Desktop */}
                <div className="hidden md:grid" style={{
                  gridTemplateColumns: 'minmax(0,130px) minmax(0,1fr) minmax(0,140px)',
                  padding: '10px 16px', borderRadius: 10, alignItems: 'center',
                  background: 'rgba(23,27,36,0.5)', border: '1px solid rgba(230,194,132,0.2)',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-app-secondary)', margin: 0 }}>
                      {formatCurrency(Number(proposal.value))}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {proposal.collaborator?.name ?? '—'}
                    </p>
                  </div>
                  <div style={{ minWidth: 0, textAlign: 'center' }}>
                    <p style={{ fontWeight: 500, color: '#fff', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                      {proposal.client.name}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <ProposalBadge status={proposal.status} />
                  </div>
                </div>

              </div>
            ))}
          </div>{/* fim lista */}
          </div>{/* fim body wrapper */}
          {proposalsData && proposalsData.meta.totalPages > 1 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, padding: '4px 8px' }}>
              <Pagination page={proposalPage} totalPages={proposalsData.meta.totalPages} total={proposalsData.meta.total} onPageChange={setProposalPage} itemLabel="proposta" />
            </div>
          )}
        </div>

      </div>

      {/* ──────────── MODAIS ──────────── */}

      <Modal isOpen={showClientFilterModal} onClose={() => setShowClientFilterModal(false)} title="Filtrar Clientes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MultiFilterSelect
            label="Status"
            values={clientFilterStatusIds}
            onChange={v => { setClientFilterStatusIds(v); setClientPage(1) }}
            options={clientStatusesData.map(s => ({ value: String(s.id), label: s.name, color: s.color }))}
            placeholder="Todos os status"
            noCheckbox
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <DateRangePicker
            label="Período de cadastro"
            value={clientFilterDateRange}
            onChange={v => { setClientFilterDateRange(v); setClientPage(1) }}
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <DateRangePicker
            label="Período de agendamento"
            value={clientFilterApptDateRange}
            onChange={v => { setClientFilterApptDateRange(v); setClientPage(1) }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowClientFilterModal(false)} style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, cursor: 'pointer', color: 'var(--color-app-primary)', fontWeight: 600, fontSize: 14 }}>
              Filtrar
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showProposalFilterModal} onClose={() => setShowProposalFilterModal(false)} title="Filtrar Propostas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MultiFilterSelect
            label="Status"
            values={proposalFilterStatuses}
            onChange={v => { setProposalFilterStatuses(v); setProposalPage(1) }}
            options={PROPOSAL_STATUS_ORDER.map(s => ({ value: s, label: PROPOSAL_LABELS[s], color: PROPOSAL_COLORS[s] }))}
            placeholder="Todos os status"
            noCheckbox
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <DateRangePicker
            label="Período de criação"
            value={proposalFilterDateRange}
            onChange={v => { setProposalFilterDateRange(v); setProposalPage(1) }}
          />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          <DateRangePicker
            label="Período de mudança de status"
            value={proposalFilterStatusChangedRange}
            onChange={v => { setProposalFilterStatusChangedRange(v); setProposalPage(1) }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowProposalFilterModal(false)} style={{ padding: '8px 20px', background: 'var(--color-app-secondary)', border: 'none', borderRadius: 10, cursor: 'pointer', color: 'var(--color-app-primary)', fontWeight: 600, fontSize: 14 }}>
              Filtrar
            </button>
          </div>
        </div>
      </Modal>

      {isAdmin && (
        <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filtros">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Select
              label="Colaborador"
              value={filterCollaboratorId}
              onChange={setFilterCollaboratorId}
              options={[
                { value: '', label: 'Todos os colaboradores' },
                ...(collaboratorsData ?? []).map(c => ({
                  value: String(c.id),
                  label: c.name,
                  badge: c.id === userId ? 'Você' : undefined,
                })),
              ]}
              placeholder="Todos os colaboradores"
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
      )}

      {detailScheduleOpen && detailAppointment && (
        <AppointmentDetailModal
          appointment={detailAppointment}
          onClose={() => setDetailScheduleOpen(false)}
          onEdit={openEditFromDetail}
          onDeleted={handleScheduleSaved}
          canEdit={canEditSchedule}
          canDelete={canDeleteSchedule}
          deleteFn={dashboardService.deleteAppointment}
        />
      )}

      {scheduleModalOpen && (
        <AppointmentModal
          appointment={editingAppointment}
          prefilledDate={prefilledDate}
          defaultCollaboratorId={userId}
          filterClientUserId={userId}
          onClose={() => setScheduleModalOpen(false)}
          onSaved={handleScheduleSaved}
          createFn={dashboardService.createAppointment}
          updateFn={dashboardService.updateAppointment}
        />
      )}

      {clientFormOpen && (
        <ClientFormModal
          defaultCollaboratorId={userId}
          onClose={() => setClientFormOpen(false)}
          onSaved={() => { setClientFormOpen(false); handleClientSaved() }}
          createFn={dashboardService.createClient}
          updateFn={dashboardService.updateClient}
        />
      )}

      {proposalModalOpen && (
        <ProposalModal
          proposal={editingProposal}
          defaultCollaboratorId={!editingProposal ? userId : undefined}
          filterClientUserId={userId}
          onClose={() => setProposalModalOpen(false)}
          onSaved={() => { setProposalModalOpen(false); handleProposalSaved() }}
          createFn={dashboardService.createProposal}
          updateFn={dashboardService.updateProposal}
        />
      )}

      {proposalDetailOpen && detailProposal && (
        <ProposalDetailModal
          proposal={detailProposal}
          onClose={() => setProposalDetailOpen(false)}
          onEdit={openEditProposalFromDetail}
          onDeleted={() => { setProposalDetailOpen(false); handleProposalSaved() }}
          canEdit={canEditProposal}
          canDelete={canDeleteProposal}
          deleteFn={dashboardService.deleteProposal}
        />
      )}

    </div>
  )
}
