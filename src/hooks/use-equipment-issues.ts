import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/equipment-issues'

export const useEquipmentIssues = (status?: string) =>
  useQuery({
    queryKey: ['equipment-issues', status],
    queryFn: () => api.getEquipmentIssues(status),
  })

export const useCreateEquipmentIssue = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createEquipmentIssue,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-issues'] }),
  })
}

export const useResolveEquipmentIssue = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.resolveEquipmentIssue,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment-issues'] }),
  })
}
