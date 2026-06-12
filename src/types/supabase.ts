/**
 * Hand-written row types for the core public tables.
 *
 * These are a Phase-3 starting point — wide enough to use across
 * the codebase, narrow enough to catch obvious shape mistakes. To
 * regenerate a full schema from the live DB once we have the
 * Supabase CLI wired up:
 *
 *   npx supabase gen types typescript --project-id <ref> \
 *     > src/types/supabase.gen.ts
 *
 * and re-export the relevant rows from here.
 */

export type UUID = string

export type LoanStatus =
  | 'pending'
  | 'in_progress'
  | 'ready'
  | 'cancelled'

export type ItRequestType = 'onboarding' | 'offboarding'

export type QrStatus =
  | 'available'
  | 'assigned'
  | 'reserved'
  | 'damaged'
  | 'lost'

export type UserRole = 'admin' | 'user'

// ─── profiles ────────────────────────────────────────
export interface Profile {
  id: UUID
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole | null
  phone: string | null
  avatar_url: string | null
  created_at: string
}

// ─── categories ──────────────────────────────────────
export interface Category {
  id: UUID
  name: string
  color: string | null
}

// ─── products ────────────────────────────────────────
export interface Product {
  id: UUID
  name: string
  description: string | null
  category_id: UUID | null
  total_stock: number
  is_visible: boolean
  created_at: string
}

// ─── qr_codes ────────────────────────────────────────
export interface QrCode {
  id: UUID
  code: string
  label: string | null
  product_id: UUID | null
  is_active: boolean
  status: QrStatus
  assigned_to: UUID | null
  assigned_to_name: string | null
  assigned_to_email: string | null
  assigned_at: string | null
  loan_request_id: UUID | null
  loan_request_item_id: UUID | null
  created_at: string
}

// ─── loan_requests ───────────────────────────────────
export interface LoanRequest {
  id: UUID
  user_id: UUID
  project_name: string
  project_description: string | null
  pickup_date: string | null
  return_date: string | null
  status: LoanStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── loan_request_items ──────────────────────────────
export interface LoanRequestItem {
  id: UUID
  loan_request_id: UUID
  product_id: UUID
  quantity: number
  options: Record<string, unknown> | null
}

// ─── it_requests ─────────────────────────────────────
export interface ItRequest {
  id: UUID
  type: ItRequestType
  status: LoanStatus
  requested_by: UUID | null
  requester_name: string | null
  requester_email: string | null
  data: Record<string, unknown> | null
  custom_fields: Record<string, unknown> | null
  personal_info_token: UUID | null
  created_at: string
  updated_at: string
}

// ─── mailbox_requests ────────────────────────────────
export interface MailboxRequest {
  id: UUID
  requested_by: UUID | null
  requested_by_name: string | null
  email_to_create: string | null
  status: LoanStatus
  data: Record<string, unknown> | null
  created_at: string
}

// ─── qr_scan_logs ────────────────────────────────────
export type ScanAction = 'take' | 'deposit'

export interface QrScanLog {
  id: UUID
  qr_code: string
  product_id: UUID | null
  product_name: string | null
  user_id: UUID | null
  user_name: string | null
  user_email: string | null
  action: ScanAction
  pickup_date: string | null
  expected_return_date: string | null
  actual_return_date: string | null
  created_at: string
}

// ─── it_device_credentials ───────────────────────────
export interface ItDeviceCredential {
  id: UUID
  qr_code_id: UUID
  imei: string | null
  mac_address: string | null
  serial_number: string | null
  sim_iccid: string | null
  sim_pin: string | null
  phone_number: string | null
  carrier: string | null
  wifi_ssid: string | null
  wifi_password: string | null
  router_password: string | null
  os_version: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
