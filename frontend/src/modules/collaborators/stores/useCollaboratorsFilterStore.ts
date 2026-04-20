import { create } from 'zustand'

interface CollaboratorsFilterState {
  search: string
  page: number
  statusFilters: string[]
  roleIds: string[]
  setSearch: (v: string) => void
  setPage: (v: number) => void
  setStatusFilters: (v: string[]) => void
  setRoleIds: (v: string[]) => void
}

export const useCollaboratorsFilterStore = create<CollaboratorsFilterState>((set) => ({
  search: '',
  page: 1,
  statusFilters: [],
  roleIds: [],
  setSearch: (v) => set({ search: v, page: 1 }),
  setPage: (v) => set({ page: v }),
  setStatusFilters: (v) => set({ statusFilters: v, page: 1 }),
  setRoleIds: (v) => set({ roleIds: v, page: 1 }),
}))
