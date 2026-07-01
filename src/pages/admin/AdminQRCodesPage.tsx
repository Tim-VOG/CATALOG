import { useState, useEffect } from 'react'
import {
  QrCode, Plus, Pencil, Trash2, Search, Download,
  Package, Copy, Check, Printer, User, UserPlus, UserMinus,
  History, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react'
import QRCodeLib from 'qrcode'
import { printBrandedQRCodes } from '@/lib/qr-branded'
import { generateBulkQrPdf, downloadBlob } from '@/lib/qr-pdf'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { ScrollFadeIn } from '@/components/ui/motion'
import {
  useQRCodes, useCreateQRCode, useCreateQRCodes, useUpdateQRCode, useDeleteQRCode,
  useClaimQRCode, useReleaseQRCode, useScanLogsForQrCode,
} from '@/hooks/use-qr-codes'
import { useProducts } from '@/hooks/use-products'
import { useProfiles } from '@/hooks/use-profiles'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function generateCode(prefix = 'VO') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${code}`
}

function QRPreview({ code, size = 56  }: any) {
  const [src, setSrc] = useState<any>(null)
  useEffect(() => {
    QRCodeLib.toDataURL(code, { width: size, margin: 1 }).then(setSrc).catch(() => {})
  }, [code, size])
  if (!src) return <div className="rounded-lg bg-muted flex items-center justify-center shrink-0" style={{ width: size, height: size }}><QrCode className="h-5 w-5 text-muted-foreground" /></div>
  return <img src={src} alt={code} className="rounded-lg shrink-0" style={{ width: size, height: size }} />
}

const STATUS_STYLE = {
  available: { label: 'Available', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  assigned: { label: 'Assigned', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  maintenance: { label: 'Maintenance', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
}

const emptyForm = { code: '', product_id: '', label: '', serial_number: '', is_active: true }

export function AdminQRCodesPage() {
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [bulkProductId, setBulkProductId] = useState('')
  const [bulkCount, setBulkCount] = useState(5)
  const [bulkPrefix, setBulkPrefix] = useState('VO')
  const [copiedId, setCopiedId] = useState<any>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  // Desktop assign (no camera)
  const [assignTarget, setAssignTarget] = useState<any>(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignReturn, setAssignReturn] = useState('')
  // Per-device history
  const [historyTarget, setHistoryTarget] = useState<any>(null)

  const { data: qrCodes = [], isLoading } = useQRCodes({ search })
  const { data: products = [] } = useProducts()
  const { data: profiles = [] } = useProfiles({})
  const createQR = useCreateQRCode()
  const createQRs = useCreateQRCodes()
  const updateQR = useUpdateQRCode()
  const deleteQR = useDeleteQRCode()
  const claimQR = useClaimQRCode()
  const releaseQR = useReleaseQRCode()

  const handleAssign = async () => {
    if (!assignTarget || !assignUserId) { toast.error('Pick a person'); return }
    const u: any = profiles.find((p: any) => p.id === assignUserId)
    try {
      await claimQR.mutateAsync({
        id: assignTarget.id,
        assigned_to: u?.id,
        assigned_to_name: [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email,
        assigned_to_email: u?.email,
        assigned_at: new Date().toISOString(),
        expected_return_date: assignReturn || null,
      })
      toast.success('Assigned')
      setAssignTarget(null); setAssignUserId(''); setAssignReturn('')
    } catch (err: any) {
      toast.error(err?.message || 'Could not assign')
    }
  }

  const handleRelease = async (qr: any) => {
    if (!confirm(`Release ${qr.code} from ${qr.assigned_to_name || 'this person'}?`)) return
    try {
      await releaseQR.mutateAsync({ id: qr.id })
      toast.success('Released — back to available')
    } catch (err: any) {
      toast.error(err?.message || 'Could not release')
    }
  }

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, code: generateCode('VO') }); setShowDialog(true) }
  const openEdit = (qr) => { setEditing(qr); setForm({ code: qr.code, product_id: qr.product_id, label: qr.label || '', serial_number: qr.serial_number || '', is_active: qr.is_active }); setShowDialog(true) }

  const handleSave = async () => {
    try {
      if (editing) { await updateQR.mutateAsync({ id: editing.id, ...form }); toast.success('QR code updated') }
      else { await createQR.mutateAsync(form); toast.success('QR code created') }
      setShowDialog(false)
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this QR code?')) return
    try { await deleteQR.mutateAsync(id); toast.success('QR code deleted') }
    catch (err: any) { toast.error(err.message) }
  }

  const handleBulkGenerate = async () => {
    if (!bulkProductId) return toast.error('Select a product')
    try {
      const codes = Array.from({ length: bulkCount }, () => ({ code: generateCode(bulkPrefix), product_id: bulkProductId, is_active: true }))
      await createQRs.mutateAsync(codes)
      toast.success(`${bulkCount} QR codes generated`)
      setShowBulkDialog(false)
    } catch (err: any) { toast.error(err.message) }
  }

  const copyCode = (code) => { navigator.clipboard.writeText(code); setCopiedId(code); setTimeout(() => setCopiedId(null), 2000) }

  const downloadQR = async (code, label) => {
    const url = await QRCodeLib.toDataURL(code, { width: 400, margin: 2 })
    const a = document.createElement('a'); a.href = url; a.download = `qr-${label || code}.png`; a.click()
  }

  const handlePrintAll = async () => {
    const items = qrCodes.filter((qr) => qr.is_active).map((qr) => ({ code: qr.code, label: qr.product_name || qr.label || qr.code }))
    if (!items.length) return toast.error('No active QR codes')
    await printBrandedQRCodes(items)
  }

  // Download a printable A4 PDF with 35 stickers per page — better
  // than the live print preview when shipping a label sheet to a
  // colleague or printing on a label printer that wants a PDF.
  const handleExportPdf = async () => {
    const source = filtered.length ? filtered : qrCodes
    const items = source.filter((qr) => qr.is_active).map((qr) => ({
      code: qr.code,
      label: qr.product_name || qr.label || qr.code,
    }))
    if (!items.length) return toast.error('No active QR codes to export')
    toast.info(`Generating PDF for ${items.length} sticker${items.length > 1 ? 's' : ''}…`)
    try {
      const blob = await generateBulkQrPdf(items)
      downloadBlob(blob, `vo-hub-qr-stickers-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err: any) {
      toast.error(err?.message || 'PDF export failed')
    }
  }

  const categories = [...new Set(qrCodes.map((qr) => qr.category_name).filter(Boolean))]
  const availableCount = qrCodes.filter((q) => (q.status || 'available') === 'available').length
  const assignedCount = qrCodes.filter((q) => q.status === 'assigned').length

  const filtered = qrCodes.filter((qr) => {
    if (categoryFilter !== 'all' && qr.category_name !== categoryFilter) return false
    if (statusFilter !== 'all' && (qr.status || 'available') !== statusFilter) return false
    return true
  })

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader title="QR Codes" description={`${qrCodes.length} codes — ${availableCount} available, ${assignedCount} assigned`}>
        <Button variant="outline" size="sm" onClick={handlePrintAll} className="gap-2"><Printer className="h-3.5 w-3.5" /> Print All</Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-2"><Download className="h-3.5 w-3.5" /> Export PDF</Button>
        <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)} className="gap-2"><Plus className="h-3.5 w-3.5" /> Bulk Generate</Button>
        <Button size="sm" onClick={openNew} className="gap-2"><Plus className="h-3.5 w-3.5" /> Add QR Code</Button>
      </AdminPageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by code or product..." className="pl-9" value={search} onChange={(e: any) => setSearch(e.target.value)} />
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: `All (${qrCodes.length})` },
            { key: 'available', label: `Available (${availableCount})` },
            { key: 'assigned', label: `Assigned (${assignedCount})` },
          ].map((f) => (
            <Button key={f.key} variant={statusFilter === f.key ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setStatusFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex gap-1.5">
            <Button variant={categoryFilter === 'all' ? 'secondary' : 'ghost'} size="sm" className="text-xs" onClick={() => setCategoryFilter('all')}>All types</Button>
            {categories.map((cat) => (
              <Button key={cat} variant={categoryFilter === cat ? 'secondary' : 'ghost'} size="sm" className="text-xs" onClick={() => setCategoryFilter(cat)}>
                {cat}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* QR code list */}
      {filtered.length === 0 ? (
        <EmptyState icon={QrCode} title="No QR codes" description={search ? 'No codes match your search' : 'Add your first QR code'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((qr, i) => {
            const qrStatus = qr.status || 'available'
            const style = STATUS_STYLE[qrStatus] || STATUS_STYLE.available
            return (
              <ScrollFadeIn key={qr.id} delay={i * 0.03}>
                <Card className={cn('transition-all hover:shadow-md', !qr.is_active && 'opacity-50')}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <QRPreview code={qr.code} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{qr.product_name || qr.label || 'Unlinked'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <code className="text-[11px] text-muted-foreground font-mono">{qr.code}</code>
                          <button onClick={() => copyCode(qr.code)} className="text-muted-foreground hover:text-foreground">
                            {copiedId === qr.code ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {qr.category_name && <CategoryBadge name={qr.category_name} color={qr.category_color} />}
                          <Badge variant="outline" className={cn('text-[10px] gap-1', style.bg, style.color)}>
                            {style.label}
                          </Badge>
                        </div>
                        {/* Show who it's assigned to */}
                        {qrStatus === 'assigned' && qr.assigned_to_name && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-blue-500">
                            <User className="h-3 w-3" />
                            <span>{qr.assigned_to_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {qrStatus === 'available' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title="Assign to a person" onClick={() => { setAssignTarget(qr); setAssignUserId(''); setAssignReturn('') }}>
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {qrStatus === 'assigned' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Release (mark returned)" onClick={() => handleRelease(qr)}>
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="History" onClick={() => setHistoryTarget(qr)}>
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadQR(qr.code, qr.product_name)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(qr)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(qr.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            )
          })}
        </div>
      )}

      {/* Per-device history */}
      <Dialog open={!!historyTarget} onOpenChange={(v: boolean) => !v && setHistoryTarget(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> {historyTarget?.code} history</DialogTitle>
          </DialogHeader>
          {historyTarget && <QrHistory qrCodeId={historyTarget.id} />}
        </DialogContent>
      </Dialog>

      {/* Desktop assign dialog (no camera) */}
      <Dialog open={!!assignTarget} onOpenChange={(v: boolean) => !v && setAssignTarget(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Assign {assignTarget?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{assignTarget?.product_name || assignTarget?.label}</p>
            <div className="space-y-1">
              <Label>Assign to *</Label>
              <Select value={assignUserId} onChange={(e: any) => setAssignUserId(e.target.value)}>
                <option value="">Select a person…</option>
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Expected return (optional)</Label>
              <Input type="date" value={assignReturn} onChange={(e: any) => setAssignReturn(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignTarget(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={claimQR.isPending}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader><DialogTitle>{editing ? 'Edit QR Code' : 'Add QR Code'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e: any) => setForm({ ...form, code: e.target.value })} placeholder="VO-XXXXXX" />
            </div>
            <div className="space-y-1">
              <Label>Product *</Label>
              <Select value={form.product_id} onChange={(e: any) => setForm({ ...form, product_id: e.target.value })}>
                <option value="">Select product...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.category_name})</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e: any) => setForm({ ...form, label: e.target.value })} placeholder="Optional label" />
            </div>
            <div className="space-y-1">
              <Label>Serial number</Label>
              <Input
                value={form.serial_number}
                onChange={(e: any) => setForm({ ...form, serial_number: e.target.value })}
                placeholder="e.g. C02XL1ABCDEF"
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">The physical asset's serial — shown when the QR is scanned.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Generate Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader><DialogTitle>Bulk Generate QR Codes</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Product *</Label>
              <Select value={bulkProductId} onChange={(e: any) => setBulkProductId(e.target.value)}>
                <option value="">Select product...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Prefix</Label><Input value={bulkPrefix} onChange={(e: any) => setBulkPrefix(e.target.value)} /></div>
              <div className="space-y-1"><Label>Count</Label><Input type="number" min={1} max={50} value={bulkCount} onChange={(e: any) => setBulkCount(parseInt(e.target.value) || 1)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkGenerate}>Generate {bulkCount} codes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Per-device lifecycle (take/deposit history for one QR) ──
function QrHistory({ qrCodeId }: { qrCodeId: string }) {
  const { data: logs = [], isLoading } = useScanLogsForQrCode(qrCodeId)
  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
  if (!logs.length) return <p className="text-sm text-muted-foreground py-6 text-center">No scan history for this unit yet.</p>
  return (
    <div className="max-h-80 overflow-auto -mx-1">
      <div className="relative pl-2">
        <div className="absolute left-[18px] top-1 bottom-1 w-px bg-border/50" aria-hidden />
        <div className="space-y-1">
          {logs.map((log: any) => {
            const isTake = log.action === 'take'
            const Icon = isTake ? ArrowDownToLine : ArrowUpFromLine
            return (
              <div key={log.id} className="relative flex items-start gap-3 py-1.5">
                <div className={cn('relative z-10 h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                  isTake ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600')}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm truncate">
                    {isTake ? 'Picked up' : 'Returned'}
                    {log.user_name ? ` · ${log.user_name}` : log.user_email ? ` · ${log.user_email}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
