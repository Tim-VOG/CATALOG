import { supabase } from '@/lib/supabase'

export const getMyEquipment = async (userId: any) => {
  const { data, error } = await supabase
    .from('user_equipment')
    .select('*')
    .eq('user_id', userId)
    .order('assigned_date', { ascending: false })
  if (error) throw error
  return data
}

export const getUserEquipmentFor = async (userId: any) => {
  if (!userId) return []
  const { data, error } = await supabase
    .from('user_equipment')
    .select('*')
    .eq('user_id', userId)
    .order('assigned_date', { ascending: false })
  if (error) throw error
  return data || []
}

export const getAllUserEquipment = async () => {
  const { data, error } = await supabase
    .from('user_equipment')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const assignEquipment = async (assignment: any) => {
  const { data, error } = await supabase
    .from('user_equipment')
    .insert(assignment)
    .select()
    .single()
  if (error) throw error
  return data
}

export const assignEquipmentBatch = async (assignments: any) => {
  if (!assignments.length) return []
  const { data, error } = await supabase
    .from('user_equipment')
    .insert(assignments)
    .select()
  if (error) throw error
  return data
}

export const updateUserEquipment = async (id: any, updates: any) => {
  const { data, error } = await supabase
    .from('user_equipment')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const returnEquipment = async (id: any) => {
  const { data, error } = await supabase
    .from('user_equipment')
    .update({
      status: 'returned',
      actual_return_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteUserEquipment = async (id: any) => {
  const { error } = await supabase
    .from('user_equipment')
    .delete()
    .eq('id', id)
  if (error) throw error
}
