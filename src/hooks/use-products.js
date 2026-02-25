import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/products'

export const useProducts = (filters = {}) =>
  useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.getProducts(filters),
  })

export const useProduct = (id) =>
  useQuery({
    queryKey: ['products', id],
    queryFn: () => api.getProduct(id),
    enabled: !!id,
  })

export const useCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.updateProduct(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useDeleteProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useProductReservations = (productId) =>
  useQuery({
    queryKey: ['product-reservations', productId],
    queryFn: () => api.getProductReservations(productId),
    enabled: !!productId,
  })
