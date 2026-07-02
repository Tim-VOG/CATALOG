import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/extension-requests'

const KEY = ['extension-requests']

/** Admin: all extension requests (joined details). */
export const useExtensionRequests = () =>
  useQuery({
    queryKey: KEY,
    queryFn: api.getExtensionRequests,
  })

/** A user's extension requests for one loan. */
export const useMyExtensionRequests = (requestId: string | undefined) =>
  useQuery({
    queryKey: ['extension-requests', 'loan', requestId],
    queryFn: () => api.getMyExtensionRequests(requestId as string),
    enabled: !!requestId,
  })

export const useCreateExtensionRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createExtensionRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extension-requests'] })
    },
  })
}

export const useReviewExtensionRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.reviewExtensionRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extension-requests'] })
      qc.invalidateQueries({ queryKey: ['loan-requests'] })
    },
  })
}
