import { supabase } from '@/lib/supabase'

export const getLoanRequests = async () => {
  const { data, error } = await supabase
    .from('loan_requests_with_details')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getMyLoanRequests = async (userId) => {
  const { data, error } = await supabase
    .from('loan_requests_with_details')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getLoanRequest = async (id) => {
  const { data, error } = await supabase
    .from('loan_requests_with_details')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const getLoanRequestItems = async (requestId) => {
  const { data, error } = await supabase
    .from('loan_request_items_with_details')
    .select('*')
    .eq('request_id', requestId)
  if (error) throw error
  return data
}

export const getBatchLoanRequestItems = async (requestIds) => {
  if (!requestIds.length) return []
  const { data, error } = await supabase
    .from('loan_request_items_with_details')
    .select('*')
    .in('request_id', requestIds)
  if (error) throw error
  return data
}

export const createLoanRequest = async ({ request, items }) => {
  // Create the request
  const { data: req, error: reqError } = await supabase
    .from('loan_requests')
    .insert(request)
    .select()
    .single()
  if (reqError) throw reqError

  // Create the items
  const itemRows = items.map((item) => ({
    request_id: req.id,
    product_id: item.product.id,
    quantity: item.quantity,
    options: item.options || {},
  }))

  const { error: itemsError } = await supabase
    .from('loan_request_items')
    .insert(itemRows)
  if (itemsError) throw itemsError

  return req
}

export const updateRequestStatus = async (id, status, extraData = {}) => {
  const updates = { status, ...extraData }

  const { data, error } = await supabase
    .from('loan_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteLoanRequest = async (id) => {
  // Delete items first (foreign key), then the request
  const { error: itemsError } = await supabase
    .from('loan_request_items')
    .delete()
    .eq('request_id', id)
  if (itemsError) throw itemsError

  const { error } = await supabase
    .from('loan_requests')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export const deleteLoanRequests = async (ids) => {
  // Bulk delete: items first, then requests
  const { error: itemsError } = await supabase
    .from('loan_request_items')
    .delete()
    .in('request_id', ids)
  if (itemsError) throw itemsError

  const { error } = await supabase
    .from('loan_requests')
    .delete()
    .in('id', ids)
  if (error) throw error
}

export const processReturn = async (requestId, { itemReturns, admin_notes }) => {
  for (const item of itemReturns) {
    const { error } = await supabase
      .from('loan_request_items')
      .update({
        return_condition: item.return_condition,
        return_notes: item.return_notes || null,
        is_returned: item.is_returned,
      })
      .eq('id', item.id)
    if (error) throw error
  }
  return updateRequestStatus(requestId, 'ready', { admin_notes })
}
