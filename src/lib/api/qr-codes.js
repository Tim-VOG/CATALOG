import { supabase } from '@/lib/supabase'

// ── QR Codes ──────────────────────────────────────────

export const getQRCodes = async ({ search, active } = {}) => {
  let query = supabase
    .from('qr_codes_with_details')
    .select('*')
    .order('created_at', { ascending: false })

  if (active !== undefined) {
    query = query.eq('is_active', active)
  }

  if (search) {
    query = query.or(`code.ilike.%${search}%,label.ilike.%${search}%,product_name.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getQRCode = async (id) => {
  const { data, error } = await supabase
    .from('qr_codes_with_details')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const getQRCodeByCode = async (code) => {
  const { data, error } = await supabase
    .from('qr_codes_with_details')
    .select('*')
    .eq('code', code)
    .single()
  if (error) throw error
  return data
}

export const createQRCode = async (qrCode) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .insert(qrCode)
    .select()
    .single()
  if (error) throw error
  return data
}

export const createQRCodes = async (qrCodes) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .insert(qrCodes)
    .select()
  if (error) throw error
  return data
}

export const updateQRCode = async (id, updates) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteQRCode = async (id) => {
  const { error } = await supabase.from('qr_codes').delete().eq('id', id)
  if (error) throw error
}

// ── QR Kits ──────────────────────────────────────────

export const getQRKits = async () => {
  const { data, error } = await supabase
    .from('qr_kits')
    .select(`
      *,
      qr_kit_items (
        id,
        product_id,
        quantity,
        products (id, name, image_url, total_stock)
      )
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const getQRKit = async (id) => {
  const { data, error } = await supabase
    .from('qr_kits')
    .select(`
      *,
      qr_kit_items (
        id,
        product_id,
        quantity,
        products (id, name, image_url, total_stock)
      )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createQRKit = async (kit) => {
  const { data, error } = await supabase
    .from('qr_kits')
    .insert({ reference: kit.reference, name: kit.name, description: kit.description })
    .select()
    .single()
  if (error) throw error

  // Add kit items
  if (kit.items?.length) {
    const items = kit.items.map(item => ({
      kit_id: data.id,
      product_id: item.product_id,
      quantity: item.quantity || 1,
    }))
    const { error: itemsError } = await supabase.from('qr_kit_items').insert(items)
    if (itemsError) throw itemsError
  }

  return data
}

export const updateQRKit = async (id, kit) => {
  const { data, error } = await supabase
    .from('qr_kits')
    .update({ reference: kit.reference, name: kit.name, description: kit.description })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Replace kit items
  if (kit.items) {
    await supabase.from('qr_kit_items').delete().eq('kit_id', id)
    if (kit.items.length) {
      const items = kit.items.map(item => ({
        kit_id: id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
      }))
      const { error: itemsError } = await supabase.from('qr_kit_items').insert(items)
      if (itemsError) throw itemsError
    }
  }

  return data
}

export const deleteQRKit = async (id) => {
  const { error } = await supabase.from('qr_kits').delete().eq('id', id)
  if (error) throw error
}

// ── QR Scan ──────────────────────────────────────────

export const processQRScan = async ({ code, action, userId, userEmail, userName, notes, pickupDate, expectedReturnDate }) => {
  const { data, error } = await supabase.rpc('process_qr_scan', {
    p_qr_code: code,
    p_action: action,
    p_user_id: userId,
    p_user_email: userEmail || null,
    p_user_name: userName || null,
    p_notes: notes || null,
    p_pickup_date: pickupDate || null,
    p_expected_return_date: expectedReturnDate || null,
  })
  if (error) throw error

  // Update QR code assignment status
  const qr = await getQRCodeByCode(code)
  if (qr) {
    if (action === 'take') {
      await supabase.from('qr_codes').update({
        status: 'assigned',
        assigned_to: userId,
        assigned_to_name: userName || null,
        assigned_to_email: userEmail || null,
        assigned_at: new Date().toISOString(),
      }).eq('id', qr.id)
    } else if (action === 'deposit') {
      await supabase.from('qr_codes').update({
        status: 'available',
        assigned_to: null,
        assigned_to_name: null,
        assigned_to_email: null,
        assigned_at: null,
      }).eq('id', qr.id)
    }
  }

  return data
}

// ── Scan Logs ──────────────────────────────────────────

export const getScanLogs = async ({ search, action, limit = 100 } = {}) => {
  let query = supabase
    .from('qr_scan_logs_with_details')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (action) {
    query = query.eq('action', action)
  }

  if (search) {
    query = query.or(`qr_code.ilike.%${search}%,product_name.ilike.%${search}%,user_name.ilike.%${search}%,user_email.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getScanLogsForProduct = async (productId) => {
  const { data, error } = await supabase
    .from('qr_scan_logs_with_details')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

// Get overdue equipment (taken but not returned past expected_return_date)
// Filters out items that have been deposited after the take
export const getOverdueScans = async () => {
  const today = new Date().toISOString().split('T')[0]

  // Get all takes past due
  const { data: takes, error: takesErr } = await supabase
    .from('qr_scan_logs_with_details')
    .select('*')
    .eq('action', 'take')
    .lt('expected_return_date', today)
    .not('expected_return_date', 'is', null)
    .order('expected_return_date', { ascending: true })
  if (takesErr) throw takesErr

  if (!takes?.length) return []

  // Get all deposits to check which takes have been returned
  const { data: deposits, error: depsErr } = await supabase
    .from('qr_scan_logs')
    .select('product_id, user_id, created_at')
    .eq('action', 'deposit')
  if (depsErr) throw depsErr

  // Filter: keep only takes where no deposit exists for same user+product after the take
  return takes.filter(take => {
    return !deposits?.some(dep =>
      dep.product_id === take.product_id &&
      dep.user_id === take.user_id &&
      new Date(dep.created_at) > new Date(take.created_at)
    )
  })
}

// Get equipment due for return tomorrow (for reminder emails)
// Excludes items already returned
export const getUpcomingReturns = async () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: takes, error } = await supabase
    .from('qr_scan_logs_with_details')
    .select('*')
    .eq('action', 'take')
    .eq('expected_return_date', tomorrowStr)
    .not('expected_return_date', 'is', null)
  if (error) throw error

  if (!takes?.length) return []

  const { data: deposits } = await supabase
    .from('qr_scan_logs')
    .select('product_id, user_id, created_at')
    .eq('action', 'deposit')

  return takes.filter(take => {
    return !deposits?.some(dep =>
      dep.product_id === take.product_id &&
      dep.user_id === take.user_id &&
      new Date(dep.created_at) > new Date(take.created_at)
    )
  })
}

// Get scan stats grouped by category (for dashboard chart)
export const getScanStatsByCategory = async () => {
  const { data, error } = await supabase
    .from('qr_scan_logs_with_details')
    .select('category_name, action')
  if (error) throw error

  // Aggregate: { categoryName: { takes: N, deposits: N } }
  const stats = {}
  for (const row of data || []) {
    const cat = row.category_name || 'Unknown'
    if (!stats[cat]) stats[cat] = { takes: 0, deposits: 0 }
    if (row.action === 'take') stats[cat].takes++
    else stats[cat].deposits++
  }
  return stats
}
