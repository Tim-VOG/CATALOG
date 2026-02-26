import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/product-options'

export const useProductOptions = () =>
  useQuery({
    queryKey: ['product-options'],
    queryFn: api.getProductOptions,
  })

export const useAllProductOptions = () =>
  useQuery({
    queryKey: ['product-options', 'all'],
    queryFn: api.getAllProductOptions,
  })

export const useCreateProductOption = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createProductOption,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-options'] }),
  })
}

export const useUpdateProductOption = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.updateProductOption(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-options'] }),
  })
}

export const useDeleteProductOption = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteProductOption,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-options'] }),
  })
}
