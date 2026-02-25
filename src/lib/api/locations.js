import { supabase } from '@/lib/supabase'

export const getLocations = async () => {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}
