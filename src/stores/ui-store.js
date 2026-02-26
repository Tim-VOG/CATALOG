import { create } from 'zustand'
import { toast } from 'sonner'

export const useUIStore = create((set) => ({
  mobileNavOpen: false,

  showToast: (message, type = 'success') => {
    if (type === 'error') {
      toast.error(message)
    } else {
      toast.success(message)
    }
  },

  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
}))
