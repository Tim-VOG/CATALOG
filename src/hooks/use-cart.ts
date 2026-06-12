import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import * as api from '@/lib/api/cart'

interface AddToCartInput {
  productId: string
  quantity: number
  options?: Record<string, unknown>
}

interface UpdateCartItemInput {
  id: string
  [key: string]: unknown
}

export const useCart = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => api.getCartItems(user!.id),
    enabled: !!user?.id,
  })
}

export const useAddToCart = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ productId, quantity, options }: AddToCartInput) =>
      api.addToCart({ userId: user!.id, productId, quantity, options }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: UpdateCartItemInput) => api.updateCartItem(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export const useRemoveFromCart = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.removeFromCart,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export const useClearCart = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: () => api.clearCart(user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export const useCheckoutCart = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.checkoutCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
    },
  })
}
