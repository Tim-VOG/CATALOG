import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvitations, createInvitation, deleteInvitation } from '@/lib/api/invitations'

export const useInvitations = (status = 'pending') =>
  useQuery({
    queryKey: ['invitations', status],
    queryFn: () => getInvitations(status),
  })

export const useCreateInvitation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  })
}

export const useDeleteInvitation = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  })
}
