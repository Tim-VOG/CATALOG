import { Link, useParams } from 'react-router-dom'
import { useLoanRequest, useLoanRequestItems, useUpdateRequestStatus } from '@/hooks/use-loan-requests'
import { useExtensionsByRequest } from '@/hooks/use-extension-requests'
import { useAppSettings } from '@/hooks/use-settings'
import { useAssignEquipmentBatch } from '@/hooks/use-user-equipment'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { useState } from 'react'
import { sendStatusChangeEmail, buildTimeline, formatDate, formatDateTime } from '@/services/request-status-service'
import { decrementStockForRequest, incrementStockForRequest } from '@/lib/api/products'
import {
  ArrowLeft, Calendar, MapPin, User, Clock, Package, Mail,
  Check, X, ShieldCheck, Undo2, CalendarPlus,
} from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { AnimatedTimeline } from '@/components/common/AnimatedTimeline'
import { ReturnProcessDialog } from '@/components/admin/ReturnProcessDialog'

// formatDate and formatDateTime imported from request-status-service

export function AdminRequestDetailPage() {
  const { requestId } = useParams()
  const { data: request, isLoading } = useLoanRequest(requestId)
  const { data: items = [] } = useLoanRequestItems(requestId)
  const { data: extensions = [] } = useExtensionsByRequest(requestId)
  const { data: settings } = useAppSettings()
  const updateStatus = useUpdateRequestStatus()
  const assignBatch = useAssignEquipmentBatch()
  const { user } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [showReturn, setShowReturn] = useState(false)

  if (isLoading) return <PageLoading />
  if (!request) return <div className="text-center py-16 text-muted-foreground">Request not found</div>

  // CC emails stored on the request
  const ccEmails = request.custom_fields?.cc_emails || []

  const handleStatusUpdate = async (status, extraData = {}) => {
    try {
      await updateStatus.mutateAsync({ id: request.id, status, ...extraData })
      showToast(`Request ${status}`)

      // Stock management: decrement when processing starts
      if (status === 'in_progress') {
        decrementStockForRequest(request.id).catch(() => {})
      }

      // Auto-assign equipment to user when request is ready
      if (status === 'ready' && items.length > 0) {
        const assignments = items.map((item) => ({
          user_id: request.user_id,
          user_email: request.user_email || '',
          user_name: `${request.user_first_name || ''} ${request.user_last_name || ''}`.trim(),
          product_id: item.product_id,
          product_name: item.product_name || '',
          product_image: item.product_image || '',
          category_name: item.category_name || '',
          assigned_date: request.pickup_date || new Date().toISOString().split('T')[0],
          expected_return_date: request.return_date || null,
          source_type: 'request',
          source_id: request.id,
          includes: item.product_includes || [],
          assigned_by: user?.id,
          notes: `Auto-assigned from request #${request.request_number}`,
        }))
        assignBatch.mutateAsync(assignments).catch(() => {
          // Silent fail — assignment is best-effort
        })
      }

      // Auto-send emails for specific status changes (fire & forget)
      sendStatusChangeEmail(status, { request, items, settings })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // handleReject removed — no more approve/reject workflow

  const timeline = buildTimeline(request)

  return (
    <div className="space-y-6">
      <Link to="/admin/requests">
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
          <p className="text-sm text-muted-foreground mt-1">
            Request #{request.request_number} by {request.user_first_name} {request.user_last_name}
          </p>
        </div>

        {/* Action buttons — simplified: Start / Mark Ready */}
        <div className="flex gap-2 shrink-0">
          {request.status === 'pending' && (
            <Button className="gap-2" onClick={() => handleStatusUpdate('in_progress')}>
              <Package className="h-4 w-4" /> Start Processing
            </Button>
          )}
          {request.status === 'in_progress' && (
            <Button variant="success" className="gap-2" onClick={() => handleStatusUpdate('ready')}>
              <Check className="h-4 w-4" /> Mark Ready
            </Button>
          )}
          {request.status === 'ready' && (
            <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
              <Check className="h-4 w-4" /> Completed
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <UserAvatar
                avatarUrl={request.user_avatar_url}
                firstName={request.user_first_name}
                lastName={request.user_last_name}
                email={request.user_email}
                size="sm"
              />
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
            {request.justification && <p className="italic">&ldquo;{request.justification}&rdquo;</p>}
            {request.rejection_reason && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-destructive text-sm">
                <strong>Rejection reason:</strong> {request.rejection_reason}
              </div>
            )}
            {ccEmails.length > 0 && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">CC:</span>{' '}
                  {ccEmails.map((email, i) => (
                    <Badge key={i} variant="secondary" className="font-normal mr-1 mb-1">{email}</Badge>
                  ))}
                </div>
              </div>
            )}
            {request.custom_fields && Object.entries(request.custom_fields).filter(([k]) => k !== 'cc_emails').length > 0 && (
              <div className="border-t pt-3 mt-3 space-y-2">
                <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Additional Information</p>
                {Object.entries(request.custom_fields).filter(([k]) => k !== 'cc_emails').map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-right font-medium">
                      {Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value || '—')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            <AnimatedTimeline events={timeline} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Items ({items.length})</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
              <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                <img src={item.product_image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.product_name}</p>
                <CategoryBadge name={item.category_name} color={item.category_color} />
                {item.options && Object.keys(item.options).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(item.options).map(([key, val]) => {
                      if (!val || (Array.isArray(val) && val.length === 0)) return null
                      const display = Array.isArray(val) ? val.join(', ') : typeof val === 'boolean' ? key.replace(/_/g, ' ') : String(val)
                      return (
                        <Badge key={key} variant="outline" className="text-xs font-normal">
                          {display}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium shrink-0">&times; {item.quantity}</span>
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
                  <span className="font-medium">
                    {ext.user_first_name} {ext.user_last_name} — +{ext.requested_days} days
                  </span>
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
                  <p className="text-xs text-muted-foreground italic">Notes: {ext.admin_notes}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatDateTime(ext.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} placeholder="Explain why this request is being rejected..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Process Dialog */}
      <ReturnProcessDialog
        open={showReturn}
        onOpenChange={setShowReturn}
        request={request}
        items={items}
      />
    </div>
  )
}
