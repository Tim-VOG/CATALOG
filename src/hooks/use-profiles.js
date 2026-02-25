import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfiles, updateProfileRole, toggleProfileActive } from '@/lib/api/profiles'

export const useProfiles = (filters = {}) =>
  useQuery({
    queryKey: ['profiles', filters],
    queryFn: () => getProfiles(filters),
  })

export const useUpdateProfileRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }) => updateProfileRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export const useToggleProfileActive = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }) => toggleProfileActive(userId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}
