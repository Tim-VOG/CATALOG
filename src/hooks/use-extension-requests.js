import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getExtensionRequests,
  getPendingExtensions,
  getExtensionsByRequest,
  createExtensionRequest,
  approveExtension,
  rejectExtension,
} from '@/lib/api/extension-requests'

export const useExtensionRequests = () =>
  useQuery({ queryKey: ['extension-requests'], queryFn: getExtensionRequests })

export const usePendingExtensions = () =>
  useQuery({ queryKey: ['extension-requests', 'pending'], queryFn: getPendingExtensions })

export const useExtensionsByRequest = (requestId) =>
  useQuery({
    queryKey: ['extension-requests', 'by-request', requestId],
    queryFn: () => getExtensionsByRequest(requestId),
    enabled: !!requestId,
  })

export const useCreateExtension = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createExtensionRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extension-requests'] })
    },
  })
}

export const useApproveExtension = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => approveExtension(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extension-requests'] })
      qc.invalidateQueries({ queryKey: ['loan-requests'] })
      qc.invalidateQueries({ queryKey: ['planning'] })
    },
  })
}

export const useRejectExtension = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => rejectExtension(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extension-requests'] })
    },
  })
}
