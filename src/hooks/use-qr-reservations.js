import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/qr-reservations'

// ── Reservations ──

export const useReservations = (filters = {}) =>
  useQuery({
    queryKey: ['qr-reservations', filters],
    queryFn: () => api.getReservations(filters),
  })

export const useCreateReservation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createReservation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-reservations'] }),
  })
}

export const useCancelReservation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.cancelReservation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-reservations'] }),
  })
}

// ── Waitlist ──

export const useWaitlist = (productId) =>
  useQuery({
    queryKey: ['qr-waitlist', productId],
    queryFn: () => api.getWaitlist(productId),
    enabled: !!productId,
  })

export const useJoinWaitlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.joinWaitlist,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-waitlist'] }),
  })
}

export const useLeaveWaitlist = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, userId }) => api.leaveWaitlist(productId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-waitlist'] }),
  })
}

// ── Lost Mode ──

export const useLostItems = () =>
  useQuery({
    queryKey: ['qr-lost-items'],
    queryFn: api.getLostItems,
  })

export const useReportLost = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ scanLogId, notes }) => api.reportLost(scanLogId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qr-lost-items'] })
      qc.invalidateQueries({ queryKey: ['qr-scan-logs'] })
    },
  })
}

export const useResolveLost = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.resolveLost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qr-lost-items'] })
      qc.invalidateQueries({ queryKey: ['qr-scan-logs'] })
    },
  })
}
