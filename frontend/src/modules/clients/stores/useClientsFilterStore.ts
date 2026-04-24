import { create } from 'zustand'
import type { DateRange } from '../../../shared/components/DateRangePicker'

interface ClientsFilterState {
  search: string
  page: number
  filterStatusIds: string[]
  filterUserIds: string[]
  filterDateRange: DateRange
  filterAppointmentDateRange: DateRange
  setSearch: (v: string) => void
  setPage: (v: number) => void
  setFilterStatusIds: (v: string[]) => void
  setFilterUserIds: (v: string[]) => void
  setFilterDateRange: (v: DateRange) => void
  setFilterAppointmentDateRange: (v: DateRange) => void
}

export const useClientsFilterStore = create<ClientsFilterState>((set) => ({
  search: '',
  page: 1,
  filterStatusIds: [],
  filterUserIds: [],
  filterDateRange: {},
  filterAppointmentDateRange: {},
  setSearch: (v) => set({ search: v, page: 1 }),
  setPage: (v) => set({ page: v }),
  setFilterStatusIds: (v) => set({ filterStatusIds: v, page: 1 }),
  setFilterUserIds: (v) => set({ filterUserIds: v, page: 1 }),
  setFilterDateRange: (v) => set({ filterDateRange: v, page: 1 }),
  setFilterAppointmentDateRange: (v) => set({ filterAppointmentDateRange: v, page: 1 }),
}))
