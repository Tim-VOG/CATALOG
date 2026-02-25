import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/subscription-plans'

export const useSubscriptionPlans = () =>
  useQuery({
    queryKey: ['subscription-plans'],
    queryFn: api.getSubscriptionPlans,
  })
