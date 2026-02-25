import { supabase } from '@/lib/supabase'

export const getExtensionRequests = async () => {
  const { data, error } = await supabase
    .from('extension_requests_with_details')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getPendingExtensions = async () => {
  const { data, error } = await supabase
    .from('extension_requests_with_details')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export const getExtensionsByRequest = async (requestId) => {
  const { data, error } = await supabase
    .from('extension_requests_with_details')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createExtensionRequest = async ({ request_id, user_id, requested_days, reason }) => {
  const { data, error } = await supabase
    .from('extension_requests')
    .insert({ request_id, user_id, requested_days, reason })
    .select()
    .single()
  if (error) throw error
  return data
}

export const approveExtension = async (id, { granted_days, admin_notes }) => {
  const userId = (await supabase.auth.getUser()).data.user?.id

  // Update the extension request
  const { data: ext, error: extError } = await supabase
    .from('extension_requests')
    .update({
      status: 'approved',
      granted_days,
      admin_notes,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, loan_requests:request_id(id, return_date)')
    .single()
  if (extError) throw extError

  // Update the loan request return_date
  const currentReturnDate = new Date(ext.loan_requests.return_date)
  currentReturnDate.setDate(currentReturnDate.getDate() + granted_days)
  const newReturnDate = currentReturnDate.toISOString().split('T')[0]

  const { error: lrError } = await supabase
    .from('loan_requests')
    .update({ return_date: newReturnDate })
    .eq('id', ext.request_id)
  if (lrError) throw lrError

  return ext
}

export const rejectExtension = async (id, { admin_notes }) => {
  const userId = (await supabase.auth.getUser()).data.user?.id

  const { data, error } = await supabase
    .from('extension_requests')
    .update({
      status: 'rejected',
      admin_notes,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
