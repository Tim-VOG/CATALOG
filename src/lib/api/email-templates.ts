import { supabase } from '@/lib/supabase'

export const getEmailTemplates = async () => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('template_key')
  if (error) throw error
  return data
}

export const getEmailTemplate = async (id: any) => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const getEmailTemplateByKey = async (templateKey: any) => {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single()
  if (error) throw error
  return data
}

export const updateEmailTemplate = async (id: any, updates: any) => {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
