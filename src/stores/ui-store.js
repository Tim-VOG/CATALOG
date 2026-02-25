import { create } from 'zustand'

export const useUIStore = create((set) => ({
  toast: null,
  mobileNavOpen: false,

  showToast: (message, type = 'success') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 4000)
  },

  clearToast: () => set({ toast: null }),

  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
}))
