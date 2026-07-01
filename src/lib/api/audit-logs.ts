import { supabase } from '@/lib/supabase'

export interface AuditLogRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
  actor_first_name: string | null
  actor_last_name: string | null
  actor_email: string | null
}

export interface AuditLogFilters {
  entityType?: string
  action?: string
  limit?: number
}

export const getAuditLogs = async ({ entityType, action, limit = 200 }: AuditLogFilters = {}): Promise<AuditLogRow[]> => {
  let query = supabase
    .from('audit_logs_with_details')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (entityType && entityType !== 'all') query = query.eq('entity_type', entityType)
  if (action && action !== 'all') query = query.ilike('action', `${action}%`)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as AuditLogRow[]
}
