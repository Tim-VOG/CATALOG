import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMailboxFormFields,
  createMailboxFormField,
  updateMailboxFormField,
  deleteMailboxFormField,
  reorderMailboxFormFields,
} from '@/lib/api/mailbox-form-fields'

// ── Query ──

export const useMailboxFormFields = () =>
  useQuery({
    queryKey: ['mailbox-form-fields'],
    queryFn: getMailboxFormFields,
    retry: 1,
  })

// ── Mutations ──

export const useCreateMailboxFormField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMailboxFormField,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mailbox-form-fields'] }),
  })
}

export const useUpdateMailboxFormField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }) => updateMailboxFormField(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mailbox-form-fields'] }),
  })
}

export const useDeleteMailboxFormField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteMailboxFormField,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mailbox-form-fields'] }),
  })
}

export const useReorderMailboxFormFields = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reorderMailboxFormFields,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mailbox-form-fields'] }),
  })
}
