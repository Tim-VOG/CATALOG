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

export const createOnboardingRecipient = async (recipient: any) => {
  const { data, error } = await supabase
    .from('onboarding_recipients')
    .insert(recipient)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateOnboardingRecipient = async (id: any, updates: any) => {
  const { data, error } = await supabase
    .from('onboarding_recipients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteOnboardingRecipient = async (id: any) => {
  const { error } = await supabase
    .from('onboarding_recipients')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Block Templates ──

// Normalise a recipient's company/business-unit into the value we store in
// onboarding_block_templates.business_unit (upper-cased, trimmed). '' means
// the default set that every BU inherits from.
export const normalizeBusinessUnit = (bu: any) =>
  String(bu || '').trim().toUpperCase()

// Load the block templates for a given business unit. Rows for the BU are
// layered on top of the default ('') set, per block_key, so a BU only needs
// to override the blocks that differ — everything else falls back to VO Group.
export const getOnboardingBlockTemplates = async (businessUnit: any = '') => {
  const bu = normalizeBusinessUnit(businessUnit)
  const wanted = bu ? ['', bu] : ['']
  const { data, error } = await supabase
    .from('onboarding_block_templates')
    .select('*')
    .in('business_unit', wanted)
    .order('sort_order')
  if (error) throw error

  // Merge: start from defaults, override with BU-specific rows by block_key.
  // BU rows inherit label/icon/sort from the default row when they omit them.
  const defaults = new Map<string, any>()
  for (const row of data || []) {
    if ((row.business_unit || '') === '') defaults.set(row.block_key, row)
  }
  const byKey = new Map<string, any>(defaults)
  for (const row of data || []) {
    if ((row.business_unit || '') === '') continue
    const base = defaults.get(row.block_key) || {}
    byKey.set(row.block_key, {
      ...row,
      label_fr: row.label_fr || base.label_fr,
      label_en: row.label_en || base.label_en,
      icon: row.icon || base.icon,
      sort_order: row.sort_order ?? base.sort_order,
    })
  }
  return Array.from(byKey.values()).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
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

export const getOnboardingEmail = async (id: any) => {
  const { data, error } = await supabase
    .from('onboarding_emails')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createOnboardingEmail = async (email: any) => {
  const { data, error } = await supabase
    .from('onboarding_emails')
    .insert(email)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateOnboardingEmail = async (id: any, updates: any) => {
  const { data, error } = await supabase
    .from('onboarding_emails')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteOnboardingEmail = async (id: any) => {
  const { error } = await supabase
    .from('onboarding_emails')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Save Block Template Defaults ──

export const saveBlockTemplateDefaults = async (blocksConfig: any, businessUnit: any = '') => {
  const bu = normalizeBusinessUnit(businessUnit)
  // Batch-update each block template with current content, options, enabled
  // state, and sort order — scoped to the given business unit ('' = default).
  const updates = blocksConfig.map((block: any, index: number) => ({
    business_unit: bu,
    block_key: block.block_key,
    default_content_fr: block.content_fr,
    default_content_en: block.content_en,
    default_options: block.options || {},
    default_enabled: block.enabled ?? true,
    sort_order: index + 1,
  }))

  // Upsert all blocks by (business_unit, block_key)
  const { data, error } = await supabase
    .from('onboarding_block_templates')
    .upsert(updates, { onConflict: 'business_unit,block_key' })
    .select()
  if (error) throw error
  return data
}
