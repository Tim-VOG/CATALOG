import { supabase } from '@/lib/supabase'

export const getCartItems = async (userId) => {
  const { data, error } = await supabase
    .from('cart_items_with_product')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return data
}

export const addToCart = async ({ userId, productId, quantity = 1, options = {} }) => {
  // Upsert: if product already in cart, increment quantity
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({
        quantity: existing.quantity + quantity,
        options,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('cart_items')
    .insert({ user_id: userId, product_id: productId, quantity, options })
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateCartItem = async (id, updates) => {
  const { data, error } = await supabase
    .from('cart_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const removeFromCart = async (id) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export const clearCart = async (userId) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
  if (error) throw error
}

export const checkoutCart = async ({
  userId,
  projectName,
  projectDescription,
  globalComment,
  pickupDate,
  returnDate,
  locationId,
  priority,
}) => {
  const { data, error } = await supabase.rpc('checkout_cart', {
    p_user_id: userId,
    p_project_name: projectName || 'Equipment Request',
    p_project_description: projectDescription || null,
    p_global_comment: globalComment || null,
    p_pickup_date: pickupDate,
    p_return_date: returnDate || null,
    p_location_id: locationId || null,
    p_priority: priority || 'normal',
  })
  if (error) throw error
  return data // returns the new loan_request id
}
