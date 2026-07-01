import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/qr-codes'

// ── QR Codes ──────────────────────────────────────────

export const useQRCodes = (filters = {}) =>
  useQuery({
    queryKey: ['qr-codes', filters],
    queryFn: () => api.getQRCodes(filters),
  })

export const useQRCode = (id: any) =>
  useQuery({
    queryKey: ['qr-codes', id],
    queryFn: () => api.getQRCode(id),
    enabled: !!id,
  })

export const useQRCodeByCode = (code: any) =>
  useQuery({
    queryKey: ['qr-codes', 'by-code', code],
    queryFn: () => api.getQRCodeByCode(code),
    enabled: !!code,
  })

export const useQRCodesAssignedTo = (userId: any) =>
  useQuery({
    queryKey: ['qr-codes', 'assigned-to', userId],
    queryFn: () => api.getQRCodesAssignedTo(userId),
    enabled: !!userId,
  })

export const useCreateQRCode = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createQRCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr-codes'] }),
  })
}

export const useCreateQRCodes = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createQRCodes,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr-codes'] }),
  })
}

export const useUpdateQRCode = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.updateQRCode(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr-codes'] }),
  })
}

export const useClaimQRCode = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...assignment }: any) => api.claimQRCode(id, assignment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr-codes'] }),
  })
}

export const useReleaseQRCode = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, expectedLoanRequestId }: any) => api.releaseQRCode(id, expectedLoanRequestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr-codes'] }),
  })
}

export const useDeleteQRCode = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteQRCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr-codes'] }),
  })
}

// ── Scan ──────────────────────────────────────────────

export const useProcessQRScan = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.processQRScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] })
      queryClient.invalidateQueries({ queryKey: ['qr-scan-logs'] })
    },
  })
}

// ── Scan Logs ──────────────────────────────────────────

export const useScanLogs = (filters = {}) =>
  useQuery({
    queryKey: ['qr-scan-logs', filters],
    queryFn: () => api.getScanLogs(filters),
  })

export const useScanLogsForProduct = (productId: any) =>
  useQuery({
    queryKey: ['qr-scan-logs', 'product', productId],
    queryFn: () => api.getScanLogsForProduct(productId),
    enabled: !!productId,
  })

export const useScanLogsForUser = (userId: any) =>
  useQuery({
    queryKey: ['qr-scan-logs', 'user', userId],
    queryFn: () => api.getScanLogsForUser(userId),
    enabled: !!userId,
  })

export const useScanLogsForQrCode = (qrCodeId: any) =>
  useQuery({
    queryKey: ['qr-scan-logs', 'qr', qrCodeId],
    queryFn: () => api.getScanLogsForQrCode(qrCodeId),
    enabled: !!qrCodeId,
  })

export const useOverdueScans = () =>
  useQuery({
    queryKey: ['qr-scan-logs', 'overdue'],
    queryFn: api.getOverdueScans,
  })

export const useUpcomingReturns = () =>
  useQuery({
    queryKey: ['qr-scan-logs', 'upcoming-returns'],
    queryFn: api.getUpcomingReturns,
  })

export const useActiveLoans = () =>
  useQuery({
    queryKey: ['qr-scan-logs', 'active-loans'],
    queryFn: api.getActiveLoans,
  })

export const useScanStatsByCategory = () =>
  useQuery({
    queryKey: ['qr-scan-logs', 'stats-by-category'],
    queryFn: api.getScanStatsByCategory,
  })

export const useTakeCounts = (days = 90) =>
  useQuery({
    queryKey: ['qr-scan-logs', 'take-counts', days],
    queryFn: () => api.getTakeCounts(days),
  })
