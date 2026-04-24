import { useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLoanRequest, useLoanRequestItems, useUpdateRequestStatus } from '@/hooks/use-loan-requests'
import { useAssignEquipmentBatch } from '@/hooks/use-user-equipment'
import { useQRCodes, useUpdateQRCode } from '@/hooks/use-qr-codes'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { supabase } from '@/lib/supabase'
import { sendStatusChangeEmail, buildTimeline, formatDate, formatDateTime } from '@/services/request-status-service'
import {
  ArrowLeft, Calendar, Package, Check, QrCode, Search, Link2,
} from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { AnimatedTimeline } from '@/components/common/AnimatedTimeline'
import { cn } from '@/lib/utils'

export function AdminRequestDetailPage() {
  const { requestId } = useParams()
  const { data: request, isLoading } = useLoanRequest(requestId)
  const { data: items = [] } = useLoanRequestItems(requestId)
  const { data: allQRCodes = [] } = useQRCodes({})
  const updateStatus = useUpdateRequestStatus()
  const updateQR = useUpdateQRCode()
  const assignBatch = useAssignEquipmentBatch()
  const { user } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [assigningItem, setAssigningItem] = useState(null)
  const [qrSearch, setQrSearch] = useState('')
  const [assignedQRs, setAssignedQRs] = useState({})

  if (isLoading) return <PageLoading />
  if (!request) return <div className="text-center py-16 text-muted-foreground">Request not found</div>

  const requesterName = `${request.user_first_name || ''} ${request.user_last_name || ''}`.trim()

  const handleStatusUpdate = async (status) => {
    try {
      await updateStatus.mutateAsync({ id: request.id, status })
      showToast(`Request marked as ${status.replace('_', ' ')}`)

      if (status === 'ready' && items.length > 0) {
        const assignments = items.map((item) => ({
          user_id: request.user_id,
          user_email: request.user_email || '',
          user_name: requesterName,
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
          notes: assignedQRs[item.product_id]
            ? `QR: ${assignedQRs[item.product_id].code}`
            : `From request #${request.request_number}`,
        }))
        assignBatch.mutateAsync(assignments).catch(() => {})
      }

      sendStatusChangeEmail(status, { request, requestType: 'equipment' })
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleAssignQR = async (qrCode) => {
    try {
      await updateQR.mutateAsync({
        id: qrCode.id,
        status: 'assigned',
        assigned_to: request.user_id,
        assigned_to_name: requesterName,
        assigned_to_email: request.user_email || '',
        assigned_at: new Date().toISOString(),
      })

      await supabase.from('products').update({
        total_stock: Math.max((qrCode.product_stock || 1) - 1, 0),
      }).eq('id', qrCode.product_id)

      setAssignedQRs((prev) => ({ ...prev, [assigningItem.product_id]: qrCode }))
      setAssigningItem(null)
      showToast(`${qrCode.code} assigned to ${requesterName}`)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const getAvailableQRsForProduct = (productId) => {
    return allQRCodes.filter(
      (qr) => qr.product_id === productId && (qr.status || 'available') === 'available' && qr.is_active
    )
  }

  const filteredAssignQRs = useMemo(() => {
    if (!assigningItem) return []
    let qrs = getAvailableQRsForProduct(assigningItem.product_id)
    if (qrSearch.trim()) {
      const q = qrSearch.toLowerCase()
      qrs = qrs.filter((qr) => qr.code.toLowerCase().includes(q) || (qr.label || '').toLowerCase().includes(q))
    }
    return qrs
  }, [assigningItem, allQRCodes, qrSearch])

  const allItemsAssigned = items.every((item) => assignedQRs[item.product_id])
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
            Request #{request.request_number} by {requesterName}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          {request.status === 'pending' && (
            <Button className="gap-2" onClick={() => handleStatusUpdate('in_progress')}>
              <Package className="h-4 w-4" /> Start Processing
            </Button>
          )}
          {request.status === 'in_progress' && (
            <Button
              variant="success"
              className="gap-2"
              onClick={() => handleStatusUpdate('ready')}
            >
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
              <span>{requesterName}</span>
              <span className="text-muted-foreground">({request.user_email})</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(request.pickup_date)} &rarr; {formatDate(request.return_date)}</span>
            </div>
            {request.project_description && <p className="text-muted-foreground">{request.project_description}</p>}
            {request.global_comment && <p className="italic text-muted-foreground">&ldquo;{request.global_comment}&rdquo;</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            <AnimatedTimeline events={timeline} />
          </CardContent>
        </Card>
      </div>

      {/* Items with QR assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {items.map((item) => {
            const assigned = assignedQRs[item.product_id]
            const availableCount = getAvailableQRsForProduct(item.product_id).length

            return (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                    {item.product_image && <img src={item.product_image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <CategoryBadge name={item.category_name} color={item.category_color} />
                    {item.options && Object.keys(item.options).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {Object.entries(item.options).map(([key, val]) => {
                          if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) return null
                          const display = Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? Object.values(val).filter(Boolean).join(', ') : String(val)
                          return display ? <Badge key={key} variant="outline" className="text-xs font-normal">{display}</Badge> : null
                        })}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium shrink-0">&times; {item.quantity}</span>
                </div>

                {/* QR Assignment section — visible when in_progress */}
                {request.status === 'in_progress' && (
                  <div className="mt-3 ml-16">
                    {assigned ? (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <QrCode className="h-4 w-4 text-emerald-500" />
                        <code className="text-xs font-mono font-semibold text-emerald-600">{assigned.code}</code>
                        <span className="text-xs text-emerald-600">assigned to {requesterName}</span>
                        <Check className="h-3.5 w-3.5 text-emerald-500 ml-auto" />
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={() => { setAssigningItem(item); setQrSearch('') }}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Assign QR Code
                        {availableCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] ml-1">{availableCount} available</Badge>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Show assigned QR when ready */}
                {request.status === 'ready' && assigned && (
                  <div className="mt-3 ml-16 flex items-center gap-2 text-xs text-muted-foreground">
                    <Link2 className="h-3 w-3" />
                    <code className="font-mono">{assigned.code}</code>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* QR Assignment Dialog */}
      <Dialog open={!!assigningItem} onOpenChange={() => setAssigningItem(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base">
              Assign QR Code — {assigningItem?.product_name}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Select a QR code to assign to <strong>{requesterName}</strong>
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search QR code..." className="pl-9" value={qrSearch} onChange={(e) => setQrSearch(e.target.value)} />
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredAssignQRs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No available QR codes for this product
              </p>
            ) : (
              filteredAssignQRs.map((qr) => (
                <button
                  key={qr.id}
                  type="button"
                  onClick={() => handleAssignQR(qr)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                >
                  <QrCode className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono font-semibold">{qr.code}</code>
                    {qr.label && <p className="text-xs text-muted-foreground">{qr.label}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
                    Available
                  </Badge>
                </button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningItem(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
