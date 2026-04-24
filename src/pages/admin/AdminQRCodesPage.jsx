import { useState, useRef, useEffect } from 'react'
import {
  QrCode, Plus, Pencil, Trash2, Search, Download,
  Package, Copy, Check, Printer,
} from 'lucide-react'
import QRCodeLib from 'qrcode'
import { printBrandedQRCodes } from '@/lib/qr-branded'
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
} from '@/hooks/use-qr-codes'
import { useProducts } from '@/hooks/use-products'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function generateCode(prefix = 'VO') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${code}`
}

function QRPreview({ code, size = 64 }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    QRCodeLib.toDataURL(code, { width: size, margin: 1 })
      .then(setSrc).catch(() => {})
  }, [code, size])

  if (!src) {
    return (
      <div className="rounded-lg bg-muted flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <QrCode className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }
  return <img src={src} alt={`QR: ${code}`} className="rounded-lg shrink-0" style={{ width: size, height: size }} />
}

const emptyForm = { code: '', product_id: '', label: '', is_active: true }

export function AdminQRCodesPage() {
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [bulkProductId, setBulkProductId] = useState('')
  const [bulkCount, setBulkCount] = useState(5)
  const [bulkPrefix, setBulkPrefix] = useState('VO')
  const [copiedId, setCopiedId] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const { data: qrCodes = [], isLoading } = useQRCodes({ search })
  const { data: products = [] } = useProducts()

  const createQR = useCreateQRCode()
  const createQRs = useCreateQRCodes()
  const updateQR = useUpdateQRCode()
  const deleteQR = useDeleteQRCode()

  const openNew = () => {
    setEditing(null)
    setForm({ ...emptyForm, code: generateCode('VO') })
    setShowDialog(true)
  }

  const openEdit = (qr) => {
    setEditing(qr)
    setForm({ code: qr.code, product_id: qr.product_id, label: qr.label || '', is_active: qr.is_active })
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await updateQR.mutateAsync({ id: editing.id, ...form })
        toast.success('QR code updated')
      } else {
        await createQR.mutateAsync(form)
        toast.success('QR code created')
      }
      setShowDialog(false)
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this QR code?')) return
    try {
      await deleteQR.mutateAsync(id)
      toast.success('QR code deleted')
    } catch (err) { toast.error(err.message) }
  }

  const handleBulkGenerate = async () => {
    if (!bulkProductId) return toast.error('Select a product')
    try {
      const codes = Array.from({ length: bulkCount }, () => ({
        code: generateCode(bulkPrefix),
        product_id: bulkProductId,
        is_active: true,
      }))
      await createQRs.mutateAsync(codes)
      toast.success(`${bulkCount} QR codes generated`)
      setShowBulkDialog(false)
    } catch (err) { toast.error(err.message) }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadQR = async (code, label) => {
    const url = await QRCodeLib.toDataURL(code, { width: 400, margin: 2 })
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${label || code}.png`
    a.click()
  }

  const handlePrintAll = async () => {
    const items = qrCodes.filter((qr) => qr.is_active).map((qr) => ({
      code: qr.code,
      label: qr.product_name || qr.label || qr.code,
    }))
    if (items.length === 0) return toast.error('No active QR codes to print')
    await printBrandedQRCodes(items)
  }

  // Get unique categories from QR codes
  const categories = [...new Set(qrCodes.map((qr) => qr.category_name).filter(Boolean))]

  const filtered = qrCodes.filter((qr) => {
    if (categoryFilter !== 'all' && qr.category_name !== categoryFilter) return false
    return true
  })

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader title="QR Codes" description={`${qrCodes.length} QR codes`}>
        <Button variant="outline" size="sm" onClick={handlePrintAll} className="gap-2">
          <Printer className="h-3.5 w-3.5" /> Print All
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)} className="gap-2">
          <Plus className="h-3.5 w-3.5" /> Bulk Generate
        </Button>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus className="h-3.5 w-3.5" /> Add QR Code
        </Button>
      </AdminPageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by code or product..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          <Button variant={categoryFilter === 'all' ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setCategoryFilter('all')}>
            All ({qrCodes.length})
          </Button>
          {categories.map((cat) => (
            <Button key={cat} variant={categoryFilter === cat ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setCategoryFilter(cat)}>
              {cat} ({qrCodes.filter((q) => q.category_name === cat).length})
            </Button>
          ))}
        </div>
      </div>

      {/* QR code list */}
      {filtered.length === 0 ? (
        <EmptyState icon={QrCode} title="No QR codes" description={search ? 'No QR codes match your search' : 'Add your first QR code'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((qr, i) => (
            <ScrollFadeIn key={qr.id} delay={i * 0.03}>
              <Card className={cn('transition-all hover:shadow-md', !qr.is_active && 'opacity-50')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <QRPreview code={qr.code} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{qr.product_name || qr.label || 'Unlinked'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="text-[11px] text-muted-foreground font-mono">{qr.code}</code>
                        <button onClick={() => copyCode(qr.code)} className="text-muted-foreground hover:text-foreground">
                          {copiedId === qr.code ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {qr.category_name && <CategoryBadge name={qr.category_name} color={qr.category_color} />}
                        <span className="text-xs text-muted-foreground">Stock: {qr.product_stock ?? '—'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
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
          ))}
        </div>
      )}

      {/* Create/Edit QR Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit QR Code' : 'Add QR Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VO-XXXXXX" />
            </div>
            <div className="space-y-1">
              <Label>Product *</Label>
              <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                <option value="">Select product...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.category_name})</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Optional label" />
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
          <DialogHeader>
            <DialogTitle>Bulk Generate QR Codes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Product *</Label>
              <Select value={bulkProductId} onChange={(e) => setBulkProductId(e.target.value)}>
                <option value="">Select product...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Prefix</Label>
                <Input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Count</Label>
                <Input type="number" min={1} max={50} value={bulkCount} onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)} />
              </div>
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
