import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/loan-requests'

export const useLoanRequests = () =>
  useQuery({
    queryKey: ['loan-requests'],
    queryFn: api.getLoanRequests,
  })

export const useMyLoanRequests = (userId: any) =>
  useQuery({
    queryKey: ['loan-requests', 'mine', userId],
    queryFn: () => api.getMyLoanRequests(userId),
    enabled: !!userId,
  })

export const useLoanRequest = (id: any) =>
  useQuery({
    queryKey: ['loan-requests', id],
    queryFn: () => api.getLoanRequest(id),
    enabled: !!id,
  })

export const useLoanRequestItems = (requestId: any) =>
  useQuery({
    queryKey: ['loan-request-items', requestId],
    queryFn: () => api.getLoanRequestItems(requestId),
    enabled: !!requestId,
  })

export const useBatchLoanRequestItems = (requestIds: any) =>
  useQuery({
    queryKey: ['loan-request-items', 'batch', requestIds],
    queryFn: () => api.getBatchLoanRequestItems(requestIds),
    enabled: requestIds.length > 0,
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

export const useUpdateLoanRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: any) => api.updateLoanRequest(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loan-requests'] }),
  })
}

export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, ...data }: any) => api.updateRequestStatus(id, status, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
    },
  })
}


export const useDeleteLoanRequest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteLoanRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      queryClient.invalidateQueries({ queryKey: ['planning'] })
    },
  })
}

export const useDeleteLoanRequests = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteLoanRequests,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      queryClient.invalidateQueries({ queryKey: ['planning'] })
    },
  })
}

export const useProcessReturn = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, ...data }: any) => api.processReturn(requestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      queryClient.invalidateQueries({ queryKey: ['loan-request-items'] })
      queryClient.invalidateQueries({ queryKey: ['planning'] })
    },
  })
}
