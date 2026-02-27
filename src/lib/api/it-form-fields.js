import { supabase } from '@/lib/supabase'

// ── Fetch all form fields (ordered by sort_order) ──
export const getItFormFields = async () => {
  const { data, error } = await supabase
    .from('it_form_fields')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

// ── Create a new form field ──
export const createItFormField = async (field) => {
  const { data, error } = await supabase
    .from('it_form_fields')
    .insert(field)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Update a form field ──
export const updateItFormField = async (id, updates) => {
  const { data, error } = await supabase
    .from('it_form_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Delete a form field ──
export const deleteItFormField = async (id) => {
  const { error } = await supabase
    .from('it_form_fields')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Reorder fields: accepts array of { id, sort_order } ──
export const reorderItFormFields = async (orderedItems) => {
  // Use Promise.all for batch update
  const updates = orderedItems.map(({ id, sort_order }) =>
    supabase
      .from('it_form_fields')
      .update({ sort_order })
      .eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) throw failed.error
}
