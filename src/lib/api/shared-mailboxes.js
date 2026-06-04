import { supabase } from '@/lib/supabase'

export const getSharedMailboxes = async () => {
  const { data, error } = await supabase
    .from('shared_mailboxes')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

export const createSharedMailbox = async (row) => {
  const { data, error } = await supabase
    .from('shared_mailboxes')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateSharedMailbox = async (id, updates) => {
  const { data, error } = await supabase
    .from('shared_mailboxes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteSharedMailbox = async (id) => {
  const { error } = await supabase.from('shared_mailboxes').delete().eq('id', id)
  if (error) throw error
}
