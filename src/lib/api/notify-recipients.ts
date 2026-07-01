import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'

export type RequestKind = 'it' | 'onboarding' | 'offboarding' | 'equipment' | 'mailbox'

export type NotificationEvent = 'new_request' | 'status_change' | 'return'

interface NotifyArgs {
  kind: RequestKind
  event: NotificationEvent
  submitter?: string | null
  subject?: string | null
  detail?: string | null
}

const TOGGLE_COLUMN: Record<NotificationEvent, string> = {
  new_request: 'notify_on_new_request',
  status_change: 'notify_on_status_change',
  return: 'notify_on_return',
}

const KIND_LABEL: Record<RequestKind, string> = {
  it: 'IT request',
  onboarding: 'Onboarding request',
  offboarding: 'Offboarding request',
  equipment: 'Equipment request',
  mailbox: 'Functional mailbox request',
}

const EVENT_VERB: Record<NotificationEvent, string> = {
  new_request: 'submitted',
  status_change: 'updated',
  return: 'returned',
}

function buildSubject({ kind, event, subject }: NotifyArgs): string {
  const label = KIND_LABEL[kind]
  const verb = EVENT_VERB[event]
  return subject ? `[VO Hub] ${label} ${verb}: ${subject}` : `[VO Hub] ${label} ${verb}`
}

function buildBody({ kind, event, submitter, subject, detail }: NotifyArgs): string {
  const lines: string[] = []
  lines.push(`<p>A ${KIND_LABEL[kind].toLowerCase()} was just ${EVENT_VERB[event]} in VO Hub.</p>`)
  if (subject) lines.push(`<p><strong>${subject}</strong></p>`)
  if (submitter) lines.push(`<p><span style="color:#666">Submitted by:</span> ${submitter}</p>`)
  if (detail) lines.push(`<p style="color:#444">${detail}</p>`)
  lines.push('<p style="color:#888;font-size:12px;margin-top:24px">You are receiving this because you are listed as a notification recipient in VO Hub. An admin can change this from Admin → Communications.</p>')
  return lines.join('\n')
}

/**
 * Notify every active recipient whose toggle for this event is on.
 *
 * Fire-and-forget: errors are logged but never thrown, so a flaky
 * SMTP or a missing recipient never blocks the user's submit flow.
 */
export async function notifyRecipients(args: NotifyArgs): Promise<void> {
  try {
    const toggle = TOGGLE_COLUMN[args.event]
    const { data, error } = await supabase
      .from('notification_recipients')
      .select('email')
      .eq('is_active', true)
      .eq(toggle, true)

    if (error) {
      console.warn('[notifyRecipients] recipient query failed:', error.message)
      return
    }
    const recipients = (data ?? []).map((r) => r.email).filter(Boolean)
    if (recipients.length === 0) return

    const subject = buildSubject(args)
    const body = buildBody(args)

    await Promise.all(
      recipients.map((to) =>
        sendEmail({ to, subject, body, isHtml: true }).catch((err: any) => {
          console.warn('[notifyRecipients] send failed for', to, err)
        }),
      ),
    )
  } catch (err) {
    console.warn('[notifyRecipients] unexpected error:', err)
  }
}
