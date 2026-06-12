// Cart store — thin reactive layer on top of Supabase cart_items.
// Uses Zustand for optimistic UI (badge count, instant feedback)
// while the DB hooks handle persistence.
import { create } from 'zustand'

export interface CartStore {
  itemCount: number
  setItemCount: (count: number) => void
  getItemCount: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  itemCount: 0,
  setItemCount: (count) => set({ itemCount: count }),
  getItemCount: () => get().itemCount,
}))
