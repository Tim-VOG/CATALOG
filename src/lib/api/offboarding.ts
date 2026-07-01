import { supabase } from '@/lib/supabase'

// ── Offboarding Processes ──

export const getOffboardingProcesses = async () => {
  const { data, error } = await supabase
    .from('offboarding_processes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getOffboardingProcess = async (id: any) => {
  const { data, error } = await supabase
    .from('offboarding_processes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createOffboardingProcess = async (process: any) => {
  const { data, error } = await supabase
    .from('offboarding_processes')
    .insert(process)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateOffboardingProcess = async (id: any, updates: any) => {
  const { data, error } = await supabase
    .from('offboarding_processes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteOffboardingProcess = async (id: any) => {
  const { error } = await supabase
    .from('offboarding_processes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Offboarding Form Fields ──

export const getOffboardingFormFields = async () => {
  const { data, error } = await supabase
    .from('offboarding_form_fields')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export const createOffboardingFormField = async (field: any) => {
  const { data, error } = await supabase
    .from('offboarding_form_fields')
    .insert(field)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateOffboardingFormField = async (id: any, updates: any) => {
  const { data, error } = await supabase
    .from('offboarding_form_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteOffboardingFormField = async (id: any) => {
  const { error } = await supabase
    .from('offboarding_form_fields')
    .delete()
    .eq('id', id)
  if (error) throw error
}
