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

  if (status === 'approved') {
    updates.approved_at = new Date().toISOString()
    updates.approved_by = (await supabase.auth.getUser()).data.user?.id
  }
  if (status === 'picked_up') updates.picked_up_at = new Date().toISOString()
  if (status === 'returned') updates.returned_at = new Date().toISOString()
  if (status === 'closed') updates.closed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('loan_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const cancelRequest = async (id) => {
  return updateRequestStatus(id, 'cancelled')
}

export const processReturn = async (requestId, { itemReturns, admin_notes }) => {
  // Update each item's return details
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

  // Update the request status to returned
  return updateRequestStatus(requestId, 'returned', { admin_notes })
}
