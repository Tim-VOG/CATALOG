import { supabase } from '@/lib/supabase'

export const getFormFields = async () => {
  const { data, error } = await supabase
    .from('checkout_form_fields')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export const getActiveFormFields = async () => {
  const { data, error } = await supabase
    .from('checkout_form_fields')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data
}

export const createFormField = async (field) => {
  const { data, error } = await supabase
    .from('checkout_form_fields')
    .insert(field)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateFormField = async (id, updates) => {
  const { data, error } = await supabase
    .from('checkout_form_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteFormField = async (id) => {
  const { error } = await supabase
    .from('checkout_form_fields')
    .delete()
    .eq('id', id)
  if (error) throw error
}
