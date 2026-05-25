import { create } from 'zustand'

interface DateRange { from?: Date | null; to?: Date | null }

interface ProposalsFilterState {
  search: string
  page: number
  filterStatus: string[]
  filterCollaboratorIds: string[]
  filterDateRange: DateRange
  filterStatusChangedRange: DateRange
  setSearch: (v: string) => void
  setPage: (v: number) => void
  setFilterStatus: (v: string[]) => void
  setFilterCollaboratorIds: (v: string[]) => void
  setFilterDateRange: (v: DateRange) => void
  setFilterStatusChangedRange: (v: DateRange) => void
}

export const useProposalsFilterStore = create<ProposalsFilterState>((set) => ({
  search: '',
  page: 1,
  filterStatus: [],
  filterCollaboratorIds: [],
  filterDateRange: { from: null, to: null },
  filterStatusChangedRange: { from: null, to: null },
  setSearch: (v) => set({ search: v, page: 1 }),
  setPage: (v) => set({ page: v }),
  setFilterStatus: (v) => set({ filterStatus: v, page: 1 }),
  setFilterCollaboratorIds: (v) => set({ filterCollaboratorIds: v, page: 1 }),
  setFilterDateRange: (v) => set({ filterDateRange: v, page: 1 }),
  setFilterStatusChangedRange: (v) => set({ filterStatusChangedRange: v, page: 1 }),
}))
