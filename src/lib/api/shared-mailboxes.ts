import { supabase } from '@/lib/supabase'

export const getSharedMailboxes = async () => {
  const { data, error } = await supabase
    .from('shared_mailboxes')
    .select('*')
    // Newest first — freshly-fulfilled mailboxes land at the top of the list.
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const createSharedMailbox = async (row: any) => {
  const { data, error } = await supabase
    .from('shared_mailboxes')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateSharedMailbox = async (id: any, updates: any) => {
  const { data, error } = await supabase
    .from('shared_mailboxes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteSharedMailbox = async (id: any) => {
  const { error } = await supabase.from('shared_mailboxes').delete().eq('id', id)
  if (error) throw error
}
