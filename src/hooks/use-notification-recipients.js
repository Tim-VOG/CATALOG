import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotificationRecipients, createNotificationRecipient, updateNotificationRecipient, deleteNotificationRecipient } from '@/lib/api/notification-recipients'

export const useNotificationRecipients = () =>
  useQuery({
    queryKey: ['notification-recipients'],
    queryFn: getNotificationRecipients,
  })

export const useCreateNotificationRecipient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createNotificationRecipient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-recipients'] }),
  })
}

export const useUpdateNotificationRecipient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => updateNotificationRecipient(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-recipients'] }),
  })
}

export const useDeleteNotificationRecipient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteNotificationRecipient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-recipients'] }),
  })
}
