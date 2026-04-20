import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarBlank, CaretLeft, CaretRight, Plus, Funnel, X } from '@phosphor-icons/react'
import { useScheduleStore } from '../stores/useScheduleStore'
import { scheduleService, type Appointment } from '../../../shared/services/scheduleService'
import { collaboratorsService } from '../../../shared/services/collaboratorsService'
import { Modal } from '../../../shared/components/Modal'
import { Select } from '../../../shared/components/ui/Select'
import { WeekView } from '../components/WeekView'
import { MonthView } from '../components/MonthView'
import { YearView } from '../components/YearView'
import { AppointmentModal } from '../components/AppointmentModal'
import { useCanAccess } from '../../../shared/hooks/useMyPermissions'
import { useToast } from '../../../shared/hooks/useToast'

const MODULE = 'schedule'

function getRangeLabel(view: string, currentDate: Date): string {
  if (view === 'week') {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 })
    const end = endOfWeek(currentDate, { weekStartsOn: 0 })
    const sameMonth = format(start, 'MM') === format(end, 'MM')
    if (sameMonth) return `${format(start, 'd')} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`
    return `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, 'd MMM yyyy', { locale: ptBR })}`
  }
  if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: ptBR })
  return format(currentDate, 'yyyy')
}

function getRangeParams(view: string, currentDate: Date) {
  if (view === 'week') {
    return {
      dateFrom: startOfWeek(currentDate, { weekStartsOn: 0 }).toISOString(),
      dateTo: endOfWeek(currentDate, { weekStartsOn: 0 }).toISOString(),
    }
  }
  if (view === 'month') {
    return {
      dateFrom: startOfMonth(currentDate).toISOString(),
      dateTo: endOfMonth(currentDate).toISOString(),
    }
  }
  return {
    dateFrom: startOfYear(currentDate).toISOString(),
    dateTo: endOfYear(currentDate).toISOString(),
  }
}

const btnNav: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '5px 8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
}

export function SchedulePage() {
  const { view, currentDate, setView, navigate, setCurrentDate } = useScheduleStore()
  const canCreate = useCanAccess(MODULE, 'create')
  const canEdit = useCanAccess(MODULE, 'edit')
  const canDelete = useCanAccess(MODULE, 'delete')
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>()
  const [prefilledDate, setPrefilledDate] = useState<Date | undefined>()
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filterCollaboratorId, setFilterCollaboratorId] = useState<string>('')

  const { data: collaboratorsData } = useQuery({
    queryKey: ['collaborators-select'],
    queryFn: () => collaboratorsService.list({ limit: 200, active: 1 }),
    staleTime: 1000 * 60 * 5,
  })

  const collaboratorId = filterCollaboratorId ? Number(filterCollaboratorId) : undefined
  const rangeParams = getRangeParams(view, currentDate)
  const queryKey = ['appointments', rangeParams.dateFrom, rangeParams.dateTo, collaboratorId]

  const { data: appointments = [] } = useQuery({
    queryKey,
    queryFn: () => scheduleService.list({ ...rangeParams, collaboratorId }),
    staleTime: 1000 * 30,
  })

  const filterActive = !!filterCollaboratorId

  function openCreate(date?: Date) {
    if (!canCreate) return
    setEditingAppointment(undefined)
    setPrefilledDate(date)
    setModalOpen(true)
  }

  function openEdit(a: Appointment) {
    setEditingAppointment(a)
    setPrefilledDate(undefined)
    setModalOpen(true)
  }

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }

  async function handleReschedule(appointmentId: number, newStartAt: string) {
    if (!canEdit) return
    queryClient.setQueryData<Appointment[]>(queryKey, (old = []) =>
      old.map((a) => a.id === appointmentId ? { ...a, startAt: newStartAt } : a)
    )
    try {
      await scheduleService.update(appointmentId, { startAt: newStartAt })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      addToast(err.message ?? 'Erro ao reagendar', 'danger')
    }
  }

  function handleMonthClick(monthStart: Date) {
    setView('month')
    setCurrentDate(monthStart)
  }

  const label = getRangeLabel(view, currentDate)

  const viewButtons: Array<{ key: typeof view; label: string }> = [
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mês' },
    { key: 'year', label: 'Ano' },
  ]

  const viewToggle = (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, overflow: 'hidden' }}>
      {viewButtons.map((btn) => (
        <button
          key={btn.key}
          onClick={() => setView(btn.key)}
          style={{
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            background: view === btn.key ? 'var(--color-app-accent)' : 'transparent',
            color: view === btn.key ? 'white' : 'var(--color-app-gray)',
            transition: 'background 0.2s',
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )

  const filterBtn = (
    <button
      onClick={() => setShowFilterModal(true)}
      style={{ flexShrink: 0, display: 'flex', position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <Funnel size={22} weight={filterActive ? 'fill' : 'regular'} style={{ color: filterActive ? 'var(--color-app-secondary)' : 'white' }} />
      {filterActive && (
        <span style={{ position: 'absolute', top: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-app-secondary)' }} />
      )}
    </button>
  )

  const createBtn = canCreate ? (
    <button
      onClick={() => openCreate()}
      style={{ background: 'var(--color-app-accent)', border: 'none', borderRadius: 8, width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <Plus size={18} weight="bold" />
    </button>
  ) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>

        {/* Desktop: tudo em uma linha */}
        <div className="hidden md:flex items-center justify-between" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarBlank size={26} className="text-app-secondary" weight="regular" />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', margin: 0 }}>Agenda</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => navigate('prev')} style={btnNav}>
                <CaretLeft size={14} color="var(--color-app-gray)" />
              </button>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize', minWidth: 100, textAlign: 'center' }}>
                {label}
              </span>
              <button onClick={() => navigate('next')} style={btnNav}>
                <CaretRight size={14} color="var(--color-app-gray)" />
              </button>
            </div>
            {viewToggle}
            {filterBtn}
            {createBtn}
          </div>
        </div>

        {/* Mobile: múltiplas linhas */}
        <div className="flex md:hidden flex-col">
          {/* Linha 1: título | filtro + novo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CalendarBlank size={26} className="text-app-secondary" weight="regular" />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', margin: 0 }}>Agenda</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {filterBtn}
              {createBtn}
            </div>
          </div>
          {/* Linha 2: nav período centralizado */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px 8px', gap: 6 }}>
            <button onClick={() => navigate('prev')} style={btnNav}>
              <CaretLeft size={14} color="var(--color-app-gray)" />
            </button>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize', minWidth: 100, textAlign: 'center' }}>
              {label}
            </span>
            <button onClick={() => navigate('next')} style={btnNav}>
              <CaretRight size={14} color="var(--color-app-gray)" />
            </button>
          </div>
          {/* Linha 3: toggles de view centralizados */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 12px' }}>
            {viewToggle}
          </div>
        </div>
      </div>

      {/* Chips de filtros ativos */}
      {filterActive && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500, paddingLeft: 10 }}>Colaborador</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'rgba(230,194,132,0.1)', border: '1px solid rgba(230,194,132,0.3)', color: 'var(--color-app-secondary)' }}>
              {collaboratorsData?.data.find(c => String(c.id) === filterCollaboratorId)?.name ?? 'Colaborador'}
              <button onClick={() => setFilterCollaboratorId('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                <X size={11} weight="bold" />
              </button>
            </span>
          </div>
        </div>
      )}

      {/* ── Conteúdo da view ────────────────────────────────── */}
      {/* Desktop: flex 1 + overflow hidden para a grade fixa */}
      <div className="hidden md:flex md:flex-col md:overflow-hidden" style={{ flex: 1, padding: view === 'week' ? 0 : '12px 16px 0' }}>
        {view === 'week' && <WeekView currentDate={currentDate} appointments={appointments} onSlotClick={canCreate ? openCreate : undefined} onAppointmentClick={openEdit} onReschedule={canEdit ? handleReschedule : undefined} canEdit={canEdit} />}
        {view === 'month' && <MonthView currentDate={currentDate} appointments={appointments} onSlotClick={canCreate ? openCreate : undefined} onAppointmentClick={openEdit} onReschedule={canEdit ? handleReschedule : undefined} canEdit={canEdit} />}
        {view === 'year' && <YearView currentDate={currentDate} appointments={appointments} onMonthClick={handleMonthClick} />}
      </div>

      {/* Mobile: scroll natural */}
      <div className="flex md:hidden flex-col" style={{ padding: view === 'week' ? '8px 0' : '8px 16px' }}>
        {view === 'week' && <WeekView currentDate={currentDate} appointments={appointments} onSlotClick={canCreate ? openCreate : undefined} onAppointmentClick={openEdit} onReschedule={canEdit ? handleReschedule : undefined} canEdit={canEdit} />}
        {view === 'month' && <MonthView currentDate={currentDate} appointments={appointments} onSlotClick={canCreate ? openCreate : undefined} onAppointmentClick={openEdit} onReschedule={canEdit ? handleReschedule : undefined} canEdit={canEdit} />}
        {view === 'year' && <YearView currentDate={currentDate} appointments={appointments} onMonthClick={handleMonthClick} />}
      </div>

      {/* Modais */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filtros">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Select
            label="Colaborador"
            value={filterCollaboratorId}
            onChange={setFilterCollaboratorId}
            options={[
              { value: '', label: 'Todos os colaboradores' },
              ...(collaboratorsData?.data ?? []).map(c => ({ value: String(c.id), label: c.name })),
            ]}
            placeholder="Todos os colaboradores"
            className="max-w-[200px]"
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

      {modalOpen && (
        <AppointmentModal
          appointment={editingAppointment}
          prefilledDate={prefilledDate}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
          canDelete={canDelete}
        />
      )}
    </div>
  )
}
