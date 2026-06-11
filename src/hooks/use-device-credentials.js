import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/device-credentials'

export const useDeviceCredentials = () =>
  useQuery({
    queryKey: ['device-credentials'],
    queryFn: api.getDeviceCredentials,
  })

export const useCreateDeviceCredential = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createDeviceCredential,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-credentials'] }),
  })
}

export const useUpdateDeviceCredential = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => api.updateDeviceCredential(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-credentials'] }),
  })
}

export const useDeleteDeviceCredential = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteDeviceCredential,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-credentials'] }),
  })
}
