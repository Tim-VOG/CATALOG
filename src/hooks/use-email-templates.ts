import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getEmailTemplates,
  updateEmailTemplate,
  createEmailTemplateOverride,
  deleteEmailTemplate,
  normalizeBU,
} from '@/lib/api/email-templates'

export const useEmailTemplates = (businessUnit: any = '') =>
  useQuery({
    queryKey: ['email-templates', normalizeBU(businessUnit)],
    queryFn: () => getEmailTemplates(businessUnit),
    retry: 2,
    staleTime: 30000,
  })

export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: any) => updateEmailTemplate(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
  })
}

export const useCreateEmailTemplateOverride = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ base, businessUnit, updates }: any) => createEmailTemplateOverride(base, businessUnit, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
  })
}

export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: any) => deleteEmailTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
  })
}
