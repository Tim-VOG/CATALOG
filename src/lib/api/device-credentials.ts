import { supabase } from '@/lib/supabase'

export const getDeviceCredentials = async () => {
  // Pull credentials joined with their qr_code so the admin UI can
  // show the device alongside its sensitive data without a second
  // round-trip.
  const { data, error } = await supabase
    .from('it_device_credentials')
    .select(`
      *,
      qr_code:qr_codes (
        code, label, status, assigned_to_name,
        product:products ( name, category_id, category:categories ( name ) )
      )
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const createDeviceCredential = async (row) => {
  const { data, error } = await supabase
    .from('it_device_credentials')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateDeviceCredential = async (id, updates) => {
  const { data, error } = await supabase
    .from('it_device_credentials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteDeviceCredential = async (id) => {
  const { error } = await supabase
    .from('it_device_credentials')
    .delete()
    .eq('id', id)
  if (error) throw error
}
