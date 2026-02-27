import { supabase } from '@/lib/supabase'

// ── Recipients ──

export const getOnboardingRecipients = async () => {
  const { data, error } = await supabase
    .from('onboarding_recipients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createOnboardingRecipient = async (recipient) => {
  const { data, error } = await supabase
    .from('onboarding_recipients')
    .insert(recipient)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateOnboardingRecipient = async (id, updates) => {
  const { data, error } = await supabase
    .from('onboarding_recipients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteOnboardingRecipient = async (id) => {
  const { error } = await supabase
    .from('onboarding_recipients')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Block Templates ──

export const getOnboardingBlockTemplates = async () => {
  const { data, error } = await supabase
    .from('onboarding_block_templates')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

// ── Emails ──

export const getOnboardingEmails = async () => {
  const { data, error } = await supabase
    .from('onboarding_emails')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getOnboardingEmail = async (id) => {
  const { data, error } = await supabase
    .from('onboarding_emails')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createOnboardingEmail = async (email) => {
  const { data, error } = await supabase
    .from('onboarding_emails')
    .insert(email)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateOnboardingEmail = async (id, updates) => {
  const { data, error } = await supabase
    .from('onboarding_emails')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteOnboardingEmail = async (id) => {
  const { error } = await supabase
    .from('onboarding_emails')
    .delete()
    .eq('id', id)
  if (error) throw error
}
