import {
  startOfYear,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Appointment } from '../../../shared/services/scheduleService'

const MONTH_NAMES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const DAY_LETTERS = ['D','S','T','Q','Q','S','S']

interface YearViewProps {
  currentDate: Date
  appointments: Appointment[]
  onMonthClick: (monthStart: Date) => void
}

function MiniMonth({
  monthDate,
  appointments,
  onMonthClick,
}: {
  monthDate: Date
  appointments: Appointment[]
  onMonthClick: (d: Date) => void
}) {
  const today = new Date()
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })

  const days: Date[] = []
  let d = gridStart
  while (d <= monthEnd || days.length % 7 !== 0) {
    days.push(d)
    d = addDays(d, 1)
    if (days.length > 42) break
  }

  const apptDays = new Set(
    appointments
      .filter((a) => isSameMonth(parseISO(a.startAt), monthDate))
      .map((a) => format(parseISO(a.startAt), 'yyyy-MM-dd'))
  )

  return (
    <div
      onClick={() => onMonthClick(monthStart)}
      style={{
        background: 'var(--color-app-primary)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '10px 10px 8px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(106,166,193,0.4)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-app-secondary)', marginBottom: 8, textTransform: 'capitalize' }}>
        {format(monthDate, 'MMMM', { locale: ptBR })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
        {DAY_LETTERS.map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--color-app-gray)', paddingBottom: 2 }}>
            {l}
          </div>
        ))}
        {days.map((day, i) => {
          const isCurrentMonth = isSameMonth(day, monthDate)
          const isToday = isSameDay(day, today)
          const hasAppt = apptDays.has(format(day, 'yyyy-MM-dd'))
          return (
            <div
              key={i}
              style={{
                textAlign: 'center',
                fontSize: 10,
                position: 'relative',
                opacity: isCurrentMonth ? 1 : 0.25,
                color: isToday ? 'var(--color-app-accent)' : 'white',
                fontWeight: isToday ? 700 : 400,
                padding: '1px 0',
              }}
            >
              {format(day, 'd')}
              {hasAppt && isCurrentMonth && (
                <div style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--color-app-accent)',
                  position: 'absolute',
                  bottom: -1,
                  left: '50%',
                  transform: 'translateX(-50%)',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function YearView({ currentDate, appointments, onMonthClick }: YearViewProps) {
  const yearStart = startOfYear(currentDate)
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i))

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 12,
      padding: '8px 0 80px',
    }}
      className="md:grid-cols-3 lg:grid-cols-4"
    >
      {months.map((month, i) => (
        <MiniMonth
          key={i}
          monthDate={month}
          appointments={appointments}
          onMonthClick={onMonthClick}
        />
      ))}
    </div>
  )
}
