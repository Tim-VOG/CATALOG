import { useQuery } from '@tanstack/react-query'
import { getPlanningData } from '@/lib/api/planning'

export const usePlanning = (startDate, endDate) =>
  useQuery({
    queryKey: ['planning', startDate, endDate],
    queryFn: () => getPlanningData({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
  })
