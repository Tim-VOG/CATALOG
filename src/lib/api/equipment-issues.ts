import { supabase } from '@/lib/supabase'

export interface EquipmentIssue {
  id: string
  qr_code_id: string | null
  qr_code: string | null
  product_name: string | null
  reported_by: string | null
  reporter_name: string | null
  reporter_email: string | null
  description: string
  photo_url: string | null
  status: 'open' | 'resolved'
  resolved_at: string | null
  created_at: string
}

export const getEquipmentIssues = async (status?: string): Promise<EquipmentIssue[]> => {
  let query = supabase.from('equipment_issues').select('*').order('created_at', { ascending: false })
  if (status && status !== 'all') query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return (data || []) as EquipmentIssue[]
}

export const createEquipmentIssue = async (row: Partial<EquipmentIssue>) => {
  const { data, error } = await supabase.from('equipment_issues').insert(row).select().single()
  if (error) throw error
  return data
}

export const resolveEquipmentIssue = async (id: string) => {
  const { error } = await supabase
    .from('equipment_issues')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// Upload an issue photo to the public logos bucket (reused — no
// separate bucket needed) and return its URL.
export const uploadIssuePhoto = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop()
  const path = `issue-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  return data.publicUrl
}
