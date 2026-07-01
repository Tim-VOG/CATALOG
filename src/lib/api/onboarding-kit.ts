import { supabase } from '@/lib/supabase'
import { createLoanRequest } from './loan-requests'

/**
 * Default kit picked up the day a new hire shows up.
 *   - 1 laptop (PC) — case-insensitive name match
 *   - 1 charger (USB-C / "chargeur" / "charger")
 *
 * Phones are intentionally NOT in the auto-kit — VO Group doesn't
 * hand a phone to every new hire. Add per-role logic later if that
 * changes.
 */
const KIT_RULES = [
  { tag: 'laptop',  patterns: ['laptop', 'macbook', 'thinkpad', 'pc'], required: true },
  { tag: 'charger', patterns: ['chargeur', 'charger'],                  required: true },
]

interface OnboardingItRequest {
  id: string
  type?: string | null
  requested_by?: string | null
  requester_email?: string | null
  data?: Record<string, any> | null
}

export interface ReserveKitResult {
  loan_request_id: string
  reserved: { product_id: string; product_name: string; tag: string }[]
  missing: { tag: string; patterns: string[] }[]
}

/**
 * Reserve a starter kit for an onboarding it_request. Idempotent on
 * the it_request id — if a loan_request already exists with the
 * `onboarding_request_id` matching, the call short-circuits and
 * returns the existing row instead of creating duplicates.
 */
export async function reserveOnboardingKit(itRequest: OnboardingItRequest): Promise<ReserveKitResult> {
  if (itRequest.type !== 'onboarding') {
    throw new Error('Only onboarding requests can trigger a kit reservation.')
  }

  const data = itRequest.data || {}
  const firstName = data.first_name || data.firstName || ''
  const lastName  = data.last_name  || data.lastName  || ''
  const newHireEmail = data.personal_email || data.email || itRequest.requester_email || ''
  const pickupDate = data.first_day || data.startDate || new Date().toISOString().slice(0, 10)
  const projectName = `Onboarding kit · ${[firstName, lastName].filter(Boolean).join(' ') || 'New hire'}`

  // 1. Look up every visible product and match by name.
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, total_stock, is_visible')
    .eq('is_visible', true)
  if (prodErr) throw prodErr

  const reserved: ReserveKitResult['reserved'] = []
  const missing: ReserveKitResult['missing'] = []

  for (const rule of KIT_RULES) {
    const hit = (products || []).find((p) => {
      const name = (p.name || '').toLowerCase()
      return rule.patterns.some((pat) => name.includes(pat))
    })
    if (hit) {
      reserved.push({ product_id: hit.id, product_name: hit.name, tag: rule.tag })
    } else if (rule.required) {
      missing.push({ tag: rule.tag, patterns: rule.patterns })
    }
  }

  if (!reserved.length) {
    throw new Error(
      `Catalog has no matching products for the onboarding kit. Add at least a laptop and a charger.`,
    )
  }

  // 2. Has this onboarding already reserved a kit? Skip if so.
  const { data: existing } = await supabase
    .from('loan_requests')
    .select('id')
    .eq('onboarding_request_id', itRequest.id)
    .limit(1)

  if (existing?.length) {
    return { loan_request_id: existing[0].id, reserved, missing }
  }

  // 3. Create the loan_request + items via the existing helper.
  // user_id falls back to the requester (typically the admin who
  // submitted the form on the new hire's behalf). The new hire's
  // name is preserved in project_name + project_description so the
  // admin UI still shows who it's for.
  const created = await createLoanRequest({
    request: {
      user_id: itRequest.requested_by || null,
      project_name: projectName,
      project_description: `Auto-reserved for ${[firstName, lastName].filter(Boolean).join(' ')}${newHireEmail ? ` (${newHireEmail})` : ''}. Starts ${pickupDate}.`,
      pickup_date: pickupDate,
      return_date: null,             // open-ended — they keep it
      status: 'pending',
      onboarding_request_id: itRequest.id,
    },
    items: reserved.map((r) => ({
      product: { id: r.product_id },
      quantity: 1,
      options: { auto_reserved: true, kit_tag: r.tag },
    })),
  })

  return { loan_request_id: created.id, reserved, missing }
}
