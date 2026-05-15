import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOnboardingByToken,
  submitPersonalInfo,
  getPersonalInfoSubmissionsForRequests,
} from '@/lib/api/personal-info'

export const useOnboardingByToken = (token) =>
  useQuery({
    queryKey: ['onboarding-token', token],
    queryFn: () => getOnboardingByToken(token),
    enabled: !!token,
    retry: 0,
  })

export const useSubmitPersonalInfo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ token, personalEmail }) => submitPersonalInfo(token, personalEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-info-submissions'] })
    },
  })
}

export const usePersonalInfoSubmissions = (requestIds) =>
  useQuery({
    queryKey: ['personal-info-submissions', (requestIds || []).slice().sort().join(',')],
    queryFn: () => getPersonalInfoSubmissionsForRequests(requestIds),
    enabled: Array.isArray(requestIds) && requestIds.length > 0,
  })
