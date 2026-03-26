import { supabase } from '@/lib/supabase'

// ── Reservations ──

export const getReservations = async ({ productId, userId, status } = {}) => {
  let query = supabase
    .from('qr_reservations_with_details')
    .select('*')
    .order('reserved_date', { ascending: true })

  if (productId) query = query.eq('product_id', productId)
  if (userId) query = query.eq('user_id', userId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export const createReservation = async (reservation) => {
  const { data, error } = await supabase
    .from('qr_reservations')
    .insert(reservation)
    .select()
    .single()
  if (error) throw error
  return data
}

export const cancelReservation = async (id) => {
  const { data, error } = await supabase
    .from('qr_reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Waitlist ──

export const getWaitlist = async (productId) => {
  let query = supabase.from('qr_waitlist').select('*').order('created_at')
  if (productId) query = query.eq('product_id', productId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export const joinWaitlist = async ({ productId, userId, userEmail, userName }) => {
  const { data, error } = await supabase
    .from('qr_waitlist')
    .insert({ product_id: productId, user_id: userId, user_email: userEmail, user_name: userName })
    .select()
    .single()
  if (error) throw error
  return data
}

export const leaveWaitlist = async (productId, userId) => {
  const { error } = await supabase
    .from('qr_waitlist')
    .delete()
    .eq('product_id', productId)
    .eq('user_id', userId)
  if (error) throw error
}

// ── Lost Mode ──

export const reportLost = async (scanLogId, notes) => {
  const { data, error } = await supabase
    .from('qr_scan_logs')
    .update({
      is_lost: true,
      lost_reported_at: new Date().toISOString(),
      lost_notes: notes || null,
    })
    .eq('id', scanLogId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const resolveLost = async (scanLogId) => {
  const { data, error } = await supabase
    .from('qr_scan_logs')
    .update({
      is_lost: false,
      lost_resolved_at: new Date().toISOString(),
    })
    .eq('id', scanLogId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const getLostItems = async () => {
  const { data, error } = await supabase
    .from('qr_scan_logs_with_details')
    .select('*')
    .eq('is_lost', true)
    .is('lost_resolved_at', null)
    .order('lost_reported_at', { ascending: false })
  if (error) throw error
  return data
}
