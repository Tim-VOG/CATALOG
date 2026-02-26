import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/subscription-plans'

export const useSubscriptionPlans = () =>
  useQuery({
    queryKey: ['subscription-plans'],
    queryFn: api.getSubscriptionPlans,
  })

export const useAllSubscriptionPlans = () =>
  useQuery({
    queryKey: ['subscription-plans', 'all'],
    queryFn: api.getAllSubscriptionPlans,
  })

export const useCreateSubscriptionPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createSubscriptionPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription-plans'] }),
  })
}

export const useUpdateSubscriptionPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.updateSubscriptionPlan(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription-plans'] }),
  })
}

export const useDeleteSubscriptionPlan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSubscriptionPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscription-plans'] }),
  })
}
