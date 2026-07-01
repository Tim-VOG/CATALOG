import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAppSettings, updateAppSettings } from '@/lib/api/settings'

export const useAppSettings = () =>
  useQuery({
    queryKey: ['app-settings'],
    queryFn: getAppSettings,
    staleTime: 1000 * 60 * 10, // 10 min — settings rarely change
  })

export const useUpdateAppSettings = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateAppSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['app-settings'], data)
    },
  })
}
