import { supabase } from '@/lib/supabase'

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
      return_notes: returnData.notes,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
