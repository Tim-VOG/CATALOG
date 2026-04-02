import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/user-equipment'
import { useAuth } from '@/lib/auth'

export const useMyEquipment = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['user-equipment', 'mine', user?.id],
    queryFn: () => api.getMyEquipment(user.id),
    enabled: !!user?.id,
  })
}

export const useAllUserEquipment = () =>
  useQuery({
    queryKey: ['user-equipment', 'all'],
    queryFn: api.getAllUserEquipment,
  })

export const useAssignEquipment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.assignEquipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-equipment'] }),
  })
}

export const useAssignEquipmentBatch = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.assignEquipmentBatch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-equipment'] }),
  })
}

export const useUpdateUserEquipment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.updateUserEquipment(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-equipment'] }),
  })
}

export const useReturnEquipment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.returnEquipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-equipment'] }),
  })
}

export const useDeleteUserEquipment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteUserEquipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-equipment'] }),
  })
}
