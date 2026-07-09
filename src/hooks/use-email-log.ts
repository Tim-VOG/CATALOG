import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEmailLog, clearEmailLog } from '@/lib/api/email-log'

export const useEmailLog = (limit = 300) =>
  useQuery({
    queryKey: ['email-log', limit],
    queryFn: () => getEmailLog(limit),
    retry: 1,
    refetchInterval: 30000, // keep the log fresh while an admin watches a send
  })

export const useClearEmailLog = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: clearEmailLog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-log'] }),
  })
}
