import { useState, useMemo } from 'react'
import { useMailboxRequests, useUpdateMailboxRequest, useDeleteMailboxRequest } from '@/hooks/use-mailbox-requests'
import { useAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml, escapeHtml } from '@/lib/email-html'
import {
  Search, Mail, Trash2, Eye, Calendar, Building2,
  CheckCircle, XCircle, Send, Loader2, KeyRound, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

const STATUS_COLORS = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  completed: 'bg-primary/15 text-primary border-primary/30',
  cancelled: 'bg-gray-500/15 text-gray-600 border-gray-500/30',
}

// ── Parse CC emails from "who_needs_access" text ──
function extractEmails(text) {
  if (!text) return []
  const matches = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g)
  return matches || []
}

export function AdminMailboxRequestsPage() {
  const { data: requests = [], isLoading } = useMailboxRequests()
  const updateRequest = useUpdateMailboxRequest()
  const deleteRequest = useDeleteMailboxRequest()
  const { data: settings } = useAppSettings()
  const showToast = useUIStore((s) => s.showToast)
  const [search, setSearch] = useState('')
  const [detailRequest, setDetailRequest] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [emailDialog, setEmailDialog] = useState(null)
  const [emailForm, setEmailForm] = useState({ to: '', cc: '', subject: '', body: '', onepassword_link: '' })
  const [sending, setSending] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter(
      (r) =>
        r.project_name?.toLowerCase().includes(q) ||
        r.email_to_create?.toLowerCase().includes(q) ||
        r.agency?.toLowerCase().includes(q) ||
        r.requested_by_name?.toLowerCase().includes(q)
    )
  }, [requests, search])

  // ── Status change ──
  const handleStatusChange = async (req, newStatus) => {
    try {
      await updateRequest.mutateAsync({ id: req.id, updates: { status: newStatus } })
      showToast(`Request ${newStatus}`)
      setDetailRequest((prev) => prev ? { ...prev, status: newStatus } : null)
    } catch (err) {
      showToast(err.message || 'Update failed', 'error')
    }
  }

  // ── Open email dialog for confirmation email ──
  const handleOpenEmail = (req) => {
    const ccEmails = extractEmails(req.who_needs_access)
    const appName = settings?.app_name || 'VO Gear Hub'

    setEmailForm({
      to: req.email_to_create || '',
      cc: ccEmails.join(', '),
      subject: `${appName} — Your functional mailbox has been created`,
      body: `Dear ${req.requested_by_name || 'User'},\n\nYour functional mailbox has been created successfully.\n\nMailbox: ${req.email_to_create}\nProject: ${req.project_name}\nDisplay Name: ${req.display_name || '—'}\n\n{{onepassword_section}}\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\nThe ${appName} Team`,
      onepassword_link: req.onepassword_link || '',
    })
    setEmailDialog(req)
  }

  // ── Send confirmation email ──
  const handleSendEmail = async () => {
    if (!emailDialog) return
    setSending(true)

    try {
      const appName = settings?.app_name || 'VO Gear Hub'
      const logoUrl = settings?.logo_url || ''
      const tagline = settings?.tagline || ''
      const logoHeight = settings?.email_logo_height || 0

      // Replace 1Password placeholder
      let body = emailForm.body
      if (emailForm.onepassword_link) {
        body = body.replace(
          '{{onepassword_section}}',
          `Your password has been securely shared via 1Password:\n${emailForm.onepassword_link}`
        )
      } else {
        body = body.replace('{{onepassword_section}}', '')
      }

      const htmlBody = wrapEmailHtml(body, { appName, logoUrl, tagline, logoHeight })

      const result = await sendEmail({
        to: emailForm.to,
        cc: emailForm.cc ? emailForm.cc.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
        subject: emailForm.subject,
        body: htmlBody,
        isHtml: true,
      })

      if (result.success) {
        // Mark as sent + save 1Password link
        await updateRequest.mutateAsync({
          id: emailDialog.id,
          updates: {
            confirmation_email_sent: true,
            onepassword_link: emailForm.onepassword_link || null,
            status: 'completed',
          },
        })
        showToast('Confirmation email sent!')
        setEmailDialog(null)
        setDetailRequest(null)
      } else {
        showToast(result.error || 'Failed to send email', 'error')
      }
    } catch (err) {
      showToast(err.message || 'Failed to send email', 'error')
    } finally {
      setSending(false)
    }
  }

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteRequest.mutateAsync(deleteConfirm.id)
      showToast('Request deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setDeleteConfirm(null)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader title="Mailbox Requests" description={`${requests.length} submission${requests.length !== 1 ? 's' : ''}`} />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by project, email, agency..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No mailbox requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id} variant="elevated" className="hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-violet-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {req.project_name}
                      </span>
                      {req.agency && (
                        <Badge variant="secondary" className="text-[10px]">{req.agency}</Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[req.status] || ''}`}>
                        {req.status}
                      </Badge>
                      {req.confirmation_email_sent && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                          Email sent
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {req.email_to_create && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {req.email_to_create}
                        </span>
                      )}
                      {req.creation_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(req.creation_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                    {req.requested_by_name && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Requested by {req.requested_by_name} &middot; {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailRequest(req)}
                      className="gap-1.5 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    {!req.confirmation_email_sent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEmail(req)}
                        className="gap-1.5 text-xs"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Send Email</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(req)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Detail dialog ── */}
      <Dialog open={!!detailRequest} onOpenChange={() => setDetailRequest(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Mailbox Request — {detailRequest?.project_name}
            </DialogTitle>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-3">
              {[
                ['Project Name', detailRequest.project_name],
                ['Project Leader', detailRequest.project_leader],
                ['Agency', detailRequest.agency],
                ['Email to Create', detailRequest.email_to_create],
                ['Who Needs Access', detailRequest.who_needs_access],
                ['Creation Date', detailRequest.creation_date ? new Date(detailRequest.creation_date).toLocaleDateString('fr-FR') : null],
                ['Display Name', detailRequest.display_name],
                ['Signature Title', detailRequest.signature_title],
                ['Links', detailRequest.links],
                ['More Info', detailRequest.more_info],
                ['Deleted/Archived', detailRequest.deleted_archived],
                ['Status', detailRequest.status],
                ['Requested By', detailRequest.requested_by_name],
                ['Requester Email', detailRequest.requester_email],
                ['Submitted', new Date(detailRequest.created_at).toLocaleString('fr-FR')],
                ['1Password Link', detailRequest.onepassword_link],
              ].map(([label, value]) => value ? (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <span className="font-semibold text-muted-foreground w-36 shrink-0">{label}</span>
                  <span className="break-all">{value}</span>
                </div>
              ) : null)}
              {detailRequest.banner_url && (
                <div className="flex items-start gap-3 text-sm">
                  <span className="font-semibold text-muted-foreground w-36 shrink-0">Banner</span>
                  <img src={detailRequest.banner_url} alt="Banner" className="h-16 rounded border object-contain" />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDetailRequest(null)}>Close</Button>
            {detailRequest?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(detailRequest, 'rejected')}
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusChange(detailRequest, 'approved')}
                  className="gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {detailRequest && !detailRequest.confirmation_email_sent && (
              <Button
                variant="outline"
                onClick={() => { setDetailRequest(null); handleOpenEmail(detailRequest) }}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                Send Confirmation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Email composition dialog ── */}
      <Dialog open={!!emailDialog} onOpenChange={() => setEmailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Confirmation Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                value={emailForm.to}
                onChange={(e) => setEmailForm((p) => ({ ...p, to: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CC (auto-filled from &quot;Who Needs Access&quot;)</Label>
              <Input
                value={emailForm.cc}
                onChange={(e) => setEmailForm((p) => ({ ...p, cc: e.target.value }))}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                value={emailForm.subject}
                onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                1Password Link
              </Label>
              <Input
                value={emailForm.onepassword_link}
                onChange={(e) => setEmailForm((p) => ({ ...p, onepassword_link: e.target.value }))}
                placeholder="https://start.1password.com/..."
              />
              <p className="text-[10px] text-muted-foreground">
                Paste the 1Password share link for the mailbox password
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Email Body</Label>
              <Textarea
                value={emailForm.body}
                onChange={(e) => setEmailForm((p) => ({ ...p, body: e.target.value }))}
                rows={10}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Use {'{{onepassword_section}}'} to insert the 1Password link section
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog(null)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={sending || !emailForm.to} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mailbox Request?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the mailbox request for{' '}
            <strong>{deleteConfirm?.project_name}</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
