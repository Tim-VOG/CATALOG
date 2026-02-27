import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOnboardingRecipients,
  createOnboardingRecipient,
  updateOnboardingRecipient,
  deleteOnboardingRecipient,
  getOnboardingBlockTemplates,
  getOnboardingEmails,
  getOnboardingEmail,
  createOnboardingEmail,
  updateOnboardingEmail,
  deleteOnboardingEmail,
} from '@/lib/api/onboarding'

// ── Recipients ──

export const useOnboardingRecipients = () =>
  useQuery({
    queryKey: ['onboarding-recipients'],
    queryFn: getOnboardingRecipients,
    retry: 1,
  })

export const useCreateRecipient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOnboardingRecipient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-recipients'] }),
  })
}

export const useUpdateRecipient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateOnboardingRecipient(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-recipients'] }),
  })
}

export const useDeleteRecipient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteOnboardingRecipient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-recipients'] }),
  })
}

// ── Block Templates ──

export const useOnboardingBlockTemplates = () =>
  useQuery({
    queryKey: ['onboarding-block-templates'],
    queryFn: getOnboardingBlockTemplates,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 min — block templates rarely change
  })

// ── Emails ──

export const useOnboardingEmails = () =>
  useQuery({
    queryKey: ['onboarding-emails'],
    queryFn: getOnboardingEmails,
    retry: 1,
  })

export const useOnboardingEmail = (id) =>
  useQuery({
    queryKey: ['onboarding-emails', id],
    queryFn: () => getOnboardingEmail(id),
    enabled: !!id,
    retry: 1,
  })

export const useCreateEmail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOnboardingEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-emails'] }),
  })
}

export const useUpdateEmail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateOnboardingEmail(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-emails'] }),
  })
}

export const useDeleteEmail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteOnboardingEmail,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-emails'] }),
  })
}
