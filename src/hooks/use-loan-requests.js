import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/loan-requests'

export const useLoanRequests = () =>
  useQuery({
    queryKey: ['loan-requests'],
    queryFn: api.getLoanRequests,
  })

export const useMyLoanRequests = (userId) =>
  useQuery({
    queryKey: ['loan-requests', 'mine', userId],
    queryFn: () => api.getMyLoanRequests(userId),
    enabled: !!userId,
  })

export const useLoanRequest = (id) =>
  useQuery({
    queryKey: ['loan-requests', id],
    queryFn: () => api.getLoanRequest(id),
    enabled: !!id,
  })

export const useLoanRequestItems = (requestId) =>
  useQuery({
    queryKey: ['loan-request-items', requestId],
    queryFn: () => api.getLoanRequestItems(requestId),
    enabled: !!requestId,
  })

export const useCreateLoanRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createLoanRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
    },
  })
}

export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, ...data }) => api.updateRequestStatus(id, status, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
    },
  })
}

export const useCancelRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.cancelRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
    },
  })
}

export const useProcessReturn = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, ...data }) => api.processReturn(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      queryClient.invalidateQueries({ queryKey: ['loan-request-items'] })
      queryClient.invalidateQueries({ queryKey: ['planning'] })
    },
  })
}
