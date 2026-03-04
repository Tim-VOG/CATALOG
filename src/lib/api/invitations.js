import { supabase } from '@/lib/supabase'

export const getInvitations = async (status = 'pending') => {
  let query = supabase
    .from('user_invitations')
    .select('*, inviter:profiles!invited_by(first_name, last_name, email)')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createInvitation = async ({ email, first_name, last_name, business_unit, invited_by }) => {
  const { data, error } = await supabase
    .from('user_invitations')
    .insert({ email: email.toLowerCase().trim(), first_name, last_name, business_unit, invited_by })
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteInvitation = async (id) => {
  const { error } = await supabase
    .from('user_invitations')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export const getInvitationByEmail = async (email) => {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .maybeSingle()
  if (error) throw error
  return data
}

export const acceptInvitation = async (id) => {
  const { data, error } = await supabase
    .from('user_invitations')
    .update({ status: 'accepted' })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
