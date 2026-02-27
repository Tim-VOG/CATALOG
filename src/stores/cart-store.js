import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      startDate: '',
      endDate: '',

      setDates: (startDate, endDate) => set({ startDate, endDate }),

      addItem: (product, quantity = 1, options = {}) => {
        const items = get().items
        const existing = items.find((i) => i.product.id === product.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity, options: { ...i.options, ...options } }
                : i
            ),
          })
        } else {
          set({ items: [...items, { product, quantity, options }] })
        }
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.product.id !== productId) })
      },

      clearCart: () => set({ items: [], startDate: '', endDate: '' }),
    }),
    {
      name: 'vo-gear-hub-cart',
    }
  )
)
