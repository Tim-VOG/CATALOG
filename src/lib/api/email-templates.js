import { supabase } from '@/lib/supabase'

export const getEmailTemplates = async () => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at')
  if (error) throw error
  return data
}

export const getEmailTemplate = async (id) => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const getEmailTemplateByKey = async (templateKey) => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single()
  if (error) throw error
  return data
}

export const updateEmailTemplate = async (id, updates) => {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
