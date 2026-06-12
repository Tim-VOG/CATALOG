import { supabase } from '@/lib/supabase'

export const getModuleAccessForUser = async (userId: any) => {
  const { data, error } = await supabase
    .from('module_access')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data
}

export const getAllModuleAccess = async () => {
  const { data, error } = await supabase
    .from('module_access')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const upsertModuleAccess = async (userId, moduleKey, granted) => {
  const { data, error } = await supabase
    .from('module_access')
    .upsert(
      { user_id: userId, module_key: moduleKey, granted },
      { onConflict: 'user_id,module_key' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteModuleAccess = async (id: any) => {
  const { error } = await supabase
    .from('module_access')
    .delete()
    .eq('id', id)
  if (error) throw error
}
