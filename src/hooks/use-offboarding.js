import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOffboardingProcesses,
  createOffboardingProcess,
  updateOffboardingProcess,
  deleteOffboardingProcess,
  getOffboardingFormFields,
  createOffboardingFormField,
  updateOffboardingFormField,
  deleteOffboardingFormField,
} from '@/lib/api/offboarding'

// ── Offboarding Processes ──

export const useOffboardingProcesses = () =>
  useQuery({ queryKey: ['offboarding-processes'], queryFn: getOffboardingProcesses })

export const useCreateOffboarding = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOffboardingProcess,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-processes'] }),
  })
}

export const useUpdateOffboarding = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateOffboardingProcess(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-processes'] }),
  })
}

export const useDeleteOffboarding = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteOffboardingProcess,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-processes'] }),
  })
}

// ── Offboarding Form Fields ──

export const useOffboardingFormFields = () =>
  useQuery({ queryKey: ['offboarding-form-fields'], queryFn: getOffboardingFormFields })

export const useCreateOffboardingField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOffboardingFormField,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-form-fields'] }),
  })
}

export const useUpdateOffboardingField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateOffboardingFormField(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-form-fields'] }),
  })
}

export const useDeleteOffboardingField = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteOffboardingFormField,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-form-fields'] }),
  })
}
