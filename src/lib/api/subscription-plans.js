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
