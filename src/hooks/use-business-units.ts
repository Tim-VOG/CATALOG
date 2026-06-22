import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/business-units'

const KEY = ['business-units']

export const useBusinessUnits = () =>
  useQuery({
    queryKey: KEY,
    queryFn: api.getBusinessUnits,
    staleTime: 5 * 60 * 1000,
  })

export const useCreateBusinessUnit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createBusinessUnit,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useUpdateBusinessUnit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & Partial<api.BusinessUnitInput>) =>
      api.updateBusinessUnit(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export const useDeleteBusinessUnit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteBusinessUnit,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
