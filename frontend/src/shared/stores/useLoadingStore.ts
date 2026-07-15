import { create } from 'zustand'

interface LoadingStore {
  // Contador de requisições de bloqueio em andamento (cadastro/edição).
  // Usa contador em vez de boolean pra suportar chamadas simultâneas.
  count: number
  start: () => void
  stop: () => void
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  count: 0,
  start: () => set((s) => ({ count: s.count + 1 })),
  stop: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}))
