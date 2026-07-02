import { create } from 'zustand'
import { toast } from 'sonner'

export type ToastType = 'success' | 'error' | 'info'

export interface UIStore {
  mobileNavOpen: boolean
  showToast: (message: string, type?: ToastType) => void
  toggleMobileNav: () => void
  closeMobileNav: () => void
}

export const useUIStore = create<UIStore>((set: any) => ({
  mobileNavOpen: false,

  showToast: (message, type = 'success') => {
    if (type === 'error') toast.error(message)
    else if (type === 'info') toast.info(message)
    else toast.success(message)
  },

  toggleMobileNav: () => set((s: any) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
}))
