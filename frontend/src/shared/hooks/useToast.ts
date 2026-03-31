import { create } from 'zustand'

type ToastType = 'success' | 'danger' | 'warning'

interface ToastState {
  message: string
  type: ToastType
  visible: boolean
  show: (message: string, type?: ToastType) => void
  hide: () => void
}

export const useToast = create<ToastState>((set) => ({
  message: '',
  type: 'success',
  visible: false,

  show: (message, type = 'success') => {
    set({ message, type, visible: true })
    setTimeout(() => set({ visible: false }), 3000)
  },

  hide: () => set({ visible: false }),
}))
