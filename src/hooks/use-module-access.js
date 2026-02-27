import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getModuleAccessForUser,
  getAllModuleAccess,
  upsertModuleAccess,
} from '@/lib/api/module-access'

export const useModuleAccess = (userId) =>
  useQuery({
    queryKey: ['module-access', userId],
    queryFn: () => getModuleAccessForUser(userId),
    enabled: !!userId,
    retry: 1,
  })

export const useAllModuleAccess = () =>
  useQuery({
    queryKey: ['module-access-all'],
    queryFn: getAllModuleAccess,
    retry: 1,
  })

export const useUpsertModuleAccess = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, moduleKey, granted }) =>
      upsertModuleAccess(userId, moduleKey, granted),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['module-access'] })
      qc.invalidateQueries({ queryKey: ['module-access-all'] })
    },
  })
}
