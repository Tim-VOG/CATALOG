import { sendEmail } from '@/lib/api/send-email'
import { supabase } from '@/lib/supabase'
import { wrapEmailHtml, generateItemsHtml, getEmailBranding } from '@/lib/email-html'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'
import i18n from '@/lib/i18n'

export async function createNotification(userId: any, title: string, message: string, type = 'status_change') {
  if (!userId) return
  try {
    await supabase.from('notifications').insert({
      user_id: userId, type, title, message,
      link: '/my-requests',
    })
  } catch {}
}

export const STATUS_TRANSITIONS = {
  pending: ['in_progress'],
  in_progress: ['ready'],
  // 'ready' = ready for pickup. Once the gear comes back, the admin
  // marks it 'returned' — a real terminal state, distinct from
  // "ready for pickup".
  ready: ['returned'],
  returned: [],
}

export function getAvailableTransitions(currentStatus: any) {
  return (STATUS_TRANSITIONS as Record<string, any>)[currentStatus as keyof typeof STATUS_TRANSITIONS] || []
}

// ── Hardcoded fallbacks (used if DB template is unavailable) ──
// All templates share the same "white bordered card with label + value rows"
// layout as mailbox_confirmation — single design across every email.
const CARD_OPEN = '<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:24px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);">'
const cardRow = (label: any, value: any, { last = false, big = false } = {}) =>
  `<tr><td style="padding:18px 22px;${last ? '' : 'border-bottom:1px solid #eef2f7;'}"><div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;margin-bottom:4px;">${label}</div><div style="font-weight:${big ? '700' : '600'};color:#0a2540;font-size:${big ? '17' : '15'}px;letter-spacing:${big ? '-0.2px' : 'normal'};">${value}</div></td></tr>`
const card = (rows: any[]) => `${CARD_OPEN}${rows.map((r: any, i: number) => cardRow(r.label, r.value, { last: i === rows.length - 1, big: r.big })).join('')}</table>`

// Normalise any language hint to one of our three supported codes.
export const normLang = (l: any): 'fr' | 'en' | 'nl' => {
  const s = String(l || '').slice(0, 2).toLowerCase()
  return s === 'en' || s === 'nl' ? s : 'fr'
}

// Per-language label for "the thing the request is about".
const SUBJECT_LABELS: Record<string, Record<string, string>> = {
  fr: { onboarding: 'Nouvel arrivant', offboarding: 'Départ', mailbox: 'Boîte mail', equipment: 'Demande', request: 'Demande' },
  en: { onboarding: 'New hire', offboarding: 'Person leaving', mailbox: 'Mailbox', equipment: 'Request', request: 'Request' },
  nl: { onboarding: 'Nieuwe medewerker', offboarding: 'Vertrek', mailbox: 'Mailbox', equipment: 'Aanvraag', request: 'Aanvraag' },
}

// Built-in trilingual transactional templates (subject + body), auto-picked
// by the recipient's language. {{company}} auto-fills with their business
// unit. These are the default; a per-BU DB override (if any) still wins.
type Tmpl = { subject: string; body: string }
const TRANSACTIONAL_I18N: Record<string, Record<'fr' | 'en' | 'nl', Tmpl>> = {
  request_confirmed: {
    fr: { subject: 'Ta demande a bien été reçue', body: `Bonjour {{requester_name}},\n\nTa demande a bien été reçue et sera traitée par l'équipe IT.\n\n${card([{ label: 'Statut', value: 'En attente', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\nTu peux suivre ta demande à tout moment dans le hub.\n\nBien à toi,\nL'équipe {{company}}` },
    en: { subject: 'Your request has been received', body: `Hi {{requester_name}},\n\nYour request has been received and will be processed by the IT team.\n\n${card([{ label: 'Status', value: 'Pending', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\nYou can track your request anytime in the hub.\n\nBest,\nThe {{company}} team` },
    nl: { subject: 'Je aanvraag is ontvangen', body: `Hallo {{requester_name}},\n\nJe aanvraag is ontvangen en wordt verwerkt door het IT-team.\n\n${card([{ label: 'Status', value: 'In afwachting', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\nJe kunt je aanvraag op elk moment volgen in de hub.\n\nMet vriendelijke groet,\nHet {{company}}-team` },
  },
  onboarding_confirmation: {
    fr: { subject: "Demande d'onboarding reçue pour {{new_hire_name}}", body: `Bonjour {{requester_name}},\n\nTa demande d'onboarding pour **{{new_hire_name}}** a bien été reçue et l'équipe IT va la traiter.\n\n${card([{ label: 'Statut', value: 'En attente', big: true }, { label: 'Nouvel arrivant', value: '{{new_hire_name}}' }])}\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;"><tr><td><div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;"><p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">N'oublie pas</p><p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Envoie le <strong>formulaire INFORMATIONS PERSONNELLES</strong> à {{new_hire_name}} via les RH pour qu'on puisse livrer les documents de bienvenue sur son email personnel.</p></div></td></tr></table>\n\nOn te préviendra dès que le compte est prêt.\n\nBien à toi,\nL'équipe {{company}}` },
    en: { subject: 'Onboarding request received for {{new_hire_name}}', body: `Hi {{requester_name}},\n\nYour onboarding request for **{{new_hire_name}}** has been received and the IT team will start processing it.\n\n${card([{ label: 'Status', value: 'Pending', big: true }, { label: 'New hire', value: '{{new_hire_name}}' }])}\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;"><tr><td><div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;"><p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">Don't forget</p><p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Send the <strong>PERSONAL INFORMATION form</strong> to {{new_hire_name}} via HR so we can deliver the welcome materials to their personal email.</p></div></td></tr></table>\n\nWe'll let you know as soon as the corporate account is ready.\n\nBest,\nThe {{company}} team` },
    nl: { subject: 'Onboardingaanvraag ontvangen voor {{new_hire_name}}', body: `Hallo {{requester_name}},\n\nJe onboardingaanvraag voor **{{new_hire_name}}** is ontvangen en het IT-team gaat ermee aan de slag.\n\n${card([{ label: 'Status', value: 'In afwachting', big: true }, { label: 'Nieuwe medewerker', value: '{{new_hire_name}}' }])}\n\n<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;"><tr><td><div style="background:#eef4ff;border-left:3px solid #3955cf;border-radius:8px;padding:16px 18px;"><p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:#3955cf;letter-spacing:0.5px;text-transform:uppercase;">Niet vergeten</p><p style="margin:0;font-size:14px;color:#0a2540;line-height:1.55;">Stuur het <strong>PERSOONLIJKE-INFORMATIEformulier</strong> naar {{new_hire_name}} via HR zodat we het welkomstmateriaal naar hun persoonlijke e-mail kunnen sturen.</p></div></td></tr></table>\n\nWe laten het weten zodra het account klaar is.\n\nMet vriendelijke groet,\nHet {{company}}-team` },
  },
  request_in_progress: {
    fr: { subject: 'Ta demande est en préparation', body: `Bonjour {{requester_name}},\n\nTa demande est maintenant en préparation par l'équipe IT.\n\n${card([{ label: 'Statut', value: 'En cours', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\n{{items_html}}\n\nOn te préviendra dès que c'est prêt.\n\nBien à toi,\nL'équipe {{company}}` },
    en: { subject: 'Your request is being prepared', body: `Hi {{requester_name}},\n\nYour request is now being prepared by the IT team.\n\n${card([{ label: 'Status', value: 'In Progress', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\n{{items_html}}\n\nWe'll let you know as soon as it's ready.\n\nBest,\nThe {{company}} team` },
    nl: { subject: 'Je aanvraag wordt voorbereid', body: `Hallo {{requester_name}},\n\nJe aanvraag wordt nu voorbereid door het IT-team.\n\n${card([{ label: 'Status', value: 'Wordt voorbereid', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\n{{items_html}}\n\nWe laten het weten zodra het klaar is.\n\nMet vriendelijke groet,\nHet {{company}}-team` },
  },
  request_ready: {
    fr: { subject: 'Ta demande est prête', body: `Bonjour {{requester_name}},\n\nTa demande est terminée et prête à être récupérée au bureau IT.\n\n${card([{ label: 'Statut', value: 'Prêt', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\n{{items_html}}\n\nPasse au bureau IT quand tu veux.\n\nBien à toi,\nL'équipe {{company}}` },
    en: { subject: 'Your request is ready', body: `Hi {{requester_name}},\n\nYour request has been completed and is ready for pickup at the IT desk.\n\n${card([{ label: 'Status', value: 'Ready', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\n{{items_html}}\n\nCome by the IT desk whenever you're ready.\n\nBest,\nThe {{company}} team` },
    nl: { subject: 'Je aanvraag is klaar', body: `Hallo {{requester_name}},\n\nJe aanvraag is afgerond en klaar om af te halen aan de IT-balie.\n\n${card([{ label: 'Status', value: 'Klaar', big: true }, { label: '{{subject_label}}', value: '{{subject_name}}' }])}\n\n{{items_html}}\n\nKom langs de IT-balie wanneer je wilt.\n\nMet vriendelijke groet,\nHet {{company}}-team` },
  },
  request_return_reminder: {
    fr: { subject: 'Rappel : {{product_name}} à rendre le {{return_date}}', body: `Bonjour {{requester_name}},\n\nPetit rappel : **{{product_name}}** doit être rendu le **{{return_date}}**. Merci de rapporter le matériel au bureau IT.\n\n${card([{ label: 'Matériel', value: '{{product_name}}', big: true }, { label: 'Date de retour', value: '{{return_date}}' }])}\n\nBien à toi,\nL'équipe {{company}}` },
    en: { subject: 'Reminder: {{product_name}} due back on {{return_date}}', body: `Hi {{requester_name}},\n\nFriendly reminder that **{{product_name}}** is due for return on **{{return_date}}**. Please bring the equipment to the IT desk.\n\n${card([{ label: 'Equipment', value: '{{product_name}}', big: true }, { label: 'Return date', value: '{{return_date}}' }])}\n\nBest,\nThe {{company}} team` },
    nl: { subject: 'Herinnering: {{product_name}} terug op {{return_date}}', body: `Hallo {{requester_name}},\n\nVriendelijke herinnering dat **{{product_name}}** terug moet op **{{return_date}}**. Breng het materiaal naar de IT-balie.\n\n${card([{ label: 'Materiaal', value: '{{product_name}}', big: true }, { label: 'Retourdatum', value: '{{return_date}}' }])}\n\nMet vriendelijke groet,\nHet {{company}}-team` },
  },
}

function substitute(text: string, vars: Record<string, any>) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] ?? `[${key}]`)
}

/**
 * Load a template from the DB and substitute {{vars}}.
 * Falls back to the hardcoded version if the DB row is missing.
 * Always returns { subject, body } where body is the inner content
 * (not yet wrapped by wrapEmailHtml).
 */
export async function renderTemplate(key: string, vars: Record<string, any>, businessUnit: any = '', language: any = 'fr') {
  const lang = normLang(language)
  // A per-BU DB override (admin's explicit customisation) wins; otherwise we
  // use the built-in trilingual template picked by the recipient's language,
  // so subjects and bodies are always in their language.
  let override: any = null
  try {
    const bu = String(businessUnit || '').trim()
    if (bu) override = await getEmailTemplateByKey(key, bu)
    // Only treat it as an override when it's actually a BU-specific row.
    if (override && (override.business_unit || '') === '') override = null
  } catch {}
  const builtin = (TRANSACTIONAL_I18N as any)[key]?.[lang]
    || (TRANSACTIONAL_I18N as any)[key]?.en
  const source = override || builtin || { subject: '', body: '' }
  return {
    subject: substitute(source.subject, vars),
    body: substitute(source.body, vars),
  }
}

// ── Public: build a confirmation email (called from form pages) ──
// For onboarding requests, uses the dedicated onboarding_confirmation
// template (which includes the HR personal-information reminder).
export async function buildConfirmationEmail({ name, type, detail, newHireName, language, company }: { name?: string; type: string; detail?: string; newHireName?: string; language?: any; company?: any }) {
  const isOnboarding = type === 'onboarding'
  const key = isOnboarding ? 'onboarding_confirmation' : 'request_confirmed'
  const subjectName = newHireName || detail || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Equipment')
  const co = company || 'VO Group'
  const lang = language || i18n.language
  const vars = {
    requester_name: name || 'there',
    request_type: type || 'equipment',
    detail: detail || '',
    new_hire_name: newHireName || detail || 'the new hire',
    subject_label: subjectLabelFor(type || 'equipment', lang),
    subject_name: subjectName,
    company: co,
  }
  const { body } = await renderTemplate(key, vars, co, lang)
  return wrapEmailHtml(body, await getEmailBranding())
}

export async function buildConfirmationSubject({ type, newHireName, detail, language, company }: { type: string; newHireName?: string; detail?: string; language?: any; company?: any }) {
  const isOnboarding = type === 'onboarding'
  const key = isOnboarding ? 'onboarding_confirmation' : 'request_confirmed'
  const { subject } = await renderTemplate(key, {
    request_type: type || 'equipment',
    requester_name: '',
    new_hire_name: newHireName || detail || 'the new hire',
    company: company || 'VO Group',
  }, company || '', language || i18n.language)
  return subject
}

// Per-request-type "subject of the action" — the person/thing the
// request is about. Mirrors what onboarding shows via {{new_hire_name}}.
function fullName(...sources: any[]) {
  for (const s of sources) {
    const n = [s?.first_name, s?.last_name].filter(Boolean).join(' ').trim()
    if (n) return n
    if (s?.name) return s.name
    if (s?.full_name) return s.full_name
  }
  return ''
}
export function subjectLabelFor(requestType: string, language: any = 'en') {
  const L = SUBJECT_LABELS[normLang(language)]
  return L[requestType] || L.request
}
export function subjectNameFor(req: any, requestType: string) {
  // For IT requests the form payload lives in req.data (jsonb) — dig into
  // it too so we never end up showing just the capitalised type.
  const data = req?.data || {}
  let v: any
  if (requestType === 'onboarding' || requestType === 'offboarding') {
    v = fullName(req, data)
      || req?.new_hire_name || data?.new_hire_name
      || data?.email_to_create
      || req?.requested_by_name
  } else if (requestType === 'mailbox') {
    v = req?.email_to_create || data?.email_to_create
      || req?.mailbox_email
      || req?.project_name || data?.project_name
  } else {
    v = req?.project_name || data?.project_name || data?.name
  }
  // Last-resort fallback: short request id so the manager can still identify
  // which request the email is about, even when the form left every name
  // field blank.
  if (v) return v
  const shortId = req?.id ? `#${String(req.id).slice(0, 8)}` : ''
  return shortId || '—'
}

// ── Status change emails (in_progress / ready) ──
export async function sendStatusChangeEmail(newStatus: any, { request, requestType = 'equipment' }: any) {
  const key =
    newStatus === 'in_progress' ? 'request_in_progress' :
    newStatus === 'ready' ? 'request_ready' :
    null
  if (!key) return

  // Try every known shape, then fall back to a profile lookup so older
  // rows (created before requester_email existed on a given table) still
  // trigger the email.
  let email = request.user_email || request.requester_email
  let name = request.user_first_name || request.requester_name || request.requested_by_name
  let language = request.language || request.data?.language
  let profBU = ''
  const userId = request.user_id || request.requester_id || request.requested_by
  if (userId) {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email, first_name, language, business_unit')
        .eq('id', userId)
        .maybeSingle()
      if (!email && prof?.email) email = prof.email
      if (!name && prof?.first_name) name = prof.first_name
      if (!language && prof?.language) language = prof.language
      if (prof?.business_unit) profBU = prof.business_unit
    } catch {}
  }
  if (!email) {
    console.warn('[sendStatusChangeEmail] no email found for request', request.id, requestType)
    return
  }
  if (!name) name = email.split('@')[0]

  // For equipment loan requests, include the list of items (with images)
  // so the requester sees exactly what's being prepared / ready.
  let itemsHtml = ''
  if (requestType === 'equipment' && request?.id) {
    try {
      const { data: items } = await supabase
        .from('loan_request_items_with_details')
        .select('*')
        .eq('request_id', request.id)
      if (items?.length) itemsHtml = generateItemsHtml(items)
    } catch {}
  }

  const bu = request.business_unit || request.agency || request.data?.business_unit || request.data?.company || profBU || ''
  const { subject, body } = await renderTemplate(key, {
    requester_name: name,
    request_type: requestType,
    subject_label: subjectLabelFor(requestType, language),
    subject_name: subjectNameFor(request, requestType),
    items_html: itemsHtml,
    company: bu || 'VO Group',
  }, bu, language)

  await sendEmail({
    to: email,
    subject,
    body: wrapEmailHtml(body, await getEmailBranding()),
    isHtml: true,
  })

  // Create in-app notification
  const notifTitle = newStatus === 'in_progress' ? 'Request in progress' : 'Request ready'
  const notifMsg = newStatus === 'in_progress'
    ? `Your ${requestType} request is being prepared by the IT team.`
    : `Your ${requestType} request is ready! Come pick it up at the IT desk.`
  createNotification(userId, notifTitle, notifMsg)
}


export const formatDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const formatDateTime = (d: any) =>
  d ? new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

export function buildTimeline(request: any) {
  const events = [{ label: 'Submitted', date: request.created_at }]
  if (['in_progress', 'ready', 'returned'].includes(request.status)) {
    events.push({ label: 'In Progress', date: request.updated_at })
  }
  if (['ready', 'returned'].includes(request.status)) {
    events.push({ label: 'Ready', date: request.updated_at })
  }
  if (request.status === 'returned') {
    events.push({ label: 'Returned', date: request.updated_at })
  }
  return events
}
