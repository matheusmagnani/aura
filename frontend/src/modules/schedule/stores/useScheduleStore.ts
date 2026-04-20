import { create } from 'zustand'
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  addWeeks,
  addMonths,
  addYears,
  subWeeks,
  subMonths,
  subYears,
} from 'date-fns'

export type CalendarView = 'week' | 'month' | 'year'

interface ScheduleStore {
  view: CalendarView
  currentDate: Date
  setView: (v: CalendarView) => void
  setCurrentDate: (d: Date) => void
  navigate: (dir: 'prev' | 'next') => void
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  view: 'week',
  currentDate: startOfWeek(new Date(), { weekStartsOn: 0 }),

  setView: (v) => {
    const now = new Date()
    const dateMap: Record<CalendarView, Date> = {
      week: startOfWeek(now, { weekStartsOn: 0 }),
      month: startOfMonth(now),
      year: startOfYear(now),
    }
    set({ view: v, currentDate: dateMap[v] })
  },

  setCurrentDate: (d) => set({ currentDate: d }),

  navigate: (dir) => {
    const { view, currentDate } = get()
    const fns = {
      week: dir === 'next' ? addWeeks : subWeeks,
      month: dir === 'next' ? addMonths : subMonths,
      year: dir === 'next' ? addYears : subYears,
    }
    set({ currentDate: fns[view](currentDate, 1) })
  },
}))
