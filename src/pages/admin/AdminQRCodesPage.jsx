import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  QrCode, Plus, Pencil, Trash2, Search, Download, Eye, EyeOff,
  Package, Layers, Copy, Check, Printer
} from 'lucide-react'
import QRCodeLib from 'qrcode'
import { generateBrandedQR, printBrandedQRCodes } from '@/lib/qr-branded'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { ScrollFadeIn } from '@/components/ui/motion'
import {
  useQRCodes, useCreateQRCode, useCreateQRCodes, useUpdateQRCode, useDeleteQRCode,
  useQRKits, useCreateQRKit, useUpdateQRKit, useDeleteQRKit
} from '@/hooks/use-qr-codes'
import { useProducts } from '@/hooks/use-products'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const emptyQRForm = { code: '', product_id: '', kit_id: '', label: '', is_active: true }
const emptyKitForm = { reference: '', name: '', description: '', items: [] }

export function AdminQRCodesPage() {
  const [tab, setTab] = useState('codes') // 'codes' | 'kits'
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [showKitDialog, setShowKitDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingKit, setEditingKit] = useState(null)
  const [form, setForm] = useState(emptyQRForm)
  const [kitForm, setKitForm] = useState(emptyKitForm)
  const [bulkProductId, setBulkProductId] = useState('')
  const [bulkCount, setBulkCount] = useState(5)
  const [bulkPrefix, setBulkPrefix] = useState('VO')
  const [copiedId, setCopiedId] = useState(null)

  const { data: qrCodes, isLoading: loadingCodes } = useQRCodes({ search })
  const { data: kits, isLoading: loadingKits } = useQRKits()
  const { data: products } = useProducts()

  const createQR = useCreateQRCode()
  const createQRs = useCreateQRCodes()
  const updateQR = useUpdateQRCode()
  const deleteQR = useDeleteQRCode()
  const createKit = useCreateQRKit()
  const updateKit = useUpdateQRKit()
  const deleteKit = useDeleteQRKit()

  // ── QR Code CRUD ──

  const openNewQR = () => {
    setEditing(null)
    setForm({ ...emptyQRForm, code: generateCode('VO') })
    setShowDialog(true)
  }

  const openEditQR = (qr) => {
    setEditing(qr)
    setForm({
      code: qr.code,
      product_id: qr.product_id,
      kit_id: qr.kit_id || '',
      label: qr.label || '',
      is_active: qr.is_active,
    })
    setShowDialog(true)
  }

  const handleSaveQR = async () => {
    try {
      if (editing) {
        await updateQR.mutateAsync({ id: editing.id, ...form })
        toast.success('QR code updated')
      } else {
        await createQR.mutateAsync(form)
        toast.success('QR code created')
      }
      setShowDialog(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteQR = async (id) => {
    if (!confirm('Delete this QR code?')) return
    try {
      await deleteQR.mutateAsync(id)
      toast.success('QR code deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ── Bulk generate ──

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
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ── Kit CRUD ──

  const openNewKit = () => {
    setEditingKit(null)
    setKitForm({ ...emptyKitForm, reference: generateCode('KIT') })
    setShowKitDialog(true)
  }

  const openEditKit = (kit) => {
    setEditingKit(kit)
    setKitForm({
      reference: kit.reference,
      name: kit.name,
      description: kit.description || '',
      items: kit.qr_kit_items?.map(i => ({ product_id: i.product_id, quantity: i.quantity })) || [],
    })
    setShowKitDialog(true)
  }

  const handleSaveKit = async () => {
    try {
      if (editingKit) {
        await updateKit.mutateAsync({ id: editingKit.id, ...kitForm })
        toast.success('Kit updated')
      } else {
        await createKit.mutateAsync(kitForm)
        toast.success('Kit created')
      }
      setShowKitDialog(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteKit = async (id) => {
    if (!confirm('Delete this kit? Associated QR codes will be unlinked.')) return
    try {
      await deleteKit.mutateAsync(id)
      toast.success('Kit deleted')
    } catch (err) {
      toast.error(err.message)
    }
  }

  // ── QR Image generation ──

  const downloadQR = async (code, label) => {
    try {
      const url = await generateBrandedQR(code, { size: 400, label: label || code })
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-${label || code}.png`
      a.click()
    } catch (err) {
      toast.error('Failed to generate QR image')
    }
  }

  const printQRCodes = async (codes) => {
    await printBrandedQRCodes(
      codes.map(qr => ({ code: qr.code, label: qr.label || qr.product_name }))
    )
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isLoading = tab === 'codes' ? loadingCodes : loadingKits

  if (isLoading) return <PageLoading />

  return (
    <>
      <AdminPageHeader title="QR Codes" description="Manage QR codes for inventory scanning">
        {tab === 'codes' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)} className="gap-2">
              <Layers className="h-3.5 w-3.5" />
              Bulk Generate
            </Button>
            {qrCodes?.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => printQRCodes(qrCodes)} className="gap-2">
                <Printer className="h-3.5 w-3.5" />
                Print All
              </Button>
            )}
            <Button size="sm" onClick={openNewQR} className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              New QR Code
            </Button>
          </div>
        )}
        {tab === 'kits' && (
          <Button size="sm" onClick={openNewKit} className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            New Kit
          </Button>
        )}
      </AdminPageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-muted/50 w-fit">
        {[
          { key: 'codes', label: 'QR Codes', icon: QrCode },
          { key: 'kits', label: 'Kits', icon: Layers },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Search (codes tab only) */}
      {tab === 'codes' && (
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search codes, labels, products..."
            className="pl-10"
          />
        </div>
      )}

      {/* QR Codes Tab */}
      {tab === 'codes' && (
        <>
          {!qrCodes?.length ? (
            <EmptyState
              icon={QrCode}
              title="No QR codes yet"
              description="Create QR codes and assign them to products for inventory scanning."
            />
          ) : (
            <div className="grid gap-3">
              {qrCodes.map((qr, idx) => (
                <ScrollFadeIn key={qr.id} delay={idx * 0.03}>
                  <Card className={cn('hover:border-primary/20 transition-colors', !qr.is_active && 'opacity-50')}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* QR preview */}
                        <QRPreview code={qr.code} size={64} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold">{qr.code}</span>
                            <button onClick={() => copyCode(qr.code)} className="text-muted-foreground hover:text-foreground transition-colors">
                              {copiedId === qr.code ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            {!qr.is_active && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactive</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Package className="h-3.5 w-3.5" />
                            <span>{qr.product_name}</span>
                            {qr.category_name && (
                              <CategoryBadge name={qr.category_name} color={qr.category_color} />
                            )}
                          </div>
                          {qr.label && <p className="text-xs text-muted-foreground mt-0.5">{qr.label}</p>}
                          {qr.kit_name && (
                            <div className="flex items-center gap-1 text-xs text-accent mt-0.5">
                              <Layers className="h-3 w-3" />
                              Kit: {qr.kit_name} ({qr.kit_reference})
                            </div>
                          )}
                        </div>

                        {/* Stock */}
                        <div className="text-center px-3">
                          <div className="text-xs text-muted-foreground">Stock</div>
                          <div className="text-lg font-bold">{qr.product_stock}</div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => downloadQR(qr.code, qr.label || qr.product_name)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditQR(qr)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteQR(qr.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollFadeIn>
              ))}
            </div>
          )}
        </>
      )}

      {/* Kits Tab */}
      {tab === 'kits' && (
        <>
          {!kits?.length ? (
            <EmptyState
              icon={Layers}
              title="No kits yet"
              description="Create kits to group multiple items (e.g., phone + charger) under a single QR code."
            />
          ) : (
            <div className="grid gap-3">
              {kits.map((kit, idx) => (
                <ScrollFadeIn key={kit.id} delay={idx * 0.03}>
                  <Card className="hover:border-primary/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                          <Layers className="h-6 w-6 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{kit.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">{kit.reference}</span>
                          </div>
                          {kit.description && <p className="text-sm text-muted-foreground">{kit.description}</p>}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {kit.qr_kit_items?.map((item) => (
                              <span key={item.id} className="text-xs px-2 py-1 rounded-md bg-muted">
                                {item.products?.name} x{item.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditKit(kit)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteKit(kit.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollFadeIn>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── QR Code Dialog ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit QR Code' : 'New QR Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g., EQ-A1B2C3"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Product *</Label>
              <Select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              >
                <option value="">Select a product</option>
                {products?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Kit (optional)</Label>
              <Select
                value={form.kit_id}
                onChange={(e) => setForm({ ...form, kit_id: e.target.value || null })}
              >
                <option value="">No kit</option>
                {kits?.map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.reference})</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g., MacBook Pro #3 - Finance"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="qr-active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="qr-active" className="mb-0">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveQR}
              disabled={!form.code || !form.product_id}
              loading={createQR.isPending || updateQR.isPending}
            >
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Generate Dialog ── */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Generate QR Codes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product *</Label>
              <Select value={bulkProductId} onChange={(e) => setBulkProductId(e.target.value)}>
                <option value="">Select a product</option>
                {products?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Prefix</Label>
              <Input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="VO" />
            </div>
            <div>
              <Label>Number of codes</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={bulkCount}
                onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkGenerate} loading={createQRs.isPending}>
              Generate {bulkCount} Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Kit Dialog ── */}
      <Dialog open={showKitDialog} onOpenChange={setShowKitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKit ? 'Edit Kit' : 'New Kit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reference</Label>
              <Input
                value={kitForm.reference}
                onChange={(e) => setKitForm({ ...kitForm, reference: e.target.value })}
                placeholder="e.g., KIT-001"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={kitForm.name}
                onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
                placeholder="e.g., iPhone Starter Kit"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={kitForm.description}
                onChange={(e) => setKitForm({ ...kitForm, description: e.target.value })}
                placeholder="What's included in this kit..."
                rows={2}
              />
            </div>
            <div>
              <Label>Items</Label>
              <div className="space-y-2 mt-1">
                {kitForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select
                      value={item.product_id}
                      onChange={(e) => {
                        const items = [...kitForm.items]
                        items[idx] = { ...items[idx], product_id: e.target.value }
                        setKitForm({ ...kitForm, items })
                      }}
                      className="flex-1"
                    >
                      <option value="">Select product</option>
                      {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const items = [...kitForm.items]
                        items[idx] = { ...items[idx], quantity: parseInt(e.target.value) || 1 }
                        setKitForm({ ...kitForm, items })
                      }}
                      className="w-20"
                      placeholder="Qty"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setKitForm({ ...kitForm, items: kitForm.items.filter((_, i) => i !== idx) })}
                      className="text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKitForm({ ...kitForm, items: [...kitForm.items, { product_id: '', quantity: 1 }] })}
                  className="w-full gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKitDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveKit}
              disabled={!kitForm.name || !kitForm.reference}
              loading={createKit.isPending || updateKit.isPending}
            >
              {editingKit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Helpers ──

function generateCode(prefix = 'VO') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${code}`
}

function QRPreview({ code, size = 64 }) {
  const canvasRef = useRef(null)

  useState(() => {
    if (!canvasRef.current) return
    QRCodeLib.toCanvas(canvasRef.current, code, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => {})
  })

  // Use effect for rendering
  const [src, setSrc] = useState(null)
  useState(() => {
    QRCodeLib.toDataURL(code, { width: size, margin: 1 })
      .then(setSrc)
      .catch(() => {})
  })

  if (!src) {
    return (
      <div
        className="rounded-lg bg-muted flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <QrCode className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`QR: ${code}`}
      className="rounded-lg shrink-0"
      style={{ width: size, height: size }}
    />
  )
}
