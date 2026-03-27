import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import QRCodeLib from 'qrcode'
import {
  QrCode, ArrowUpFromLine, ArrowDownToLine, Package, Layers,
  CheckCircle2, XCircle, RotateCcw, Download, Printer, FlaskConical,
  ChevronDown, ChevronUp, Clipboard, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { useQRCodes, useProcessQRScan } from '@/hooks/use-qr-codes'
import { useScanLogs } from '@/hooks/use-qr-codes'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

// All the test QR codes from the seed data (VO- convention)
const TEST_CODES = [
  { code: 'VO-IPHONE20-001', label: 'iPhone 20 #1', hasKit: true },
  { code: 'VO-IPHONE20PROMAX-001', label: 'iPhone 20 Pro Max #1', hasKit: true },
  { code: 'VO-IPHONE15PRO-001', label: 'iPhone 15 Pro #1', hasKit: true },
  { code: 'VO-ROUTER5G-001', label: '5G Router #1', hasKit: true },
  { code: 'VO-MACBOOKPRO14-001', label: 'MacBook Pro 14" #1', hasKit: true },
  { code: 'VO-DELLLATITUDE-001', label: 'Dell Latitude 5540 #1', hasKit: true },
  { code: 'VO-DELLMONITOR27-001', label: 'Dell 27" Monitor #1', hasKit: true },
  { code: 'VO-IPADPRO11-001', label: 'iPad Pro 11" #1', hasKit: true },
  { code: 'VO-HPLASERJET-001', label: 'HP LaserJet Pro #1', hasKit: false },
  { code: 'VO-CLICKER-001', label: 'Presentation Clicker #1', hasKit: false },
]

export function AdminQRTestPage() {
  const { user, profile } = useAuth()
  const { data: qrCodes, isLoading } = useQRCodes()
  const { data: recentLogs, refetch: refetchLogs } = useScanLogs({ limit: 10 })
  const scanMutation = useProcessQRScan()

  const [selectedCode, setSelectedCode] = useState(null)
  const [result, setResult] = useState(null)
  const [showLogs, setShowLogs] = useState(true)
  const [qrImages, setQrImages] = useState({})
  const [copiedCode, setCopiedCode] = useState(null)

  // Find matching QR data from DB for the selected code
  const selectedQR = qrCodes?.find(qr => qr.code === selectedCode)

  // Generate QR images for all test codes
  useEffect(() => {
    const generateImages = async () => {
      const images = {}
      for (const tc of TEST_CODES) {
        try {
          images[tc.code] = await QRCodeLib.toDataURL(tc.code, {
            width: 180,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          })
        } catch { /* ignore */ }
      }
      setQrImages(images)
    }
    generateImages()
  }, [])

  const handleAction = async (action) => {
    if (!selectedCode) return
    try {
      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      const response = await scanMutation.mutateAsync({
        code: selectedCode,
        action,
        userId: user?.id,
        userEmail: user?.email,
        userName: userName || user?.email,
        pickupDate: action === 'take' ? today : null,
        expectedReturnDate: action === 'take' ? nextWeek : null,
      })
      setResult(response)
      refetchLogs()
      if (response.success) {
        toast.success(`${action === 'take' ? 'Taken' : 'Deposited'}: ${response.product_name}`)
      } else {
        toast.error(response.error)
      }
    } catch (err) {
      setResult({ success: false, error: err.message })
      toast.error(err.message)
    }
  }

  const resetTest = () => {
    setSelectedCode(null)
    setResult(null)
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const downloadQR = async (code, label) => {
    const url = await QRCodeLib.toDataURL(code, { width: 400, margin: 2 })
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${label || code}.png`
    a.click()
  }

  const printAllQR = () => {
    const items = TEST_CODES.filter(tc => qrImages[tc.code])
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Codes - Test Set</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; flex-wrap: wrap; gap: 16px; padding: 20px; }
        .card { text-align: center; border: 1px solid #ddd; padding: 12px; border-radius: 8px; width: 200px; }
        .card img { width: 160px; height: 160px; }
        .label { font-weight: 700; margin-top: 8px; font-size: 13px; }
        .code { color: #666; font-size: 10px; margin-top: 4px; font-family: monospace; }
        .kit { color: #06b6d4; font-size: 10px; margin-top: 2px; }
        @media print { body { gap: 8px; padding: 10px; } .card { break-inside: avoid; } }
      </style></head><body>
      ${items.map(tc => `
        <div class="card">
          <img src="${qrImages[tc.code]}" />
          <div class="label">${tc.label}</div>
          <div class="code">${tc.code}</div>
          ${tc.hasKit ? '<div class="kit">Kit</div>' : '<div class="kit">Standalone</div>'}
        </div>
      `).join('')}
      </body></html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  if (isLoading) return <PageLoading />

  // Check which test codes exist in DB
  const registeredCodes = new Set(qrCodes?.map(qr => qr.code) || [])
  const missingCodes = TEST_CODES.filter(tc => !registeredCodes.has(tc.code))

  return (
    <>
      <AdminPageHeader title="QR Test Lab" description="Test the full QR scan → action → stock update flow">
        <Button variant="outline" size="sm" onClick={printAllQR} className="gap-2">
          <Printer className="h-3.5 w-3.5" />
          Print All QR
        </Button>
      </AdminPageHeader>

      {/* Warning if seed data not applied */}
      {missingCodes.length > 0 && (
        <Card className="mb-6 border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FlaskConical className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Test data not found in database</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run the migration <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">035_qr_test_seed_data.sql</code> in
                  your Supabase SQL Editor to create the test product and QR codes.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Missing: {missingCodes.map(tc => tc.code).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: QR Code selector ── */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            1. Select a QR Code
          </h2>
          <div className="space-y-2">
            {TEST_CODES.map((tc) => {
              const exists = registeredCodes.has(tc.code)
              const isSelected = selectedCode === tc.code
              const dbData = qrCodes?.find(qr => qr.code === tc.code)
              return (
                <Card
                  key={tc.code}
                  className={cn(
                    'cursor-pointer transition-all',
                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/30',
                    !exists && 'opacity-40 pointer-events-none'
                  )}
                  onClick={() => { setSelectedCode(tc.code); setResult(null) }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {qrImages[tc.code] ? (
                        <img src={qrImages[tc.code]} alt={tc.code} className="w-12 h-12 rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <QrCode className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate">{tc.label}</span>
                          {tc.hasKit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">Kit</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[10px] text-muted-foreground">{tc.code}</code>
                          <button onClick={(e) => { e.stopPropagation(); copyCode(tc.code) }} className="text-muted-foreground hover:text-foreground">
                            {copiedCode === tc.code ? <Check className="h-3 w-3 text-success" /> : <Clipboard className="h-3 w-3" />}
                          </button>
                        </div>
                        {dbData && (
                          <div className="flex items-center gap-2 mt-1">
                            {dbData.category_name && <CategoryBadge name={dbData.category_name} color={dbData.category_color} />}
                            <span className="text-xs text-muted-foreground">Stock: <strong>{dbData.product_stock}</strong></span>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={(e) => { e.stopPropagation(); downloadQR(tc.code, tc.label) }}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* ── Center: Action panel ── */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            2. Choose Action
          </h2>

          {!selectedCode ? (
            <Card className="p-8 text-center bg-muted/30">
              <QrCode className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Select a QR code from the list to simulate a scan</p>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Product info */}
                  {selectedQR && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {selectedQR.product_image ? (
                            <img src={selectedQR.product_image} alt="" className="w-14 h-14 rounded-xl object-cover" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-display font-bold">{selectedQR.product_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {selectedQR.category_name && <CategoryBadge name={selectedQR.category_name} color={selectedQR.category_color} />}
                              <span className="text-sm">Stock: <strong className="text-lg">{selectedQR.product_stock}</strong></span>
                            </div>
                            {selectedQR.kit_name && (
                              <div className="flex items-center gap-1 text-xs text-accent mt-1">
                                <Layers className="h-3 w-3" />
                                {selectedQR.kit_name} ({selectedQR.kit_reference})
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleAction('take')}
                      disabled={scanMutation.isPending || (selectedQR?.product_stock <= 0)}
                      className={cn(
                        'h-20 flex-col gap-2 rounded-2xl text-base font-bold',
                        'bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
                        'text-white shadow-lg shadow-orange-500/25'
                      )}
                      loading={scanMutation.isPending}
                    >
                      <ArrowUpFromLine className="h-6 w-6" />
                      Take (-1)
                    </Button>
                    <Button
                      onClick={() => handleAction('deposit')}
                      disabled={scanMutation.isPending}
                      className={cn(
                        'h-20 flex-col gap-2 rounded-2xl text-base font-bold',
                        'bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
                        'text-white shadow-lg shadow-emerald-500/25'
                      )}
                      loading={scanMutation.isPending}
                    >
                      <ArrowDownToLine className="h-6 w-6" />
                      Deposit (+1)
                    </Button>
                  </div>

                  {selectedQR?.product_stock <= 0 && (
                    <p className="text-xs text-destructive text-center">Stock at 0 — cannot take. Deposit first.</p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Result card */}
                  <Card className={cn(
                    'p-6 text-center border-2',
                    result.success ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'
                  )}>
                    {result.success ? (
                      <>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <CheckCircle2 className="h-14 w-14 mx-auto text-success mb-3" />
                        </motion.div>
                        <h3 className="text-lg font-display font-bold">
                          {result.action === 'take' ? 'Item Taken' : 'Item Deposited'}
                        </h3>
                        <p className="text-sm text-muted-foreground">{result.product_name}</p>
                        <div className="flex items-center justify-center gap-6 mt-4">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Before</div>
                            <div className="text-2xl font-bold">{result.stock_before}</div>
                          </div>
                          <div className={cn('text-3xl font-bold', result.action === 'take' ? 'text-orange-500' : 'text-emerald-500')}>
                            {result.action === 'take' ? '-1' : '+1'}
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">After</div>
                            <div className="text-2xl font-bold">{result.stock_after}</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-14 w-14 mx-auto text-destructive mb-3" />
                        <h3 className="text-lg font-display font-bold">Error</h3>
                        <p className="text-sm text-muted-foreground">{result.error}</p>
                      </>
                    )}
                  </Card>

                  <Button variant="outline" onClick={resetTest} className="w-full gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Test Another
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* ── Right: Recent scan logs ── */}
        <div className="lg:col-span-1 space-y-3">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide w-full"
          >
            3. Scan Logs (Live)
            {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showLogs && (
            <div className="space-y-2">
              {!recentLogs?.length ? (
                <Card className="p-6 text-center bg-muted/30">
                  <p className="text-sm text-muted-foreground">No scan activity yet. Test an action!</p>
                </Card>
              ) : (
                recentLogs.map((log) => (
                  <Card key={log.id} className="hover:border-primary/10 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          log.action === 'take' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                        )}>
                          {log.action === 'take' ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                              log.action === 'take' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                            )}>
                              {log.action}
                            </span>
                            <span className="text-xs font-medium truncate">{log.product_name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{log.user_name || log.user_email}</span>
                            <span>{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                            <span className="font-mono">{log.stock_before}→{log.stock_after}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Reference table ── */}
      <div className="mt-10">
        <h2 className="font-display font-semibold text-lg mb-4">Product Reference Map</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 font-semibold">QR Code</th>
                  <th className="text-left p-3 font-semibold">Product</th>
                  <th className="text-left p-3 font-semibold">Kit</th>
                  <th className="text-left p-3 font-semibold">Type</th>
                  <th className="text-center p-3 font-semibold">Stock</th>
                </tr>
              </thead>
              <tbody>
                {TEST_CODES.map((tc) => {
                  const dbData = qrCodes?.find(qr => qr.code === tc.code)
                  return (
                    <tr key={tc.code} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{tc.code}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {dbData?.product_name || tc.label}
                          {dbData?.category_name && <CategoryBadge name={dbData.category_name} color={dbData.category_color} />}
                        </div>
                      </td>
                      <td className="p-3">
                        {tc.hasKit ? (
                          <span className="text-xs px-2 py-1 rounded-md bg-accent/10 text-accent font-medium">
                            {dbData?.kit_name || 'Kit'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Standalone</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {tc.hasKit ? 'Product + Accessories' : 'Single Item'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          'text-sm font-bold',
                          (dbData?.product_stock ?? 0) === 0 ? 'text-destructive' :
                          (dbData?.product_stock ?? 0) <= 2 ? 'text-warning' : 'text-success'
                        )}>
                          {dbData?.product_stock ?? '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
