import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/locations'

export const useLocations = () =>
  useQuery({
    queryKey: ['locations'],
    queryFn: api.getLocations,
  })
