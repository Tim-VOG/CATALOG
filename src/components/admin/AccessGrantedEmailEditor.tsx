import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Loader2, Users, UserCheck, KeyRound, Eye, X } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useAuth } from '@/lib/auth'
import { useUpdateMailboxRequest } from '@/hooks/use-mailbox-requests'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml, ctaButton, escapeHtml, escapeAttr } from '@/lib/email-html'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ── Pull emails out of a free-text "who needs access" field ──
export function extractAccessEmails(text: any) {
  if (!text) return []
  const matches = String(text).match(/[\w.+-]+@[\w.-]+\.\w{2,}/g)
  return matches || []
}

// Default editable intro line. Everything else (access card, Mac/Windows
// steps, the optional 1Password button) renders as branded cards — same
// visual language as the welcome email.
const ACCESS_DEFAULT_INTRO = `Je t'ai ajouté(e) sur une boîte mail partagée. Voici tout ce qu'il te faut pour y accéder 👇`

// Footer signature block with the sending admin's contact details
// (name, phone, email) — so the recipient knows who to reach.
export function buildAdminFooterHtml(profile: any, appName: any) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  const title = profile?.job_title || profile?.title || ''
  const phone = profile?.phone || ''
  const email = profile?.email || ''
  if (!name && !phone && !email) {
    return `<div style="font-size:12px;color:#8898aa;line-height:1.6;">Sent from <strong style="color:#525f7f;font-weight:600;">${escapeHtml(appName)}</strong></div>`
  }
  return `<div style="line-height:1.5;">
    ${name ? `<div style="font-weight:700;color:#0a2540;font-size:14px;">${escapeHtml(name)}</div>` : ''}
    ${title ? `<div style="color:#525f7f;font-size:12px;margin-top:1px;">${escapeHtml(title)}</div>` : ''}
    ${phone ? `<div style="color:#8898aa;font-size:12px;margin-top:3px;">${escapeHtml(phone)}</div>` : ''}
    ${email ? `<div style="font-size:12px;margin-top:1px;"><a href="mailto:${escapeAttr(email)}" style="color:#635bff;text-decoration:none;">${escapeHtml(email)}</a></div>` : ''}
  </div>`
}

// A white, rounded section card matching the welcome email look.
function emailCard(icon: string, label: string, innerHtml: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#ffffff;border-radius:12px;border:1px solid #e6ebf1;margin:20px 0;overflow:hidden;box-shadow:0 1px 2px rgba(10,37,64,0.04);"><tr><td style="padding:18px 22px;">
    <div style="font-size:11px;color:#8898aa;text-transform:uppercase;letter-spacing:0.6px;font-weight:700;margin-bottom:10px;">${icon}&nbsp; ${escapeHtml(label)}</div>
    ${innerHtml}
  </td></tr></table>`
}

/**
 * Build the full inner HTML of the access-granted email for one recipient.
 * Rendered through wrapEmailHtml({ raw:true }) so the branded shell wraps it.
 */
export function buildAccessEmailBody(opts: any) {
  const { mailboxEmail, intro, onepasswordLink, includeWindows } = opts
  const mb = escapeHtml(mailboxEmail || '')

  const greeting = `<p style="margin:0 0 18px 0;font-size:20px;font-weight:700;color:#0a2540;letter-spacing:-0.3px;">Salut &#128075;</p>`
  const introHtml = `<p style="margin:0 0 8px 0;line-height:1.65;color:#425466;font-size:15px;">${escapeHtml(intro || '')}</p>`

  const accessCard = emailCard('&#128236;', 'Ta boîte partagée',
    `<div style="font-weight:700;color:#0a2540;font-size:18px;letter-spacing:-0.2px;">${mb}</div>
     <div style="margin-top:4px;color:#425466;font-size:14px;">Tu y as maintenant accès. &#9989;</div>`)

  const macCard = emailCard('&#127822;', 'Sur Mac — à ajouter dans Outlook',
    `<ol style="margin:0;padding-left:20px;color:#425466;font-size:14px;line-height:1.9;">
       <li>Ouvre <strong style="color:#0a2540;">Outils &rarr; Comptes</strong></li>
       <li>Sélectionne ton compte</li>
       <li>Va dans <strong style="color:#0a2540;">Délégation et partage &rarr; Autorisations</strong></li>
       <li>Clique sur <strong style="color:#0a2540;">+</strong> et ajoute <strong style="color:#0a2540;">${mb}</strong></li>
     </ol>`)

  const winCard = includeWindows ? emailCard('&#128421;', 'Sur Windows',
    `<div style="color:#425466;font-size:14px;line-height:1.6;">La boîte apparaît automatiquement après quelques minutes. Si ce n'est pas le cas, redémarre Outlook.</div>`) : ''

  const opCard = onepasswordLink ? emailCard('&#128273;', 'Mot de passe',
    `<div style="color:#425466;font-size:14px;line-height:1.6;margin-bottom:4px;">Le mot de passe a été partagé en toute sécurité via 1Password :</div>
     ${ctaButton('Ouvrir dans 1Password', onepasswordLink)}`) : ''

  // Help block — for a shared mailbox you don't reply to the email, you
  // ping the IT team on Teams. Styled like the other cards (Teams purple).
  const helpCard = `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;background:#f5f3ff;border-radius:12px;border:1px solid #ddd6fe;margin:24px 0 4px 0;overflow:hidden;"><tr><td style="padding:16px 20px;">
    <div style="font-size:15px;font-weight:700;color:#5b21b6;margin-bottom:2px;">&#128172; Besoin d'aide ?</div>
    <div style="color:#4c1d95;font-size:14px;line-height:1.6;">Contacte l'équipe IT sur <strong>Microsoft Teams</strong> et on s'en occupe avec toi. &#128075;</div>
  </td></tr></table>`

  return greeting + introHtml + accessCard + macCard + winCard + opCard + helpCard
}

/**
 * Compose + send one personalised "you now have access" email per person
 * in a shared-mailbox request's "who needs access" list. Rendered as branded
 * cards (Mac/Windows setup steps + optional 1Password button).
 */
export function AccessGrantedEmailEditor({ req, settings, onClose, onSent }: any) {
  const { t } = useTranslation()
  const showToast = useUIStore((s: any) => s.showToast)
  const { profile } = useAuth()
  const updateRequest = useUpdateMailboxRequest()
  const appName = settings?.app_name || 'VO Hub'
  const mailboxEmail = req.email_to_create || ''

  // Main recipient = the person who requested the mailbox. Everyone who
  // needs access goes in CC, so a single email reaches all of them.
  const [mainTo, setMainTo] = useState<string>(() => (req.requester_email || '').toLowerCase())
  const [recipients, setRecipients] = useState<any>(() => extractAccessEmails(req.who_needs_access))
  const [inputValue, setInputValue] = useState('')
  const [subject, setSubject] = useState(
    () => t('admin.mailboxAnnouncement.accessSubjectDefault', { mailbox_email: mailboxEmail })
  )
  const [intro, setIntro] = useState(() => ACCESS_DEFAULT_INTRO)
  const [onepasswordLink, setOnepasswordLink] = useState(() => req.onepassword_link || '')
  const [includeWindows, setIncludeWindows] = useState(true)
  const [sending, setSending] = useState(false)

  const isValidEmail = (e: any) => /^[\w.+-]+@[\w.-]+\.\w{2,}$/.test(String(e).trim())
  const addRecipient = (raw: any) => {
    const e = String(raw).trim().toLowerCase()
    if (!e || !isValidEmail(e) || recipients.includes(e)) { setInputValue(''); return }
    setRecipients((prev: any) => [...prev, e]); setInputValue('')
  }
  const removeRecipient = (idx: any) => setRecipients((prev: any) => prev.filter((_: any, i: any) => i !== idx))

  // One shared email body (generic greeting), sent to the requester with the
  // access people in CC.
  const renderBody = () => wrapEmailHtml(
    buildAccessEmailBody({ mailboxEmail, intro, onepasswordLink, includeWindows }),
    {
      appName,
      logoUrl: settings?.logo_url || '',
      tagline: settings?.email_tagline || '',
      logoHeight: settings?.email_logo_height || 0,
      raw: true,
      footerNote: '',
      footerHtml: buildAdminFooterHtml(profile, appName),
    }
  )

  const previewHtml = useMemo(
    () => renderBody(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mailboxEmail, appName, settings, intro, onepasswordLink, includeWindows, profile]
  )

  const handleSend = async () => {
    const to = mainTo.trim().toLowerCase()
    // CC = everyone who needs access, minus the main recipient (no dupes).
    const cc = recipients.filter((e: string) => e.toLowerCase() !== to)
    if (!to && !cc.length) return
    // If there's no explicit main recipient, promote the first CC to "To".
    const primary = to || cc.shift()
    setSending(true)
    let sent = false
    try {
      const result = await sendEmail({ to: primary, cc: cc.length ? cc : undefined, subject, body: renderBody(), isHtml: true })
      sent = !!result.success
    } catch { sent = false }

    if (sent) {
      try {
        await updateRequest.mutateAsync({
          id: req.id,
          updates: {
            announcement_sent_at: new Date().toISOString(),
            announcement_sent_count: (req.announcement_sent_count || 0) + 1,
          },
        })
      } catch (e) {
        console.warn('[mailbox announcement] could not mark as sent', e)
      }
    }

    setSending(false)
    if (sent) {
      showToast(t('admin.mailboxAnnouncement.accessSentToast', { count: 1 + cc.length }))
      onSent?.()
      onClose?.()
    } else {
      showToast(t('admin.mailboxAnnouncement.accessSendFailed'), 'error')
    }
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500/5 via-primary/5 to-cyan-500/5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{t('admin.mailboxAnnouncement.accessEmailTitle')}</h3>
              <p className="text-[10px] text-muted-foreground">{t('admin.mailboxAnnouncement.accessEmailDesc')}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* ── Left: form ── */}
          <div className="p-5 space-y-4 md:border-r border-border/50">
            {/* Main recipient (requester) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="h-3 w-3 text-primary" />
                {t('admin.mailboxAnnouncement.mainRecipientLabel')}
              </Label>
              <input
                type="email"
                value={mainTo}
                onChange={(e: any) => setMainTo(e.target.value)}
                placeholder={t('admin.mailboxAnnouncement.mainRecipientPlaceholder')}
                className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
              />
              <p className="text-[10px] text-muted-foreground">{t('admin.mailboxAnnouncement.mainRecipientHint')}</p>
            </div>

            {/* CC — people who need access */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3 w-3 text-primary" />
                {t('admin.mailboxAnnouncement.ccLabel')}
              </Label>
              <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                {recipients.map((tag: any, idx: any) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium">
                    {tag}
                    <button type="button" onClick={() => removeRecipient(idx)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <input
                  type="email"
                  value={inputValue}
                  onChange={(e: any) => setInputValue(e.target.value)}
                  onKeyDown={(e: any) => { if (['Enter', ',', 'Tab'].includes(e.key)) { e.preventDefault(); addRecipient(inputValue) } }}
                  onBlur={() => { if (inputValue.trim()) addRecipient(inputValue) }}
                  placeholder="prenom@vo-group.be"
                  className="flex-1 min-w-[150px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{t('admin.mailboxAnnouncement.ccHint')}</p>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.mailboxAnnouncement.subjectLabel')}</Label>
              <Input value={subject} onChange={(e: any) => setSubject(e.target.value)} className="bg-muted/30" />
            </div>

            {/* Intro line */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('admin.mailboxAnnouncement.accessIntroLabel')}</Label>
              <Textarea value={intro} onChange={(e: any) => setIntro(e.target.value)} rows={3} className="text-sm bg-muted/30 resize-y" />
              <p className="text-[10px] text-muted-foreground">{t('admin.mailboxAnnouncement.accessGreetingNote')}</p>
            </div>

            {/* 1Password link → renders a button block when filled */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <KeyRound className="h-3 w-3 text-primary" />
                {t('admin.mailboxAnnouncement.onepasswordLinkLabel')}
              </Label>
              <Input
                value={onepasswordLink}
                onChange={(e: any) => setOnepasswordLink(e.target.value)}
                placeholder={t('admin.mailboxAnnouncement.onepasswordPlaceholder')}
                className="bg-muted/30"
              />
              <p className="text-[10px] text-muted-foreground">{t('admin.mailboxAnnouncement.accessOnepasswordNote')}</p>
            </div>

            {/* Windows block toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <span aria-hidden>🪟</span> {t('admin.mailboxAnnouncement.accessWindowsToggle')}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={includeWindows}
                onClick={() => setIncludeWindows((v: boolean) => !v)}
                className={cn('relative h-5 w-9 rounded-full transition-colors', includeWindows ? 'bg-primary' : 'bg-muted-foreground/30')}
              >
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', includeWindows ? 'translate-x-4' : 'translate-x-0.5')} />
              </button>
            </div>
          </div>

          {/* ── Right: live preview ── */}
          <div className="p-5 space-y-2 bg-muted/10">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-3 w-3 text-primary" /> {t('admin.mailboxAnnouncement.previewLabel')}
            </Label>
            <div className="rounded-lg border border-border/50 overflow-hidden bg-white">
              <iframe title={t('admin.mailboxAnnouncement.previewLabel')} srcDoc={previewHtml} className="w-full h-[560px] border-0" sandbox="" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-muted/20 border-t border-border/50 flex items-center gap-3">
          <div className="flex-1" />
          {onClose && <Button variant="outline" onClick={onClose} className="text-xs" disabled={sending}>{t('admin.mailboxAnnouncement.cancel')}</Button>}
          {(() => {
            const total = (mainTo.trim() ? 1 : 0) + recipients.filter((e: string) => e.toLowerCase() !== mainTo.trim().toLowerCase()).length
            return (
              <Button onClick={handleSend} disabled={sending || total === 0} className="gap-2 text-xs min-w-[140px]">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {sending ? t('admin.mailboxAnnouncement.accessSendingButton') : t('admin.mailboxAnnouncement.accessSendButton', { count: total })}
              </Button>
            )
          })()}
        </div>
      </CardContent>
    </Card>
  )
}
