import { supabase } from '@/lib/supabase'

export const getPlanningData = async ({ startDate, endDate }) => {
  // Fetch all loan requests that overlap with the date range and have active statuses
  const { data: requests, error: reqError } = await supabase
    .from('loan_requests_with_details')
    .select('*')
    .in('status', ['pending', 'approved', 'reserved', 'picked_up'])
    .lte('pickup_date', endDate)
    .gte('return_date', startDate)
    .order('pickup_date')

  if (reqError) throw reqError

  // Fetch items for those requests
  const requestIds = requests.map((r) => r.id)
  if (requestIds.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from('loan_request_items_with_details')
    .select('*')
    .in('request_id', requestIds)

  if (itemsError) throw itemsError

  // Merge items with their request data
  return items.map((item) => {
    const request = requests.find((r) => r.id === item.request_id)
    return {
      ...item,
      request_status: request?.status,
      request_project_name: request?.project_name,
      request_user_name: [request?.user_first_name, request?.user_last_name].filter(Boolean).join(' ') || request?.user_email,
      request_user_avatar: request?.user_avatar_url,
      pickup_date: request?.pickup_date,
      return_date: request?.return_date,
    }
  })
}
