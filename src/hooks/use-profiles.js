import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProfiles, updateProfile, updateProfileRole, toggleProfileActive, deleteProfile } from '@/lib/api/profiles'

export const useProfiles = (filters = {}) =>
  useQuery({
    queryKey: ['profiles', filters],
    queryFn: () => getProfiles(filters),
  })

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, ...updates }) => updateProfile(userId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

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
