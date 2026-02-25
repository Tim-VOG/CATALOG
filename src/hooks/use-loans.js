import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/loans'

export const useLoans = () =>
  useQuery({
    queryKey: ['loans'],
    queryFn: api.getLoans,
  })

export const useCreateLoan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createLoan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] }),
  })
}

export const useUpdateLoanStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, ...data }) => api.updateLoanStatus(id, status, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] }),
  })
}

export const useReturnLoan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.returnLoan(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] }),
  })
}
