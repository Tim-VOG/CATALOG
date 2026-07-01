import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/shared-mailboxes'

export const useSharedMailboxes = () =>
  useQuery({
    queryKey: ['shared-mailboxes'],
    queryFn: api.getSharedMailboxes,
  })

export const useCreateSharedMailbox = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createSharedMailbox,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-mailboxes'] }),
  })
}

export const useUpdateSharedMailbox = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: any) => api.updateSharedMailbox(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-mailboxes'] }),
  })
}

export const useDeleteSharedMailbox = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSharedMailbox,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-mailboxes'] }),
  })
}
