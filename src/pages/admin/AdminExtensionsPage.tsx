import { useState } from 'react'
import { CalendarClock, Check, X, Clock } from 'lucide-react'
import {
  useExtensionRequests,
  useReviewExtensionRequest,
} from '@/hooks/use-extension-requests'
import type { ExtensionRequest } from '@/lib/api/extension-requests'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { generateExtensionEmailDraft } from '@/lib/email-draft'
import { getEmailBranding } from '@/lib/email-html'

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600',
  approved: 'bg-emerald-500/15 text-emerald-600',
  rejected: 'bg-red-500/15 text-red-600',
}

export function AdminExtensionsPage() {
  const { data: extensions = [], isLoading } = useExtensionRequests()
  const review = useReviewExtensionRequest()
  const { user } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [dialog, setDialog] = useState<{ ext: ExtensionRequest; decision: 'approved' | 'rejected' } | null>(null)
  const [grantedDays, setGrantedDays] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const openDecision = (ext: ExtensionRequest, decision: 'approved' | 'rejected') => {
    setDialog({ ext, decision })
    setGrantedDays(String(ext.requested_days))
    setAdminNotes('')
  }

  const sendDecisionEmail = async (ext: ExtensionRequest, decision: 'approved' | 'rejected', granted: number | null) => {
    if (!ext.user_email) return
    try {
      const branding = await getEmailBranding()
      const draft = generateExtensionEmailDraft({
        template: null,
        extension: {
          ...ext,
          status: decision,
          granted_days: granted,
          admin_notes: adminNotes,
        },
        request: {
          project_name: ext.project_name,
          return_date: ext.return_date,
          user_email: ext.user_email,
        },
        appName: branding.appName,
        logoUrl: branding.logoUrl,
        tagline: branding.tagline,
        logoHeight: branding.logoHeight,
      })
      await sendEmail({ to: ext.user_email, subject: draft.subject, body: draft.body, isHtml: true })
    } catch (err) {
      console.warn('[extensions] decision email failed', err)
    }
  }

  const confirmDecision = async () => {
    if (!dialog || !user) return
    const { ext, decision } = dialog
    const granted = decision === 'approved' ? Number.parseInt(grantedDays, 10) || ext.requested_days : null
    try {
      await review.mutateAsync({
        id: ext.id,
        status: decision,
        granted_days: granted,
        admin_notes: adminNotes || null,
        reviewed_by: user.id,
        currentReturnDate: ext.return_date,
      })
      showToast(decision === 'approved' ? 'Extension approved' : 'Extension rejected')
      sendDecisionEmail(ext, decision, granted)
      setDialog(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error')
    }
  }

  if (isLoading) return <PageLoading />

  const pending = extensions.filter((e) => e.status === 'pending')
  const reviewed = extensions.filter((e) => e.status !== 'pending')

  const renderCard = (ext: ExtensionRequest) => {
    const name = [ext.user_first_name, ext.user_last_name].filter(Boolean).join(' ') || ext.user_email || 'User'
    return (
      <div key={ext.id} className="flex items-start gap-3 p-4 rounded-lg border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{name}</span>
            <Badge className={`text-[10px] ${STATUS_STYLE[ext.status] || ''}`}>{ext.status}</Badge>
            <span className="text-xs text-muted-foreground">
              wants <strong>+{ext.requested_days} days</strong>
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {ext.project_name || 'Loan'} · current return {formatDate(ext.return_date)}
          </div>
          {ext.reason && <div className="text-xs mt-1.5 text-foreground/80">“{ext.reason}”</div>}
          {ext.status === 'approved' && ext.granted_days != null && (
            <div className="text-[11px] text-emerald-600 mt-1">Granted {ext.granted_days} days</div>
          )}
          {ext.admin_notes && <div className="text-[11px] text-muted-foreground mt-1">Note: {ext.admin_notes}</div>}
        </div>
        {ext.status === 'pending' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" className="gap-1 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={() => openDecision(ext, 'approved')}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive" onClick={() => openDecision(ext, 'rejected')}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Loan Extensions"
        description="Review requests to keep borrowed equipment a bit longer."
      />

      <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm w-fit">
        <Clock className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-semibold">{pending.length}</span>
        <span className="text-muted-foreground">pending</span>
      </div>

      {extensions.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No extension requests" description="Requests to extend a loan will show up here." />
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">Pending</h3>
                {pending.map(renderCard)}
              </CardContent>
            </Card>
          )}
          {reviewed.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground mb-1">Reviewed</h3>
                {reviewed.map(renderCard)}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o: any) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.decision === 'approved' ? 'Approve extension' : 'Reject extension'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dialog?.decision === 'approved' && (
              <div className="space-y-1">
                <Label>Days granted</Label>
                <Input type="number" value={grantedDays} onChange={(e) => setGrantedDays(e.target.value)} />
                <p className="text-[10px] text-muted-foreground">
                  The loan's return date will be pushed out by this many days.
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Note to the user (optional)</Label>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} placeholder="Optional message included in the email…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={confirmDecision} disabled={review.isPending}>
              {dialog?.decision === 'approved' ? 'Approve & extend' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
