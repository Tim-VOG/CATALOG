import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfile, getProfiles, updateProfile, updateProfileRole, toggleProfileActive, deleteProfile } from '@/lib/api/profiles'

export const useProfiles = (filters = {}) =>
  useQuery({
    queryKey: ['profiles', filters],
    queryFn: () => getProfiles(filters),
  })

export const useProfile = (userId: any) =>
  useQuery({
    queryKey: ['profiles', 'one', userId],
    queryFn: () => getProfile(userId),
    enabled: !!userId,
  })

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, ...updates }: any) => updateProfile(userId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export const useUpdateProfileRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: any) => updateProfileRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export const useToggleProfileActive = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }: any) => toggleProfileActive(userId, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

export const useDeleteProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId) => deleteProfile(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['module-access'] })
    },
  })
}
