import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useOnboardingEmails, useDeleteEmail } from '@/hooks/use-onboarding'
import { Mail, Trash2, Clock, CheckCircle2, XCircle, FileEdit, Inbox, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { OnboardingTabNav } from './OnboardingRecipientsPage'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: FileEdit, variant: 'outline', color: 'text-muted-foreground' },
  sent: { label: 'Sent', icon: CheckCircle2, variant: 'default', color: 'text-green-500' },
  failed: { label: 'Failed', icon: XCircle, variant: 'destructive', color: 'text-destructive' },
}

export function OnboardingHistoryPage() {
  const { data: emails = [], isLoading } = useOnboardingEmails()
  const deleteEmail = useDeleteEmail()
  const showToast = useUIStore((s) => s.showToast)

  const [filter, setFilter] = useState('all')
  const [previewHtml, setPreviewHtml] = useState(null)

  const handleDelete = async (id) => {
    if (!confirm('Delete this draft?')) return
    try {
      await deleteEmail.mutateAsync(id)
      showToast('Draft deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  const filters = ['all', 'draft', 'sent', 'failed']
  const filtered = filter === 'all' ? emails : emails.filter((e) => e.status === filter)

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Onboarding" description="Email send history" />

      <OnboardingTabNav />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === 'all' ? 'All' : f}
            {f !== 'all' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                {emails.filter((e) => e.status === f).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Emails list */}
      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="No emails" description="No emails match the current filter" />
      ) : (
        <div className="space-y-3">
          {filtered.map((email) => {
            const cfg = STATUS_CONFIG[email.status] || STATUS_CONFIG.draft
            const StatusIcon = cfg.icon
            return (
              <Card key={email.id} className="hover:border-primary/20 hover:shadow-card-hover transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={cn('shrink-0', cfg.color)}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">
                          {email.subject || 'No subject'}
                        </h3>
                        <Badge variant={cfg.variant} className="text-[10px]">
                          {cfg.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {email.language}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {email.recipient_name} ({email.recipient_email})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {email.status === 'sent' ? formatDate(email.sent_at) : formatDate(email.created_at)}
                        </span>
                      </div>
                      {email.error_message && (
                        <p className="text-xs text-destructive mt-1">{email.error_message}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {email.rendered_html && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Preview"
                          onClick={() => setPreviewHtml(email.rendered_html)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {email.status === 'draft' && (
                        <Link to={`/admin/onboarding/compose/${email.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
                            <FileEdit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                      {email.status === 'failed' && (
                        <Link to={`/admin/onboarding/compose/${email.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Retry">
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                      {email.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(email.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <iframe
            srcDoc={previewHtml || ''}
            className="w-full border rounded-lg"
            style={{ height: '70vh' }}
            title="Email preview"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
