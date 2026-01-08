// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// DATABASE HELPERS
// ============================================

// Categories
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export const createCategory = async (category) => {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteCategory = async (id) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Products
export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products_with_category')
    .select('*')
    .order('name')
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
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Loans
export const getLoans = async () => {
  const { data, error } = await supabase
    .from('loans_with_details')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const createLoan = async (loan) => {
  const { data, error } = await supabase
    .from('loans')
    .insert(loan)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateLoanStatus = async (id, status, additionalData = {}) => {
  const updates = { status, ...additionalData }
  if (status === 'active') {
    updates.approved_at = new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('loans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const returnLoan = async (id, returnData) => {
  const { data, error } = await supabase
    .from('loans')
    .update({
      status: 'returned',
      actual_return_date: new Date().toISOString().split('T')[0],
      return_condition: returnData.condition,
      return_notes: returnData.notes
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Subscription Plans
export const getSubscriptionPlans = async () => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('type', { ascending: true })
  if (error) throw error
  return data
}

// User Profile
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Real-time subscriptions
export const subscribeToLoans = (callback) => {
  return supabase
    .channel('loans_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, callback)
    .subscribe()
}

export const subscribeToProducts = (callback) => {
  return supabase
    .channel('products_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, callback)
    .subscribe()
}
