import { supabase } from '@/lib/supabase'

export const getProducts = async ({ search, category } = {}) => {
  let query = supabase
    .from('products_with_category')
    .select('*')
    .order('name')

  if (category && category !== 'All') {
    query = query.eq('category_name', category)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export const getProduct = async (id) => {
  const { data, error } = await supabase
    .from('products_with_category')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const createProduct = async (product) => {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteProduct = async (id) => {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export const deleteProducts = async (ids) => {
  if (!ids.length) return
  const { error } = await supabase.from('products').delete().in('id', ids)
  if (error) throw error
}

export const getProductReservations = async (productId) => {
  const { data, error } = await supabase
    .from('loan_request_items')
    .select(`
      quantity,
      loan_requests!inner (
        pickup_date,
        return_date,
        status
      )
    `)
    .eq('product_id', productId)
    .in('loan_requests.status', ['approved', 'picked_up', 'pending'])

  if (error) throw error

  return (data || []).map((item) => ({
    pickup_date: item.loan_requests.pickup_date,
    return_date: item.loan_requests.return_date,
    quantity: item.quantity,
    status: item.loan_requests.status,
  }))
}

/**
 * Get all active reservations that overlap with a given date range.
 * Returns { [product_id]: totalReservedQty }.
 */
export const getReservationsInRange = async (pickupDate, returnDate) => {
  const { data, error } = await supabase
    .from('loan_request_items')
    .select(`
      product_id,
      quantity,
      loan_requests!inner (
        pickup_date,
        return_date,
        status
      )
    `)
    .in('loan_requests.status', ['pending', 'approved', 'reserved', 'picked_up'])
    .lte('loan_requests.pickup_date', returnDate)
    .gte('loan_requests.return_date', pickupDate)

  if (error) throw error

  // Aggregate reserved qty per product
  const map = {}
  for (const item of data || []) {
    map[item.product_id] = (map[item.product_id] || 0) + item.quantity
  }
  return map
}
