import { supabase } from '@/lib/supabase'

export type EmailPattern = 'initial_last' | 'first' | 'initials'

export interface BusinessUnit {
  id: string
  value: string
  domain: string
  email_pattern: EmailPattern
  sort_order: number
  created_at: string
  updated_at: string
}

export type BusinessUnitInput = Pick<BusinessUnit, 'value' | 'domain' | 'email_pattern'> & {
  sort_order?: number
}

export const getBusinessUnits = async (): Promise<BusinessUnit[]> => {
  const { data, error } = await supabase
    .from('business_units')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('value', { ascending: true })
  if (error) throw error
  return (data ?? []) as BusinessUnit[]
}

export const createBusinessUnit = async (input: BusinessUnitInput): Promise<BusinessUnit> => {
  const { data, error } = await supabase
    .from('business_units')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data as BusinessUnit
}

export const updateBusinessUnit = async (
  id: string,
  updates: Partial<BusinessUnitInput>,
): Promise<BusinessUnit> => {
  const { data, error } = await supabase
    .from('business_units')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as BusinessUnit
}

export const deleteBusinessUnit = async (id: string): Promise<void> => {
  const { error } = await supabase.from('business_units').delete().eq('id', id)
  if (error) throw error
}
