import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLoanRequest, useLoanRequestItems, useCancelRequest } from '@/hooks/use-loan-requests'
import { useExtensionsByRequest } from '@/hooks/use-extension-requests'
import { useUIStore } from '@/stores/ui-store'
import { ArrowLeft, Calendar, MapPin, User, Clock, Package, XCircle, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { ExtensionRequestDialog } from '@/components/requests/ExtensionRequestDialog'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function RequestDetailPage() {
  const { requestId } = useParams()
  const requestQuery = useLoanRequest(requestId)
  const { data: items = [] } = useLoanRequestItems(requestId)
  const { data: extensions = [] } = useExtensionsByRequest(requestId)
  const cancelRequest = useCancelRequest()
  const showToast = useUIStore((s) => s.showToast)
  const [showExtension, setShowExtension] = useState(false)

  const request = requestQuery.data

  if (requestQuery.isLoading || requestQuery.isError) {
    return (
      <QueryWrapper
        query={requestQuery}
        skeleton={
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-8 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-6 space-y-3">
                <Skeleton className="h-5 w-20" />
                <SkeletonText lines={4} />
              </div>
              <div className="rounded-lg border bg-card p-6 space-y-3">
                <Skeleton className="h-5 w-20" />
                <SkeletonText lines={3} />
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-24" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-12 w-12 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        }
      />
    )
  }
  if (!request) return <div className="text-center py-16 text-muted-foreground">Request not found</div>

  const handleCancel = async () => {
    if (!confirm('Cancel this request?')) return
    try {
      await cancelRequest.mutateAsync(request.id)
      showToast('Request cancelled')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const canCancel = ['draft', 'pending'].includes(request.status)
  const canExtend = request.status === 'picked_up'
  const hasPendingExtension = extensions.some((e) => e.status === 'pending')

  // Build timeline events
  const timeline = [
    { label: 'Submitted', date: request.created_at, icon: Clock },
    request.approved_at && { label: 'Approved', date: request.approved_at, icon: Clock },
    request.picked_up_at && { label: 'Picked up', date: request.picked_up_at, icon: Package },
    request.returned_at && { label: 'Returned', date: request.returned_at, icon: Package },
    request.closed_at && { label: 'Closed', date: request.closed_at, icon: Clock },
    request.status === 'rejected' && { label: 'Rejected', date: request.updated_at, icon: XCircle },
    request.status === 'cancelled' && { label: 'Cancelled', date: request.updated_at, icon: XCircle },
  ].filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/requests">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Requests
        </Button>
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold">{request.project_name}</h1>
            <StatusBadge status={request.status} />
          </div>
          {request.request_number && (
            <p className="text-sm text-muted-foreground mt-1">Request #{request.request_number}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {canExtend && !hasPendingExtension && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowExtension(true)}>
              <CalendarPlus className="h-4 w-4" /> Request Extension
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={handleCancel}>
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{request.user_first_name} {request.user_last_name}</span>
              <span className="text-muted-foreground">({request.user_email})</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(request.pickup_date)} &rarr; {formatDate(request.return_date)}</span>
            </div>
            {request.location_name && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{request.location_name}</span>
              </div>
            )}
            {request.priority !== 'normal' && (
              <div>
                Priority:{' '}
                <Badge variant={request.priority === 'urgent' ? 'destructive' : request.priority === 'high' ? 'warning' : 'secondary'}>
                  {request.priority}
                </Badge>
              </div>
            )}
            {request.project_description && <p className="text-muted-foreground">{request.project_description}</p>}
            {request.justification && (
              <div>
                <span className="text-muted-foreground">Justification:</span>
                <p>{request.justification}</p>
              </div>
            )}
            {request.rejection_reason && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-destructive">
                <strong>Rejection reason:</strong> {request.rejection_reason}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                      <event.icon className="h-3 w-3" />
                    </div>
                    {i < timeline.length - 1 && <div className="w-px h-4 bg-border" />}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(event.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                <img src={item.product_image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.product_name}</p>
                <div className="flex gap-2">
                  <CategoryBadge name={item.category_name} color={item.category_color} />
                </div>
              </div>
              <span className="text-sm font-medium">&times; {item.quantity}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Extension History */}
      {extensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" /> Extension Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {extensions.map((ext) => (
              <div key={ext.id} className="py-3 first:pt-0 last:pb-0 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">+{ext.requested_days} days requested</span>
                  <Badge
                    variant={ext.status === 'approved' ? 'success' : ext.status === 'rejected' ? 'destructive' : 'outline'}
                  >
                    {ext.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{ext.reason}</p>
                {ext.status === 'approved' && (
                  <p className="text-green-400 text-xs">{ext.granted_days} days granted</p>
                )}
                {ext.admin_notes && (
                  <p className="text-xs text-muted-foreground italic">Admin: {ext.admin_notes}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatDateTime(ext.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {hasPendingExtension && (
        <div className="rounded-md bg-orange-500/10 border border-orange-500/30 p-3 text-sm text-orange-400">
          You have a pending extension request. Please wait for admin review.
        </div>
      )}

      <ExtensionRequestDialog
        open={showExtension}
        onOpenChange={setShowExtension}
        request={request}
      />
    </div>
  )
}
