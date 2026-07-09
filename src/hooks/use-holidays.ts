import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHolidays, createHoliday, deleteHoliday } from '@/lib/api/holidays'

export const useHolidays = () =>
  useQuery({
    queryKey: ['holidays'],
    queryFn: getHolidays,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

export const useCreateHoliday = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createHoliday,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  })
}

export const useDeleteHoliday = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['holidays'] }),
  })
}
