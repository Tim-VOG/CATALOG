import { supabase } from '@/lib/supabase'

// '' = the default set every business unit inherits from.
export const normalizeBU = (bu: any) => String(bu || '').trim().toUpperCase()

// All templates for a business unit: the default ('') set with any BU-specific
// rows layered on top per template_key. Inherited rows are flagged so the
// editor can show an "inherited from VO Group" badge and offer "reset".
export const getEmailTemplates = async (businessUnit: any = '') => {
  const bu = normalizeBU(businessUnit)
  const wanted = bu ? ['', bu] : ['']
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .in('business_unit', wanted)
    .order('template_key')
  if (error) throw error

  const defaults = new Map<string, any>()
  for (const row of data || []) {
    if ((row.business_unit || '') === '') defaults.set(row.template_key, row)
  }
  const byKey = new Map<string, any>()
  for (const [key, row] of defaults) byKey.set(key, { ...row, _inherited: !!bu })
  for (const row of data || []) {
    if ((row.business_unit || '') !== '') byKey.set(row.template_key, { ...row, _inherited: false })
  }
  return Array.from(byKey.values())
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

// Resolve one template for a business unit: the BU-specific row wins, else
// the default. Never throws on "no row" — returns null so callers fall back.
export const getEmailTemplateByKey = async (templateKey: any, businessUnit: any = '') => {
  const bu = normalizeBU(businessUnit)
  const wanted = bu ? ['', bu] : ['']
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .in('business_unit', wanted)
  if (error) throw error
  const rows = data || []
  return rows.find((r: any) => (r.business_unit || '') === bu && bu)
    || rows.find((r: any) => (r.business_unit || '') === '')
    || null
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

// Create a BU-specific override, copying the required fields from a base
// (default) template row and overriding subject/body.
export const createEmailTemplateOverride = async (base: any, businessUnit: any, updates: any) => {
  const bu = normalizeBU(businessUnit)
  const row = {
    template_key: base.template_key,
    name: base.name,
    description: base.description ?? null,
    category: base.category ?? null,
    variables: base.variables ?? null,
    is_active: base.is_active ?? true,
    business_unit: bu,
    subject: updates.subject ?? base.subject,
    body: updates.body ?? base.body,
  }
  const { data, error } = await supabase
    .from('email_templates')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

// Remove a BU override (revert that template to the inherited default).
export const deleteEmailTemplate = async (id: any) => {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)
  if (error) throw error
}
