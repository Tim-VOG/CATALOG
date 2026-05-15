import { supabase } from '@/lib/supabase'

/**
 * Public: resolve a token to the new hire's first/last name (no PII besides that).
 */
export async function getOnboardingByToken(token) {
  const { data, error } = await supabase
    .from('public_onboarding_token')
    .select('*')
    .eq('token', token)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Public: submit the personal email for a token. The server resolves the
 * token → it_request_id and stores the submission.
 */
export async function submitPersonalInfo(token, personalEmail) {
  // Resolve token to it_request_id
  const { data: req, error: reqErr } = await supabase
    .from('it_requests')
    .select('id')
    .eq('personal_info_token', token)
    .eq('type', 'onboarding')
    .maybeSingle()
  if (reqErr) throw reqErr
  if (!req) throw new Error('Invalid link')

  const { data, error } = await supabase
    .from('personal_info_submissions')
    .upsert({
      it_request_id: req.id,
      personal_email: personalEmail.trim().toLowerCase(),
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'it_request_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Admin: list submissions linked to a list of request IDs.
 */
export async function getPersonalInfoSubmissionsForRequests(requestIds) {
  if (!requestIds || requestIds.length === 0) return []
  const { data, error } = await supabase
    .from('personal_info_submissions')
    .select('*')
    .in('it_request_id', requestIds)
  if (error) throw error
  return data || []
}
