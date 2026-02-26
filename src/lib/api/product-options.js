import { supabase } from '@/lib/supabase'

export const getProductOptions = async () => {
  const { data, error } = await supabase
    .from('product_options')
    .select('*')
    .eq('is_active', true)
    .order('option_type')
    .order('sort_order')
  if (error) throw error
  return data
}

export const getAllProductOptions = async () => {
  const { data, error } = await supabase
    .from('product_options')
    .select('*')
    .order('option_type')
    .order('sort_order')
  if (error) throw error
  return data
}

export const createProductOption = async (option) => {
  const { data, error } = await supabase
    .from('product_options')
    .insert(option)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateProductOption = async (id, updates) => {
  const { data, error } = await supabase
    .from('product_options')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteProductOption = async (id) => {
  const { error } = await supabase.from('product_options').delete().eq('id', id)
  if (error) throw error
}
