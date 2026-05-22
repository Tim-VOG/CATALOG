import { supabase } from '@/lib/supabase'

export async function getItInventory() {
  const { data, error } = await supabase
    .from('it_inventory_items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createItInventoryItem(payload = {}) {
  const { data, error } = await supabase
    .from('it_inventory_items')
    .insert({ name: '', ...payload })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateItInventoryItem(id, updates) {
  const { data, error } = await supabase
    .from('it_inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteItInventoryItem(id) {
  const { error } = await supabase
    .from('it_inventory_items')
    .delete()
    .eq('id', id)
  if (error) throw error
  return id
}
