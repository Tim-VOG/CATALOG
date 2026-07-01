import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/audit-logs'

export const useAuditLogs = (filters: api.AuditLogFilters = {}) =>
  useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => api.getAuditLogs(filters),
  })
