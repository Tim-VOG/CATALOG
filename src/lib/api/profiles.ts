// @ts-nocheck — Phase-3 migration in progress; this file will be properly typed in a follow-up pass.
import { supabase } from '@/lib/supabase'
import { sanitizeSearch } from '@/lib/sanitize'

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getProfiles = async ({ search, role } = {}) => {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (role && role !== 'all') {
    query = query.eq('role', role)
  }
  const q = sanitizeSearch(search)
  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const updateProfileRole = async (userId, role) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const toggleProfileActive = async (userId, isActive) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteProfile = async (userId) => {
  // Delete module_access first (cascade should handle, but be explicit)
  await supabase.from('module_access').delete().eq('user_id', userId)
  // Delete profile — user will need to sign in again (trigger recreates profile)
  const { error } = await supabase.from('profiles').delete().eq('id', userId)
  if (error) throw error
}
