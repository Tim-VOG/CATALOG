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
                ? { ...i, quantity: i.quantity + quantity }
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

      get itemCount() {
        return get().items.length
      },
    }),
    {
      name: 'vo-gear-hub-cart',
    }
  )
)
