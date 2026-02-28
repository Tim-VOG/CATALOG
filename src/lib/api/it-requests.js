import { supabase } from '@/lib/supabase'

// ── Admin: fetch all IT requests ──
export const getItRequests = async () => {
  const { data, error } = await supabase
    .from('it_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── User: fetch own IT requests ──
export const getMyItRequests = async (userId) => {
  const { data, error } = await supabase
    .from('it_requests')
    .select('*')
    .eq('requested_by', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Fetch single IT request ──
export const getItRequest = async (id) => {
  const { data, error } = await supabase
    .from('it_requests')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ── Create IT request ──
export const createItRequest = async (request) => {
  const { data, error } = await supabase
    .from('it_requests')
    .insert(request)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Update IT request ──
export const updateItRequest = async (id, updates) => {
  const { data, error } = await supabase
    .from('it_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Delete IT request ──
export const deleteItRequest = async (id) => {
  const { error } = await supabase
    .from('it_requests')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Bulk delete IT requests ──
export const deleteItRequests = async (ids) => {
  const { error } = await supabase
    .from('it_requests')
    .delete()
    .in('id', ids)
  if (error) throw error
}
