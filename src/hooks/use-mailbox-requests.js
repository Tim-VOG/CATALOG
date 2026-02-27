import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMailboxRequests,
  getMyMailboxRequests,
  getMailboxRequest,
  createMailboxRequest,
  updateMailboxRequest,
  deleteMailboxRequest,
} from '@/lib/api/mailbox-requests'

// ── Queries ──

export const useMailboxRequests = () =>
  useQuery({
    queryKey: ['mailbox-requests'],
    queryFn: getMailboxRequests,
    retry: 1,
  })

export const useMyMailboxRequests = () =>
  useQuery({
    queryKey: ['my-mailbox-requests'],
    queryFn: getMyMailboxRequests,
    retry: 1,
  })

export const useMailboxRequest = (id) =>
  useQuery({
    queryKey: ['mailbox-request', id],
    queryFn: () => getMailboxRequest(id),
    enabled: !!id,
    retry: 1,
  })

// ── Mutations ──

export const useCreateMailboxRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMailboxRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mailbox-requests'] })
      qc.invalidateQueries({ queryKey: ['my-mailbox-requests'] })
    },
  })
}

export const useUpdateMailboxRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }) => updateMailboxRequest(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mailbox-requests'] })
      qc.invalidateQueries({ queryKey: ['my-mailbox-requests'] })
    },
  })
}

export const useDeleteMailboxRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteMailboxRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mailbox-requests'] })
      qc.invalidateQueries({ queryKey: ['my-mailbox-requests'] })
    },
  })
}
