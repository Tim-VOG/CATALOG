// Cart store — thin reactive layer on top of Supabase cart_items.
// Uses Zustand for optimistic UI (badge count, instant feedback)
// while the DB hooks handle persistence.
import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  // Local count for instant badge updates (synced from DB query)
  itemCount: 0,
  setItemCount: (count) => set({ itemCount: count }),
  getItemCount: () => get().itemCount,
}))
