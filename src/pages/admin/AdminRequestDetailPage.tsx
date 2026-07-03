import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLoanRequest, useLoanRequestItems, useUpdateRequestStatus } from '@/hooks/use-loan-requests'
import { useAssignEquipmentBatch } from '@/hooks/use-user-equipment'
import { useQRCodes, useUpdateQRCode, useClaimQRCode, useReleaseQRCode } from '@/hooks/use-qr-codes'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { supabase } from '@/lib/supabase'
import { sendStatusChangeEmail, buildTimeline, formatDate, formatDateTime } from '@/services/request-status-service'
import { QRScanner } from '@/components/scan/QRScanner'
import {
  ArrowLeft, Calendar, Package, Check, QrCode, Search, Link2, Camera, List, MessageSquare, Save, X,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
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

function AdminNotes({ requestId, initialNotes  }: any) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const showToast = useUIStore((s: any) => s.showToast)
  const changed = notes !== initialNotes

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('loan_requests').update({ admin_notes: notes }).eq('id', requestId)
      showToast(t('admin.requestDetail.notesSaved'))
    } catch (err: any) { showToast(err.message, 'error') }
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      <Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder={t('admin.requestDetail.notesPlaceholder')} rows={3} className="text-sm" />
      {changed && (
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-3.5 w-3.5" /> {saving ? t('admin.requestDetail.saving') : t('admin.requestDetail.saveNotes')}
        </Button>
      )}
    </div>
  )
}

export function AdminRequestDetailPage() {
  const { t } = useTranslation()
  const { requestId } = useParams()
  const { data: request, isLoading, isFetching } = useLoanRequest(requestId)
  const { data: items = [] } = useLoanRequestItems(requestId)
  const { data: allQRCodes = [] } = useQRCodes({})
  const updateStatus = useUpdateRequestStatus()
  const updateQR = useUpdateQRCode()
  const claimQR = useClaimQRCode()
  const releaseQR = useReleaseQRCode()
  const assignBatch = useAssignEquipmentBatch()
  const { user } = useAuth()
  const showToast = useUIStore((s: any) => s.showToast)

  const [assigningItem, setAssigningItem] = useState<any>(null)
  const [assignMode, setAssignMode] = useState('scan')
  const [qrSearch, setQrSearch] = useState('')
  // Track QR codes assigned per loan_request_item, keyed by the item id (not
  // product_id — two items can carry the same product and we want them
  // independent). Each value is an array sized up to item.quantity.
  const [assignedQRs, setAssignedQRs] = useState<any>({})
  const [scanError, setScanError] = useState<any>(null)

  // ──────────────────────────────────────────────────────────────
  // All hooks (including useCallback / useMemo) must run on every
  // render before any conditional early-return — otherwise React
  // throws "Rendered more hooks than during the previous render".
  // ──────────────────────────────────────────────────────────────
  const handleScannedCode = useCallback(async (scannedCode: any) => {
    if (!assigningItem) return
    setScanError(null)
    const qr = allQRCodes.find(
      (q) => q.code === scannedCode && q.product_id === assigningItem.product_id
    )
    if (!qr) {
      setScanError(t('admin.requestDetail.scanInvalidCode', { code: scannedCode, productName: assigningItem.product_name }))
      return
    }
    if ((qr.status || 'available') !== 'available') {
      setScanError(t('admin.requestDetail.scanAlreadyAssigned', { code: scannedCode, name: qr.assigned_to_name || t('admin.requestDetail.someone') }))
      return
    }
    // Guard against double-assigning the same QR inside the same request
    const alreadyHere = Object.values(assignedQRs).flat().some((q: any) => q?.id === qr.id)
    if (alreadyHere) {
      setScanError(t('admin.requestDetail.scanAlreadyUsed', { code: scannedCode }))
      return
    }
    try {
      await claimQR.mutateAsync({
        id: qr.id,
        assigned_to: request?.user_id,
        assigned_to_name: `${request?.user_first_name || ''} ${request?.user_last_name || ''}`.trim(),
        assigned_to_email: request?.user_email || '',
        assigned_at: new Date().toISOString(),
        loan_request_id: request.id,
        loan_request_item_id: assigningItem.id,
      })
      // Atomic decrement via SQL helper — read-modify-write from the
      // JS side desynced the count when two assignments happened back
      // to back on the same page load (both reads saw the same cached
      // value). Best-effort: log warnings, don't block the assignment.
      try {
        await supabase.rpc('decrement_product_stock', { p_id: qr.product_id })
      } catch (e: any) {
        console.warn('[handleScannedCode] could not decrement product stock', e)
      }
      setAssignedQRs((prev: any) => {
        const list = prev[assigningItem.id] || []
        return { ...prev, [assigningItem.id]: [...list, qr] }
      })
      // If this slot fills the item's quantity, close the picker. Otherwise
      // keep it open so the admin can scan the next unit immediately.
      const nextCount = ((assignedQRs[assigningItem.id] || []).length) + 1
      if (nextCount >= assigningItem.quantity) setAssigningItem(null)
      showToast(t('admin.requestDetail.qrAssigned', { code: qr.code }))
    } catch (err: any) {
      showToast(err.message || t('admin.requestDetail.failedAssignQr'), 'error')
    }
  }, [assigningItem, allQRCodes, assignedQRs, request, updateQR, showToast, t])

  const filteredAssignQRs = useMemo(() => {
    if (!assigningItem) return []
    let qrs = allQRCodes.filter(
      (qr) => qr.product_id === assigningItem.product_id && (qr.status || 'available') === 'available' && qr.is_active
    )
    if (qrSearch.trim()) {
      const q = qrSearch.toLowerCase()
      qrs = qrs.filter((qr: any) => qr.code.toLowerCase().includes(q) || (qr.label || '').toLowerCase().includes(q))
    }
    return qrs
  }, [assigningItem, allQRCodes, qrSearch])

  // Hydrate the assigned-QR map from the database every time the QR
  // catalog or the request changes. Previously the page kept a purely
  // local map that was reset to {} on every reload, so QRs assigned in
  // an earlier session never showed up until the admin re-assigned them.
  useEffect(() => {
    if (!request?.id) return
    const next: Record<string, any> = {}
    for (const qr of allQRCodes) {
      if (qr.loan_request_id !== request.id) continue
      const key = qr.loan_request_item_id
      if (!key) continue
      if (!next[key]) next[key] = []
      next[key].push(qr)
    }
    setAssignedQRs(next)
  }, [allQRCodes, request?.id])

  if (isLoading || isFetching) return <PageLoading />
  if (!request) return <div className="text-center py-16 text-muted-foreground">{t('admin.requestDetail.requestNotFound')}</div>

  const requesterName = `${request.user_first_name || ''} ${request.user_last_name || ''}`.trim()

  const handleStatusUpdate = async (status: any) => {
    try {
      await updateStatus.mutateAsync({ id: request.id, status })
      showToast(t('admin.requestDetail.requestMarkedAs', { status: status.replace('_', ' ') }))

      if (status === 'ready' && items.length > 0) {
        // One user_equipment row per physical unit handed out — so an item
        // with quantity 2 becomes two rows, each carrying its own QR code.
        const assignments = items.flatMap((item: any) => {
          const qrs = assignedQRs[item.id] || []
          const rows: any[] = []
          for (let i = 0; i < item.quantity; i++) {
            const qr = qrs[i]
            rows.push({
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
              notes: qr
                ? `QR: ${qr.code}`
                : `From request #${request.request_number}`,
            })
          }
          return rows
        })
        assignBatch.mutateAsync(assignments).catch(() => {})
      }

      sendStatusChangeEmail(status, { request, requestType: 'equipment' })
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleAssignQR = async (qrCode: any) => {
    // Guard against double-assigning the same QR inside the same request
    const alreadyHere = Object.values(assignedQRs).flat().some((q: any) => q?.id === qrCode.id)
    if (alreadyHere) {
      showToast(t('admin.requestDetail.qrCodeAlreadyUsed', { code: qrCode.code }), 'error')
      return
    }
    try {
      await claimQR.mutateAsync({
        id: qrCode.id,
        assigned_to: request.user_id,
        assigned_to_name: requesterName,
        assigned_to_email: request.user_email || '',
        assigned_at: new Date().toISOString(),
        loan_request_id: request.id,
        loan_request_item_id: assigningItem.id,
      })
      // Atomic decrement via SQL helper (avoids the read-modify-write
      // desync on multi-assign).
      try {
        await supabase.rpc('decrement_product_stock', { p_id: qrCode.product_id })
      } catch (e: any) {
        console.warn('[handleAssignQR] could not decrement product stock', e)
      }

      setAssignedQRs((prev: any) => {
        const list = prev[assigningItem.id] || []
        return { ...prev, [assigningItem.id]: [...list, qrCode] }
      })
      const nextCount = ((assignedQRs[assigningItem.id] || []).length) + 1
      if (nextCount >= assigningItem.quantity) setAssigningItem(null)
      showToast(t('admin.requestDetail.qrAssignedTo', { code: qrCode.code, name: requesterName }))
    } catch (err: any) {
      showToast(err.message || t('admin.requestDetail.failedAssignQr'), 'error')
    }
  }

  // Free a previously-assigned QR so the admin can swap it for another
  // before marking the request as ready.
  const handleUnassignQR = async (item: any, qrCode: any) => {
    try {
      await releaseQR.mutateAsync({ id: qrCode.id, expectedLoanRequestId: request.id })
      try {
        await supabase.rpc('increment_product_stock', { p_id: qrCode.product_id })
      } catch (e: any) {
        console.warn('[handleUnassignQR] could not bump product stock back', e)
      }
      setAssignedQRs((prev: any) => {
        const list = (prev[item.id] || []).filter((q: any) => q.id !== qrCode.id)
        return { ...prev, [item.id]: list }
      })
      showToast(t('admin.requestDetail.qrUnassigned', { code: qrCode.code }))
    } catch (err: any) {
      showToast(err.message || t('admin.requestDetail.failedUnassignQr'), 'error')
    }
  }

  const getAvailableQRsForProduct = (productId: any) => {
    // Exclude QRs already used elsewhere in this request so the same code
    // can't be picked twice for two slots of the same product.
    const usedIds = new Set(Object.values(assignedQRs).flat().map((q: any) => q?.id).filter(Boolean))
    return allQRCodes.filter(
      (qr) => qr.product_id === productId
        && (qr.status || 'available') === 'available'
        && qr.is_active
        && !usedIds.has(qr.id)
    )
  }

  // An item is fully assigned when as many QR codes are linked as the
  // quantity requested.
  const isItemFullyAssigned = (item: any) => (assignedQRs[item.id]?.length || 0) >= item.quantity
  const allItemsAssigned = items.every(isItemFullyAssigned)
  const timeline = buildTimeline(request)

  return (
    <div className="space-y-6">
      <Link to="/admin/requests">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> {t('admin.requestDetail.backToRequests')}
        </Button>
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold">{request.project_name}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.requestDetail.requestByLine', { number: request.request_number, name: requesterName })}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          {request.status === 'pending' && (
            <Button className="gap-2" onClick={() => handleStatusUpdate('in_progress')}>
              <Package className="h-4 w-4" /> {t('admin.requestDetail.startProcessing')}
            </Button>
          )}
          {request.status === 'in_progress' && (
            <div className="flex items-center gap-2">
              {!allItemsAssigned && (
                <span className="text-xs text-amber-600">
                  {t('admin.requestDetail.assignQrFirst')}
                </span>
              )}
              <Button
                variant="success"
                className="gap-2"
                onClick={() => handleStatusUpdate('ready')}
                disabled={!allItemsAssigned}
              >
                <Check className="h-4 w-4" /> {t('admin.requestDetail.markReady')}
              </Button>
            </div>
          )}
          {request.status === 'ready' && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                <Check className="h-4 w-4" /> {t('admin.requestDetail.readyForPickup')}
              </span>
              <Button variant="outline" className="gap-2" onClick={() => handleStatusUpdate('returned')}>
                <Check className="h-4 w-4" /> {t('admin.requestDetail.markReturned')}
              </Button>
            </div>
          )}
          {request.status === 'returned' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Check className="h-4 w-4" /> {t('admin.requestDetail.returned')}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('admin.requestDetail.projectDetails')}</CardTitle></CardHeader>
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
            {(request.pickup_contact || request.return_contact) && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                {request.pickup_contact && (
                  <div>{t('admin.requestDetail.pickupBy')} <strong className="text-foreground">{request.pickup_contact}</strong></div>
                )}
                {request.return_contact && (
                  <div>{t('admin.requestDetail.returnBy')} <strong className="text-foreground">{request.return_contact}</strong></div>
                )}
              </div>
            )}
            {request.project_description && <p className="text-muted-foreground">{request.project_description}</p>}
            {request.global_comment && <p className="italic text-muted-foreground">&ldquo;{request.global_comment}&rdquo;</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t('admin.requestDetail.timeline')}</CardTitle></CardHeader>
          <CardContent>
            <AnimatedTimeline events={timeline} />
          </CardContent>
        </Card>
      </div>

      {/* Items with QR assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.requestDetail.itemsCount', { count: items.length })}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {items.map((item: any) => {
            const assignedList = assignedQRs[item.id] || []
            const availableCount = getAvailableQRsForProduct(item.product_id).length
            const slotsLeft = Math.max(item.quantity - assignedList.length, 0)

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
                        {Object.entries(item.options as Record<string, any>).map(([key, val]) => {
                          if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) return null
                          const display = Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? Object.values(val).filter(Boolean).join(', ') : String(val)
                          return display ? <Badge key={key} variant="outline" className="text-xs font-normal">{display}</Badge> : null
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium block">&times; {item.quantity}</span>
                    {request.status === 'in_progress' && item.quantity > 1 && (
                      <span className="text-[10px] text-muted-foreground">{t('admin.requestDetail.assignedProgress', { assigned: assignedList.length, total: item.quantity })}</span>
                    )}
                  </div>
                </div>

                {/* QR Assignment section — visible when in_progress AND when
                    ready (in case the admin skipped the assignment step). */}
                {(request.status === 'in_progress' || request.status === 'ready') && (
                  <div className="mt-3 ml-16 space-y-2">
                    {assignedList.map((qr: any) => (
                      <div key={qr.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <QrCode className="h-4 w-4 text-emerald-500" />
                        <code className="text-xs font-mono font-semibold text-emerald-600">{qr.code}</code>
                        <span className="text-xs text-emerald-600">{t('admin.requestDetail.assignedToName', { name: requesterName })}</span>
                        <button
                          onClick={() => handleUnassignQR(item, qr)}
                          className="ml-auto text-emerald-600/60 hover:text-destructive transition-colors"
                          title={t('admin.requestDetail.unassign')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {slotsLeft > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={() => { setAssigningItem(item); setQrSearch('') }}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        {t('admin.requestDetail.assignQrCode')}
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-muted-foreground">{t('admin.requestDetail.slotsLeft', { count: slotsLeft })}</span>
                        )}
                        {availableCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] ml-1">{t('admin.requestDetail.countAvailable', { count: availableCount })}</Badge>
                        )}
                      </Button>
                    )}
                  </div>
                )}

              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Admin notes */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> {t('admin.requestDetail.adminNotes')}</CardTitle></CardHeader>
        <CardContent>
          <AdminNotes requestId={request.id} initialNotes={request.admin_notes || ''} />
        </CardContent>
      </Card>

      {/* QR Assignment Dialog — Scan or Pick from list */}
      <Dialog open={!!assigningItem} onOpenChange={() => { setAssigningItem(null); setAssignMode('scan') }}>
        <DialogContent className="max-w-md p-0 overflow-hidden" size="md">
          <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <h3 className="font-display font-bold text-base">{t('admin.requestDetail.assignQrCode')}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {assigningItem?.product_name} → <strong>{requesterName}</strong>
            </p>
          </div>

          {/* Mode toggle: Scan / List */}
          <div className="px-6 pt-4 flex gap-2">
            <Button
              variant={assignMode === 'scan' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2 text-xs"
              onClick={() => setAssignMode('scan')}
            >
              <Camera className="h-3.5 w-3.5" /> {t('admin.requestDetail.scanQr')}
            </Button>
            <Button
              variant={assignMode === 'list' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2 text-xs"
              onClick={() => setAssignMode('list')}
            >
              <List className="h-3.5 w-3.5" /> {t('admin.requestDetail.pickFromList')}
            </Button>
          </div>

          <div className="px-6 py-4">
            {assignMode === 'scan' ? (
              <div className="space-y-3">
                <QRScanner onScan={handleScannedCode} />
                {scanError && (
                  <p className="text-sm text-destructive text-center">{scanError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('admin.requestDetail.searchQrCodePlaceholder')} className="pl-9" value={qrSearch} onChange={(e: any) => setQrSearch(e.target.value)} />
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {filteredAssignQRs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">{t('admin.requestDetail.noAvailableQrCodes')}</p>
                  ) : (
                    filteredAssignQRs.map((qr: any) => (
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
                        <Badge variant="outline" className="text-[10px] text-emerald-500 bg-emerald-500/10 border-emerald-500/20">{t('admin.requestDetail.available')}</Badge>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" className="w-full" onClick={() => { setAssigningItem(null); setAssignMode('scan') }}>{t('admin.requestDetail.cancel')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
