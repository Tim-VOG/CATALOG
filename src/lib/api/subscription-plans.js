import { supabase } from '@/lib/supabase'

export const getSubscriptionPlans = async () => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('type', { ascending: true })
  if (error) throw error
  return data
}

export const getAllSubscriptionPlans = async () => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('type')
    .order('name')
  if (error) throw error
  return data
}

export const createSubscriptionPlan = async (plan) => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert(plan)
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateSubscriptionPlan = async (id, updates) => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteSubscriptionPlan = async (id) => {
  const { error } = await supabase.from('subscription_plans').delete().eq('id', id)
  if (error) throw error
}
