import { lazy, Suspense, useState, useMemo } from 'react'
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
    department: data.profile || data.job_title || '',
    start_date: data.first_day || null,
    language: (data.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en',
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
  const { data: recipients = [] } = useOnboardingRecipients()
  const createRecipient = useCreateRecipient()
  const updateRecipient = useUpdateRecipient()
  const showToast = useUIStore((s) => s.showToast)

  const [personalEmail, setPersonalEmail] = useState('')
  const [recipientForCompose, setRecipientForCompose] = useState<any>(null)
  const [preparing, setPreparing] = useState(false)

  const data = useMemo(() => req?.data || {}, [req])

  if (sentEmail) {
    return (
      <Card variant="elevated" className="border-emerald-500/30">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">
            Welcome email was sent on <strong className="text-foreground">{formatDate(sentEmail.sent_at)}</strong>
          </span>
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
            <span className="text-sm">Loading composer…</span>
          </CardContent>
        </Card>
      }>
        <WelcomeComposer
          recipient={recipientForCompose}
          requestId={req.id}
          onSent={() => { setRecipientForCompose(null); onSent?.() }}
          onClose={() => setRecipientForCompose(null)}
        />
      </Suspense>
    )
  }

  const handleStartCompose = async () => {
    const trimmed = personalEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast('Please enter a valid personal email', 'error')
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
          if (payload[key] && payload[key] !== recipient[key]) updates[key] = payload[key]
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
            <h4 className="font-semibold text-sm">Send the welcome email</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter the personal email collected from HR (PERSONAL INFORMATION form). The welcome will go there.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`personal-email-${req.id}`} className="text-xs">
            Personal email <span className="text-red-500">*</span>
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
          {preparing ? 'Preparing...' : 'Open composer'}
        </Button>
      </CardContent>
    </Card>
  )
}
