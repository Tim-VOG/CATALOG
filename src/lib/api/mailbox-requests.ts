import { supabase } from '@/lib/supabase'

// ── Admin: fetch all mailbox requests ──
export const getMailboxRequests = async () => {
  const { data, error } = await supabase
    .from('mailbox_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── User: fetch own mailbox requests ──
export const getMyMailboxRequests = async (userId: any) => {
  const { data, error } = await supabase
    .from('mailbox_requests')
    .select('*')
    .eq('requested_by', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Fetch single mailbox request ──
export const getMailboxRequest = async (id: any) => {
  const { data, error } = await supabase
    .from('mailbox_requests')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ── Create mailbox request ──
export const createMailboxRequest = async (request: any) => {
  const { data, error } = await supabase
    .from('mailbox_requests')
    .insert(request)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Update mailbox request ──
export const updateMailboxRequest = async (id: any, updates: any) => {
  const { data, error } = await supabase
    .from('mailbox_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Delete mailbox request ──
export const deleteMailboxRequest = async (id: any) => {
  const { error } = await supabase
    .from('mailbox_requests')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Bulk delete mailbox requests ──
export const deleteMailboxRequests = async (ids: any) => {
  const { error } = await supabase
    .from('mailbox_requests')
    .delete()
    .in('id', ids)
  if (error) throw error
}
