import { supabase } from '@/lib/supabase'

export const getPeopleDirectory = async () => {
  const { data, error } = await supabase
    .from('people_directory')
    .select('*')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data
}

// One directory row matched on email — used to auto-fill a profile on first
// login. Never throws on "not found" (returns null) so callers can fall back.
export const getDirectoryByEmail = async (email: any) => {
  const e = String(email || '').trim().toLowerCase()
  if (!e) return null
  const { data, error } = await supabase
    .from('people_directory')
    .select('*')
    .eq('email', e)
    .maybeSingle()
  if (error) return null
  return data
}

export const upsertDirectoryEntry = async (row: any) => {
  const { data, error } = await supabase
    .from('people_directory')
    .upsert({ ...row, email: String(row.email || '').trim().toLowerCase() }, { onConflict: 'email' })
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteDirectoryEntry = async (id: any) => {
  const { error } = await supabase.from('people_directory').delete().eq('id', id)
  if (error) throw error
}
