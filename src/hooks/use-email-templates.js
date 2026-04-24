import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEmailTemplates, updateEmailTemplate } from '@/lib/api/email-templates'

export const useEmailTemplates = () =>
  useQuery({
    queryKey: ['email-templates'],
    queryFn: getEmailTemplates,
    retry: 2,
    staleTime: 30000,
  })

export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateEmailTemplate(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['email-templates'] }),
  })
}
