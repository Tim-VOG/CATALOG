import { supabase } from '@/lib/supabase'

export const getEmailLog = async (limit = 300) => {
  const { data, error } = await supabase
    .from('email_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export const clearEmailLog = async () => {
  // Delete all rows the caller is allowed to (admin-only via RLS).
  const { error } = await supabase
    .from('email_log')
    .delete()
    .not('id', 'is', null)
  if (error) throw error
}
