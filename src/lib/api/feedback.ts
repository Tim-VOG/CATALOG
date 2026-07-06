import { supabase } from '@/lib/supabase'

export type FeedbackKind = 'idea' | 'bug' | 'other'

export interface FeedbackInput {
  kind: FeedbackKind
  message: string
  page?: string
  user_id?: string | null
  user_email?: string | null
  user_name?: string | null
}

export const submitFeedback = async (input: FeedbackInput) => {
  const { error } = await supabase.from('feedback').insert({
    kind: input.kind,
    message: input.message,
    page: input.page || null,
    user_id: input.user_id || null,
    user_email: input.user_email || null,
    user_name: input.user_name || null,
  })
  if (error) throw error
}

// Admin — read the inbox (newest first).
export const getFeedback = async () => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
