import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/feedback'

const KEY = ['feedback']

export const useFeedback = () =>
  useQuery({ queryKey: KEY, queryFn: api.getFeedback, staleTime: 60 * 1000 })

export const useUpdateFeedbackStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'new' | 'seen' | 'done' }) =>
      api.updateFeedbackStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useDeleteFeedback = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteFeedback(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
