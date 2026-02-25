import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getFormFields, getActiveFormFields, createFormField, updateFormField, deleteFormField } from '@/lib/api/form-fields'

export const useFormFields = () =>
  useQuery({
    queryKey: ['form-fields'],
    queryFn: getFormFields,
  })

export const useActiveFormFields = () =>
  useQuery({
    queryKey: ['form-fields', 'active'],
    queryFn: getActiveFormFields,
  })

export const useCreateFormField = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createFormField,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form-fields'] }),
  })
}

export const useUpdateFormField = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateFormField(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form-fields'] }),
  })
}

export const useDeleteFormField = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFormField,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['form-fields'] }),
  })
}
