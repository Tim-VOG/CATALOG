import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getItRequests,
  getMyItRequests,
  getItRequest,
  createItRequest,
  updateItRequest,
  deleteItRequest,
  deleteItRequests,
} from '@/lib/api/it-requests'

// ── Queries ──

export const useItRequests = () =>
  useQuery({
    queryKey: ['it-requests'],
    queryFn: getItRequests,
    retry: 1,
  })

export const useMyItRequests = (userId) =>
  useQuery({
    queryKey: ['my-it-requests', userId],
    queryFn: () => getMyItRequests(userId),
    enabled: !!userId,
    retry: 1,
  })

export const useItRequest = (id) =>
  useQuery({
    queryKey: ['it-request', id],
    queryFn: () => getItRequest(id),
    enabled: !!id,
    retry: 1,
  })

// ── Mutations ──

export const useCreateItRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createItRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['it-requests'] })
      qc.invalidateQueries({ queryKey: ['my-it-requests'] })
    },
  })
}

export const useUpdateItRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }) => updateItRequest(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['it-requests'] })
      qc.invalidateQueries({ queryKey: ['my-it-requests'] })
    },
  })
}

export const useDeleteItRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteItRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['it-requests'] })
      qc.invalidateQueries({ queryKey: ['my-it-requests'] })
    },
  })
}

export const useDeleteItRequests = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteItRequests,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['it-requests'] })
      qc.invalidateQueries({ queryKey: ['my-it-requests'] })
    },
  })
}
