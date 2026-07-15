import { useQuery } from '@tanstack/react-query'
import { getPeopleDirectory } from '@/lib/api/people-directory'

export const usePeopleDirectory = () =>
  useQuery({
    queryKey: ['people-directory'],
    queryFn: getPeopleDirectory,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
