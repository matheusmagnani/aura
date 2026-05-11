import { create } from 'zustand'
import type { DateRange } from '../../../shared/components/DateRangePicker'

interface DashboardClientFilterState {
  clientPage: number
  clientSearch: string
  clientFilterStatusIds: string[]
  clientFilterDateRange: DateRange
  clientFilterApptDateRange: DateRange
  setClientPage: (v: number) => void
  setClientSearch: (v: string) => void
  setClientFilterStatusIds: (v: string[]) => void
  setClientFilterDateRange: (v: DateRange) => void
  setClientFilterApptDateRange: (v: DateRange) => void
}

export const useDashboardClientFilterStore = create<DashboardClientFilterState>((set) => ({
  clientPage: 1,
  clientSearch: '',
  clientFilterStatusIds: [],
  clientFilterDateRange: {},
  clientFilterApptDateRange: {},
  setClientPage: (v) => set({ clientPage: v }),
  setClientSearch: (v) => set({ clientSearch: v, clientPage: 1 }),
  setClientFilterStatusIds: (v) => set({ clientFilterStatusIds: Array.isArray(v) ? v : [], clientPage: 1 }),
  setClientFilterDateRange: (v) => set({ clientFilterDateRange: v, clientPage: 1 }),
  setClientFilterApptDateRange: (v) => set({ clientFilterApptDateRange: v, clientPage: 1 }),
}))
