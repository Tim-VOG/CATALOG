import { supabase } from '@/lib/supabase'
import { createLoanRequest } from './loan-requests'

/**
 * Reserve a laptop for a new hire's onboarding.
 *
 * The admin picks WHICH laptop from the catalog (Mac, HP, …). Only the
 * laptop is reserved — the charger ships with it "d'office" and isn't a
 * catalog item here (catalog chargers are for people who lost theirs).
 * Phones stay manual.
 *
 * Idempotent on the it_request id: if a loan_request already exists for
 * this onboarding it returns it instead of creating a duplicate.
 */
interface OnboardingItRequest {
  id: string
  type?: string | null
  requested_by?: string | null
  requester_email?: string | null
  data?: Record<string, any> | null
}

export interface ReserveKitResult {
  loan_request_id: string
  reserved: { product_id: string; product_name: string }[]
  alreadyExisted: boolean
}

export async function reserveOnboardingKit(
  itRequest: OnboardingItRequest,
  productId: string,
): Promise<ReserveKitResult> {
  if (itRequest.type !== 'onboarding') {
    throw new Error('Only onboarding requests can trigger a kit reservation.')
  }
  if (!productId) {
    throw new Error('Pick a laptop to reserve.')
  }

  const data = itRequest.data || {}
  const firstName = data.first_name || data.firstName || ''
  const lastName  = data.last_name  || data.lastName  || ''
  const newHireEmail = data.personal_email || data.email || itRequest.requester_email || ''
  const pickupDate = data.first_day || data.startDate || new Date().toISOString().slice(0, 10)
  const projectName = `Onboarding kit · ${[firstName, lastName].filter(Boolean).join(' ') || 'New hire'}`

  // Look up the chosen laptop.
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .single()
  if (prodErr || !product) throw new Error('That product no longer exists in the catalog.')

  // Already reserved for this onboarding? Return the existing loan.
  const { data: existing } = await supabase
    .from('loan_requests')
    .select('id')
    .eq('onboarding_request_id', itRequest.id)
    .limit(1)
  if (existing?.length) {
    return { loan_request_id: existing[0].id, reserved: [{ product_id: product.id, product_name: product.name }], alreadyExisted: true }
  }

  const created = await createLoanRequest({
    request: {
      user_id: itRequest.requested_by || null,
      project_name: projectName,
      project_description: `Auto-reserved for ${[firstName, lastName].filter(Boolean).join(' ')}${newHireEmail ? ` (${newHireEmail})` : ''}. Starts ${pickupDate}.`,
      pickup_date: pickupDate,
      return_date: null,             // open-ended — the new hire keeps it
      status: 'pending',
      onboarding_request_id: itRequest.id,
    },
    items: [{
      product: { id: product.id },
      quantity: 1,
      options: { auto_reserved: true, onboarding_laptop: true },
    }],
  })

  return { loan_request_id: created.id, reserved: [{ product_id: product.id, product_name: product.name }], alreadyExisted: false }
}

/** The kit (loan_request + items) reserved for this onboarding, or null. */
export async function getOnboardingKit(itRequestId: string) {
  const { data: lr } = await supabase
    .from('loan_requests')
    .select('id, status')
    .eq('onboarding_request_id', itRequestId)
    .limit(1)
    .maybeSingle()
  if (!lr) return null
  const { data: items } = await supabase
    .from('loan_request_items_with_details')
    .select('product_name, quantity')
    .eq('request_id', lr.id)
  return { id: lr.id, status: lr.status, items: (items || []) as any[] }
}

/** Remove the reserved kit for this onboarding (cascade drops the items). */
export async function removeOnboardingKit(itRequestId: string) {
  const { data: lr } = await supabase
    .from('loan_requests')
    .select('id')
    .eq('onboarding_request_id', itRequestId)
    .limit(1)
    .maybeSingle()
  if (lr) {
    const { error } = await supabase.from('loan_requests').delete().eq('id', lr.id)
    if (error) throw error
  }
}
