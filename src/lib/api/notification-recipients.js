import { supabase } from '@/lib/supabase'

export const getNotificationRecipients = async () => {
  const { data, error } = await supabase
    .from('notification_recipients')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}

export const createNotificationRecipient = async (recipient) => {
  const { data, error } = await supabase
    .from('notification_recipients')
    .insert(recipient)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateNotificationRecipient = async (id, updates) => {
  const { data, error } = await supabase
    .from('notification_recipients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteNotificationRecipient = async (id) => {
  const { error } = await supabase
    .from('notification_recipients')
    .delete()
    .eq('id', id)
  if (error) throw error
}
