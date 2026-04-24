import { create } from 'zustand'

interface ProposalsFilterState {
  search: string
  page: number
  filterStatus: string[]
  filterCollaboratorIds: string[]
  setSearch: (v: string) => void
  setPage: (v: number) => void
  setFilterStatus: (v: string[]) => void
  setFilterCollaboratorIds: (v: string[]) => void
}

export const useProposalsFilterStore = create<ProposalsFilterState>((set) => ({
  search: '',
  page: 1,
  filterStatus: [],
  filterCollaboratorIds: [],
  setSearch: (v) => set({ search: v, page: 1 }),
  setPage: (v) => set({ page: v }),
  setFilterStatus: (v) => set({ filterStatus: v, page: 1 }),
  setFilterCollaboratorIds: (v) => set({ filterCollaboratorIds: v, page: 1 }),
}))
