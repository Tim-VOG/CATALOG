import { supabase } from '@/lib/supabase'

export const getHolidays = async () => {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('day', { ascending: true })
  if (error) throw error
  return data
}

export const createHoliday = async (holiday: { day: string; label: string }) => {
  const { data, error } = await supabase
    .from('holidays')
    .insert(holiday)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteHoliday = async (id: string) => {
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) throw error
}
