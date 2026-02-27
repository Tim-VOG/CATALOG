/**
 * Checkout Service — business logic extracted from CheckoutPage.
 *
 * Handles form validation, payload construction, and post-submit email dispatch.
 */

import { sendEmail } from '@/lib/api/send-email'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'
import { getNotificationRecipients } from '@/lib/api/notification-recipients'
import { generateStatusEmailDraft } from '@/lib/email-draft'
import { wrapEmailHtml, generateDetailsCard, generateItemsHtml, escapeHtml } from '@/lib/email-html'

/**
 * Validate checkout form fields against active form field definitions.
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateCheckoutFields(fieldValues, activeFields, ccEmails = []) {
  const errors = {}

  activeFields.forEach((field) => {
    const val = fieldValues[field.field_key]
    if (field.is_required) {
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        errors[field.field_key] = `${field.label} is required`
      }
    }
    if (field.field_type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      errors[field.field_key] = 'Please enter a valid email'
    }
  })

  // Validate CC emails
  ccEmails.forEach((email, i) => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors[`cc_email_${i}`] = 'Invalid email address'
    }
  })

  // Min-length checks
  if (fieldValues.project_name && fieldValues.project_name.length < 3) {
    errors.project_name = 'Project name must be at least 3 characters'
  }
  if (fieldValues.project_description && fieldValues.project_description.length < 10) {
    errors.project_description = 'Please provide a brief description (min 10 characters)'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Build a loan request payload ready for the API.
 */
export function buildLoanRequestPayload({ user, fieldValues, activeFields, items, startDate, endDate, ccEmails = [] }) {
  const systemKeys = activeFields.filter((f) => f.is_system).map((f) => f.field_key)
  const validCcEmails = ccEmails.map((e) => e.trim()).filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  const customFields = {}

  Object.entries(fieldValues).forEach(([k, v]) => {
    if (!systemKeys.includes(k) && !['terms_accepted', 'responsibility_accepted', 'location_other'].includes(k)) {
      customFields[k] = v
    }
  })
  if (validCcEmails.length > 0) {
    customFields.cc_emails = validCcEmails
  }

  return {
    request: {
      user_id: user.id,
      project_name: fieldValues.project_name || '',
      project_description: fieldValues.project_description || '',
      location_id: fieldValues.location_id || null,
      location_other: fieldValues.location_other || null,
      justification: fieldValues.justification || null,
      priority: fieldValues.priority || 'normal',
      pickup_date: startDate,
      return_date: endDate,
      terms_accepted: fieldValues.terms_accepted,
      responsibility_accepted: fieldValues.responsibility_accepted,
      custom_fields: customFields,
      status: 'pending',
    },
    items,
    validCcEmails,
  }
}

/**
 * Send post-checkout emails (fire-and-forget).
 * 1) Order confirmation to the user
 * 2) Admin notification to configured recipients
 */
export function sendCheckoutEmails({
  fieldValues,
  items,
  startDate,
  endDate,
  profile,
  user,
  settings,
  locations,
  ccEmails = [],
}) {
  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url || ''
  const tagline = settings?.email_tagline || ''
  const logoHeight = settings?.email_logo_height || 0
  const requesterName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email
  const selectedLoc = locations.find((l) => l.id === fieldValues.location_id)
  const validCcEmails = ccEmails.map((e) => e.trim()).filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const itemData = items.map((i) => ({
    product_name: i.product.name,
    product_image: i.product.image_url,
    quantity: i.quantity,
    product_includes: i.product.includes || [],
    options: i.options || {},
  }))

  // 1) User confirmation email
  getEmailTemplateByKey('order_confirmation')
    .then(async (template) => {
      if (!template || !template.is_active) return
      const requestData = {
        user_first_name: profile?.first_name || '',
        user_last_name: profile?.last_name || '',
        user_email: user?.email,
        project_name: fieldValues.project_name || '',
        project_description: fieldValues.project_description || '',
        pickup_date: startDate,
        return_date: endDate,
        location_name: selectedLoc?.name || '',
        custom_fields: fieldValues,
      }
      const draft = generateStatusEmailDraft({ template, request: requestData, items: itemData, appName, logoUrl, tagline, logoHeight })
      if (!draft.to) return
      const result = await sendEmail({ to: draft.to, cc: validCcEmails.length > 0 ? validCcEmails : undefined, subject: draft.subject, body: draft.body, isHtml: draft.isHtml })
      if (!result.success) console.error('[order_confirmation] Send failed:', result.error)
    })
    .catch((err) => console.error('[order_confirmation] Error:', err))

  // 2) Admin notification email
  const detailsCard = generateDetailsCard({
    project_name: fieldValues.project_name || '',
    pickup_date: formatDate(startDate),
    return_date: formatDate(endDate),
  })
  const adminItemsHtml = generateItemsHtml(itemData)
  const adminBody = wrapEmailHtml(
    `New equipment request submitted by <strong style="color:#f1f5f9;">${escapeHtml(requesterName)}</strong>.\n\n` +
    detailsCard + '\n\n' +
    adminItemsHtml,
    { appName, logoUrl, tagline, logoHeight }
  )

  getNotificationRecipients()
    .then(async (recipients) => {
      const adminEmails = (recipients || [])
        .filter((r) => r.is_active && r.notify_on_new_request)
        .map((r) => r.email)
      if (adminEmails.length === 0) return
      const result = await sendEmail({
        to: adminEmails,
        subject: `[${appName}] New request: ${fieldValues.project_name || 'Equipment request'} — by ${requesterName}`,
        body: adminBody,
        isHtml: true,
      })
      if (!result.success) console.error('[admin notification] Send failed:', result.error)
    })
    .catch((err) => console.error('[admin notification] Error:', err))
}
