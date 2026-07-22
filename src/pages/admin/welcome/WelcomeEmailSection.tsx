import { lazy, Suspense, useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AtSign, CheckCircle, Send, Loader2 } from 'lucide-react'
import { useOnboardingRecipients, useCreateRecipient, useUpdateRecipient } from '@/hooks/use-onboarding'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

// Lazy-load the composer: it pulls in the BlockEditor + mjml-browser
// (700 kB+) which only matter once the admin actually clicks "Open
// composer". Keeps the onboarding requests list snappy.
const WelcomeComposer = lazy(() =>
  import('./WelcomeComposer').then((m) => ({ default: m.WelcomeComposer }))
)

function requestToRecipient(req: any, personalEmail: any) {
  const data = req.data || {}
  const email = data.email_local && data.email_domain
    ? `${data.email_local}@${data.email_domain}`
    : data.email_to_create || data.email || ''
  return {
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    email,
    personal_email: (personalEmail || data.personal_email || '').trim().toLowerCase(),
    team: data.business_unit || data.company || '',
    company: data.company || data.business_unit || '',
    department: data.profile || data.job_title || '',
    start_date: data.first_day || null,
    language: (() => {
      const l = String(data.language || 'fr').toLowerCase()
      if (l.startsWith('nl')) return 'nl'
      if (l.startsWith('en')) return 'en'
      return 'fr'
    })(),
    custom_links: [],
  }
}

const formatDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/**
 * Inline welcome email section. Mount it inside an onboarding request detail
 * once the request is ready. Handles the personal-email gate, recipient
 * upsert, then renders the composer.
 */
export function WelcomeEmailSection({ req, sentEmail, onSent  }: any) {
  const { t } = useTranslation()
  const { data: recipients = [] } = useOnboardingRecipients()
  const createRecipient = useCreateRecipient()
  const updateRecipient = useUpdateRecipient()
  const showToast = useUIStore((s: any) => s.showToast)

  const [personalEmail, setPersonalEmail] = useState(() => req?.data?.personal_email || '')
  const [recipientForCompose, setRecipientForCompose] = useState<any>(null)
  const [preparing, setPreparing] = useState(false)
  const [resend, setResend] = useState(false)

  const data = useMemo(() => req?.data || {}, [req])

  // Auto-fill the personal email from the HR-collected data whenever a
  // different request loads and the admin hasn't typed their own value yet.
  useEffect(() => {
    if (data.personal_email) setPersonalEmail((prev: string) => prev || data.personal_email)
  }, [req?.id, data.personal_email])

  if (sentEmail && !resend) {
    return (
      <Card variant="elevated" className="border-emerald-500/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              {t('admin.welcomeEmailSection.sentOnPrefix')} <strong className="text-foreground">{formatDate(sentEmail.sent_at)}</strong>
            </span>
          </div>
          <Button variant="outline" onClick={() => setResend(true)} className="w-full gap-2">
            <Send className="h-4 w-4" /> {t('admin.welcomeEmailSection.resendButton')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (recipientForCompose) {
    return (
      <Suspense fallback={
        <Card variant="elevated">
          <CardContent className="p-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('admin.welcomeEmailSection.loadingComposer')}</span>
          </CardContent>
        </Card>
      }>
        <WelcomeComposer
          recipient={recipientForCompose}
          requestId={req.id}
          onSent={() => { setRecipientForCompose(null); setResend(false); onSent?.() }}
          onClose={() => { setRecipientForCompose(null); setResend(false) }}
        />
      </Suspense>
    )
  }

  const handleStartCompose = async () => {
    const trimmed = personalEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast(t('admin.welcomeEmailSection.invalidEmailToast'), 'error')
      return
    }
    setPreparing(true)
    try {
      const payload = requestToRecipient(req, trimmed)
      let recipient = recipients.find(
        (r) => payload.email && r.email?.toLowerCase() === payload.email.toLowerCase()
      )
      if (!recipient) {
        recipient = await createRecipient.mutateAsync(payload)
      } else {
        const updates: Record<string, any> = {}
        for (const key of ['first_name', 'last_name', 'email', 'personal_email', 'team', 'department', 'start_date', 'language']) {
          if ((payload as any)[key] && (payload as any)[key] !== (recipient as any)[key]) (updates as any)[key] = (payload as any)[key]
        }
        if (Object.keys(updates).length > 0) {
          const updated = await updateRecipient.mutateAsync({ id: recipient.id, ...updates })
          recipient = updated || { ...recipient, ...updates }
        }
      }
      setRecipientForCompose(recipient)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setPreparing(false)
    }
  }

  return (
    <Card variant="elevated" className="border-primary/30">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <AtSign className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">
              {resend ? t('admin.welcomeEmailSection.resendTitle') : t('admin.welcomeEmailSection.title')}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {resend ? t('admin.welcomeEmailSection.resendDescription') : t('admin.welcomeEmailSection.description')}
            </p>
          </div>
          {resend && (
            <Button variant="ghost" size="sm" onClick={() => setResend(false)} className="text-xs shrink-0">
              {t('admin.welcomeEmailSection.cancelResend')}
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`personal-email-${req.id}`} className="text-xs">
            {t('admin.welcomeEmailSection.personalEmailLabel')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`personal-email-${req.id}`}
            type="email"
            value={personalEmail}
            onChange={(e: any) => setPersonalEmail(e.target.value)}
            placeholder={`${data.first_name?.toLowerCase() || 'jdoe'}@gmail.com`}
            autoFocus
          />
        </div>
        <Button
          onClick={handleStartCompose}
          disabled={preparing || !personalEmail.trim()}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {preparing ? t('admin.welcomeEmailSection.preparing') : t('admin.welcomeEmailSection.openComposer')}
        </Button>
      </CardContent>
    </Card>
  )
}
