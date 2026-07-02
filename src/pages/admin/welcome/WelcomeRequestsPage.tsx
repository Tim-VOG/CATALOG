import { useState, useMemo } from 'react'
import { useItRequests } from '@/hooks/use-it-requests'
import { useCreateRecipient, useUpdateRecipient, useOnboardingRecipients, useOnboardingEmails } from '@/hooks/use-onboarding'
import { useUIStore } from '@/stores/ui-store'
import {
  Search, Mail, ArrowLeft, Send, AtSign, CheckCircle, Briefcase, Calendar, Building2, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { WelcomeComposer } from './WelcomeComposer'

const formatDate = (d: any) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

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

export function WelcomeRequestsPage() {
  const { data: allRequests = [], isLoading } = useItRequests()
  const { data: recipients = [] } = useOnboardingRecipients()
  const { data: emails = [] } = useOnboardingEmails()
  const createRecipient = useCreateRecipient()
  const updateRecipient = useUpdateRecipient()
  const showToast = useUIStore((s: any) => s.showToast)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todo') // todo | sent
  const [selectedId, setSelectedId] = useState<any>(null)
  const [personalEmail, setPersonalEmail] = useState('')
  const [recipientForCompose, setRecipientForCompose] = useState<any>(null)
  const [preparing, setPreparing] = useState(false)

  const onboardingRequests = useMemo(
    () => allRequests.filter((r: any) => r.type === 'onboarding'),
    [allRequests]
  )

  const sentByRequestId = useMemo(() => {
    const map: Record<string, any> = {}
    for (const e of emails) {
      if (e.it_request_id && e.status === 'sent') map[e.it_request_id] = e
    }
    return map
  }, [emails])

  const filtered = useMemo(() => {
    let result = onboardingRequests
    result = filter === 'sent'
      ? result.filter((r: any) => sentByRequestId[r.id])
      : result.filter((r: any) => !sentByRequestId[r.id])
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((r: any) => {
        const data = r.data || {}
        const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ')
        return (name || '').toLowerCase().includes(q) ||
          (data.company || '').toLowerCase().includes(q)
      })
    }
    return result
  }, [onboardingRequests, sentByRequestId, filter, search])

  const todoCount = onboardingRequests.filter((r: any) => !sentByRequestId[r.id]).length
  const sentCount = onboardingRequests.filter((r: any) => sentByRequestId[r.id]).length

  const selectedRequest = useMemo(
    () => onboardingRequests.find((r: any) => r.id === selectedId),
    [onboardingRequests, selectedId]
  )

  const handleStartCompose = async () => {
    if (!selectedRequest) return
    const trimmed = personalEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast('Please enter a valid personal email', 'error')
      return
    }
    setPreparing(true)
    try {
      const payload = requestToRecipient(selectedRequest, trimmed)
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

  const handleBack = () => {
    setSelectedId(null)
    setPersonalEmail('')
    setRecipientForCompose(null)
  }

  if (isLoading) return <PageLoading />

  // ── Detail view ───────────────────────────────────────────────
  if (selectedRequest) {
    const data = selectedRequest.data || {}
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown'
    const corporateEmail = data.email_local && data.email_domain
      ? `${data.email_local}@${data.email_domain}`
      : data.email_to_create || '—'
    const sentEmail = sentByRequestId[selectedRequest.id]
    const showComposer = !!recipientForCompose && !sentEmail

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold">{fullName}</h2>
            <p className="text-xs text-muted-foreground">Compose welcome email</p>
          </div>
        </div>

        {/* Recap card */}
        <Card variant="elevated">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base">{fullName}</h3>
                <p className="text-xs text-muted-foreground">{corporateEmail}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Row icon={Briefcase} label="Profile" value={data.profile} />
              <Row icon={Building2} label="Company" value={data.company} />
              <Row icon={Briefcase} label="Job title" value={data.job_title} />
              <Row icon={Calendar} label="First day" value={formatDate(data.first_day)} />
            </div>
          </CardContent>
        </Card>

        {sentEmail ? (
          <Card variant="elevated" className="border-emerald-500/30">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm text-muted-foreground flex-1">
                Welcome email was sent on <strong className="text-foreground">{formatDate(sentEmail.sent_at)}</strong>
              </span>
            </CardContent>
          </Card>
        ) : showComposer ? (
          <WelcomeComposer
            recipient={recipientForCompose}
            requestId={selectedRequest.id}
            onSent={handleBack}
            onClose={() => setRecipientForCompose(null)}
          />
        ) : (
          <Card variant="elevated">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <AtSign className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">Personal email</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enter the personal email collected from HR (PERSONAL INFORMATION form). The welcome will go there.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personal-email" className="text-xs">
                  Personal email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="personal-email"
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
        )}
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Welcome"
        description={`${todoCount} pending · ${sentCount} sent`}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={filter === 'todo' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('todo')}>
          To welcome
          {todoCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">
              {todoCount}
            </span>
          )}
        </Button>
        <Button variant={filter === 'sent' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('sent')}>
          Sent
        </Button>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 h-9" value={search} onChange={(e: any) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={filter === 'todo' ? 'Nobody to welcome right now' : 'No welcome emails sent yet'}
          description={filter === 'todo'
            ? 'New onboarding requests will appear here once submitted.'
            : 'Sent welcome emails will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req: any) => {
            const data = req.data || {}
            const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || 'Unknown'
            const company = data.company || data.business_unit || ''
            const firstDay = data.first_day || ''
            const sentEmail = sentByRequestId[req.id]
            return (
              <Card
                key={req.id}
                variant="elevated"
                className="hover:shadow-card-hover transition-shadow cursor-pointer"
                onClick={() => setSelectedId(req.id)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{name}</span>
                        {company && <Badge variant="secondary" className="text-[10px]">{company}</Badge>}
                        {sentEmail && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                            <CheckCircle className="h-2.5 w-2.5" /> Sent {formatDate(sentEmail.sent_at)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {firstDay && <span>Starts {formatDate(firstDay)}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant={sentEmail ? 'ghost' : 'default'} className="gap-1.5 text-xs h-8" onClick={(e: any) => { e.stopPropagation(); setSelectedId(req.id) }}>
                      {sentEmail ? 'View' : 'Compose'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Row({ icon: Icon, label, value  }: any) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-all">{value}</div>
      </div>
    </div>
  )
}
