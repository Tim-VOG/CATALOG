import { supabase } from '@/lib/supabase'

export type ExtensionStatus = 'pending' | 'approved' | 'rejected'

export interface ExtensionRequest {
  id: string
  request_id: string
  user_id: string
  requested_days: number
  reason: string
  status: ExtensionStatus
  granted_days: number | null
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // joined via extension_requests_with_details
  user_first_name?: string | null
  user_last_name?: string | null
  user_email?: string | null
  project_name?: string | null
  pickup_date?: string | null
  return_date?: string | null
  request_status?: string | null
  request_number?: string | null
  reviewer_first_name?: string | null
  reviewer_last_name?: string | null
}

export interface CreateExtensionInput {
  request_id: string
  user_id: string
  requested_days: number
  reason: string
}

/** Admin: every extension request with joined user + loan details. */
export const getExtensionRequests = async (): Promise<ExtensionRequest[]> => {
  const { data, error } = await supabase
    .from('extension_requests_with_details')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ExtensionRequest[]
}

/** A user's own extension requests for a given loan. */
export const getMyExtensionRequests = async (requestId: string): Promise<ExtensionRequest[]> => {
  const { data, error } = await supabase
    .from('extension_requests')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ExtensionRequest[]
}

export const createExtensionRequest = async (
  input: CreateExtensionInput,
): Promise<ExtensionRequest> => {
  const { data, error } = await supabase
    .from('extension_requests')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as ExtensionRequest
}

interface ReviewInput {
  id: string
  status: Exclude<ExtensionStatus, 'pending'>
  granted_days?: number | null
  admin_notes?: string | null
  reviewed_by: string
  /** current loan return_date — needed to push it out on approval */
  currentReturnDate?: string | null
}

/**
 * Approve or reject an extension. On approval with granted_days, the
 * linked loan's return_date is pushed out by that many days.
 */
export const reviewExtensionRequest = async (input: ReviewInput): Promise<ExtensionRequest> => {
  const { id, status, granted_days, admin_notes, reviewed_by, currentReturnDate } = input

  const { data, error } = await supabase
    .from('extension_requests')
    .update({
      status,
      granted_days: status === 'approved' ? (granted_days ?? null) : null,
      admin_notes: admin_notes ?? null,
      reviewed_by,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // On approval, extend the loan's return_date by the granted days.
  const ext = data as ExtensionRequest
  if (status === 'approved' && granted_days && currentReturnDate) {
    const newReturn = new Date(currentReturnDate)
    newReturn.setDate(newReturn.getDate() + granted_days)
    const iso = newReturn.toISOString().split('T')[0]
    const { error: loanError } = await supabase
      .from('loan_requests')
      .update({ return_date: iso })
      .eq('id', ext.request_id)
    if (loanError) throw loanError
  }

  return ext
}
