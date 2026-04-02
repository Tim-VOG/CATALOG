import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import * as api from '@/lib/api/cart'

export const useCart = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => api.getCartItems(user.id),
    enabled: !!user?.id,
  })
}

export const useAddToCart = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ productId, quantity, options }) =>
      api.addToCart({ userId: user.id, productId, quantity, options }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => api.updateCartItem(id, updates),
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
    mutationFn: () => api.clearCart(user.id),
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
