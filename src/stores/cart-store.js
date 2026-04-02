import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      comment: '',

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity, options: {} }] }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }))
      },

      updateItemOptions: (productId, options) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, options } : i
          ),
        }))
      },

      setComment: (comment) => set({ comment }),

      clearCart: () => set({ items: [], comment: '' }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      hasItem: (productId) => get().items.some((i) => i.product.id === productId),
    }),
    {
      name: 'vo-cart',
      partialize: (state) => ({
        items: state.items,
        comment: state.comment,
      }),
    }
  )
)
