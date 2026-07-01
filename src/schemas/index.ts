/**
 * Zod schemas for client-side form validation.
 *
 * Phase-3 starting set — wider coverage gets added as we type
 * individual forms (equipment request, onboarding, mailbox, etc.).
 * Inferred TS types are exported alongside so the form components
 * can `z.infer<typeof X>` instead of redeclaring shapes.
 */
import { z } from 'zod'

// ─── Primitives ──────────────────────────────────────
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email address')

export const optionalEmailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .optional()
  .or(z.literal(''))

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+\d\s().-]{6,}$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''))

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// ─── Personal info submission (public onboarding token) ──
export const submitPersonalInfoSchema = z.object({
  token: z.string().uuid('Invalid token'),
  personal_email: emailSchema,
})
export type SubmitPersonalInfoInput = z.infer<typeof submitPersonalInfoSchema>

// ─── Equipment request ──────────────────────────────
export const equipmentRequestSchema = z.object({
  project_name: z.string().trim().min(1, 'Project name required').max(200),
  project_description: z.string().trim().max(2000).optional(),
  pickup_date: isoDateSchema,
  return_date: isoDateSchema,
  pickup_contact_phone: phoneSchema,
  return_contact_phone: phoneSchema,
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().positive().max(99),
      options: z.record(z.string(), z.unknown()).optional(),
    })
  ).min(1, 'Add at least one item'),
}).refine(
  (d) => new Date(d.return_date) >= new Date(d.pickup_date),
  { message: 'Return date must be after pickup', path: ['return_date'] },
)
export type EquipmentRequestInput = z.infer<typeof equipmentRequestSchema>

// ─── Mailbox request ────────────────────────────────
export const mailboxRequestSchema = z.object({
  email_to_create: emailSchema,
  requested_by_name: z.string().trim().min(1).max(200),
  business_unit: z.string().trim().min(1),
  purpose: z.string().trim().max(1000).optional(),
})
export type MailboxRequestInput = z.infer<typeof mailboxRequestSchema>

// ─── Onboarding identity ────────────────────────────
export const onboardingIdentitySchema = z.object({
  first_name: z.string().trim().min(1, 'First name required').max(80),
  last_name: z.string().trim().min(1, 'Last name required').max(80),
  business_unit: z.string().trim().min(1, 'Pick a business unit'),
  email_local: z.string().trim().min(1).regex(/^[a-z][a-z0-9._-]*$/i, 'Invalid email local'),
  email_domain: z.string().trim().min(1),
  personal_email: emailSchema,
  job_title: z.string().trim().min(1, 'Job title required').max(120),
  profile: z.string().trim().min(1),
})
export type OnboardingIdentityInput = z.infer<typeof onboardingIdentitySchema>
