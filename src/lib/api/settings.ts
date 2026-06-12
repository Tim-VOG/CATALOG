import { supabase } from '@/lib/supabase'

export const getAppSettings = async () => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .single()
  if (error) throw error
  return data
}

export const updateAppSettings = async (updates) => {
  const { data: current } = await supabase
    .from('app_settings')
    .select('id')
    .single()
  const { data, error } = await supabase
    .from('app_settings')
    .update(updates)
    .eq('id', current.id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const uploadLogo = async (file, variant = '') => {
  const ext = file.name.split('.').pop()
  const prefix = variant ? `logo-${variant}` : 'logo'
  const path = `${prefix}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path)
  return urlData.publicUrl
}
