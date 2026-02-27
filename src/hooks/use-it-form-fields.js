import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getItFormFields,
  createItFormField,
  updateItFormField,
  deleteItFormField,
  reorderItFormFields,
} from '@/lib/api/it-form-fields'

// ── Query ──

export const useItFormFields = () =>
  useQuery({
    queryKey: ['it-form-fields'],
    queryFn: getItFormFields,
    retry: 1,
  })

// ── Mutations ──

export const useCreateItFormField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createItFormField,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it-form-fields'] }),
  })
}

export const useUpdateItFormField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }) => updateItFormField(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it-form-fields'] }),
  })
}

export const useDeleteItFormField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteItFormField,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it-form-fields'] }),
  })
}

export const useReorderItFormFields = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reorderItFormFields,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it-form-fields'] }),
  })
}
