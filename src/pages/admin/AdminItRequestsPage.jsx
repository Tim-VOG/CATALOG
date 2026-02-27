import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useItRequests, useDeleteItRequest } from '@/hooks/use-it-requests'
import { createOnboardingRecipient } from '@/lib/api/onboarding'
import { useUIStore } from '@/stores/ui-store'
import {
  Search, ClipboardList, UserPlus, Trash2, Eye, Calendar,
  Monitor, MonitorOff, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export function AdminItRequestsPage() {
  const { data: requests = [], isLoading } = useItRequests()
  const deleteRequest = useDeleteItRequest()
  const showToast = useUIStore((s) => s.showToast)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [detailRequest, setDetailRequest] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter(
      (r) =>
        r.first_name?.toLowerCase().includes(q) ||
        r.last_name?.toLowerCase().includes(q) ||
        r.business_unit?.toLowerCase().includes(q) ||
        r.requested_by_name?.toLowerCase().includes(q)
    )
  }, [requests, search])

  const handleCreateOnboarding = async (req) => {
    try {
      const recipient = await createOnboardingRecipient({
        first_name: req.first_name,
        last_name: req.last_name,
        email: req.generated_email || '',
        team: req.business_unit || '',
        department: req.status || '',
        start_date: req.start_date || null,
        language: 'fr',
        personal_email: req.personal_email || '',
      })
      showToast('Onboarding recipient created!')
      navigate(`/admin/onboarding/compose?recipientId=${recipient.id}`)
    } catch (err) {
      showToast(err.message || 'Failed to create recipient', 'error')
    }
  }

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
      <AdminPageHeader title="IT Requests" description={`${requests.length} submission${requests.length !== 1 ? 's' : ''}`} />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, unit..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No IT requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Card key={req.id} variant="elevated" className="hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-amber-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {req.first_name} {req.last_name}
                      </span>
                      {req.status && (
                        <Badge variant="outline" className="text-[10px]">{req.status}</Badge>
                      )}
                      {req.business_unit && (
                        <Badge variant="secondary" className="text-[10px]">{req.business_unit}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {req.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(req.start_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {req.needs_computer ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Monitor className="h-3 w-3" /> Computer needed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MonitorOff className="h-3 w-3" /> No computer
                        </span>
                      )}
                      {req.access_needs?.length > 0 && (
                        <span>{req.access_needs.length} access{req.access_needs.length > 1 ? 'es' : ''}</span>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateOnboarding(req)}
                      className="gap-1.5 text-xs"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Onboarding</span>
                    </Button>
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

      {/* Detail dialog */}
      <Dialog open={!!detailRequest} onOpenChange={() => setDetailRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              IT Request — {detailRequest?.first_name} {detailRequest?.last_name}
            </DialogTitle>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-3">
              {[
                ['Status', detailRequest.status],
                ['Business Unit', detailRequest.business_unit],
                ['Corporate Email', detailRequest.generated_email],
                ['Personal Email', detailRequest.personal_email],
                ['Signature Title', detailRequest.signature_title],
                ['Starting Date', detailRequest.start_date ? new Date(detailRequest.start_date).toLocaleDateString('fr-FR') : null],
                ['Leaving Date', detailRequest.leaving_date ? new Date(detailRequest.leaving_date).toLocaleDateString('fr-FR') : null],
                ['Computer', detailRequest.needs_computer ? 'Yes' : 'No'],
                ['Access Needed', detailRequest.access_needs?.join(', ')],
                ['SharePoint URL', detailRequest.sharepoint_url],
                ['Listing', detailRequest.listing],
                ['Listing Date', detailRequest.listing_date ? new Date(detailRequest.listing_date).toLocaleDateString('fr-FR') : null],
                ['Requested By', detailRequest.requested_by_name],
                ['Submitted', new Date(detailRequest.created_at).toLocaleString('fr-FR')],
              ].map(([label, value]) => value ? (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <span className="font-semibold text-muted-foreground w-32 shrink-0">{label}</span>
                  <span className="break-all">{value}</span>
                </div>
              ) : null)}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRequest(null)}>Close</Button>
            <Button onClick={() => { setDetailRequest(null); handleCreateOnboarding(detailRequest) }} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete IT Request?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the IT request for{' '}
            <strong>{deleteConfirm?.first_name} {deleteConfirm?.last_name}</strong>.
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
