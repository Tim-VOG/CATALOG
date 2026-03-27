import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { QrCode, ArrowLeft, Keyboard, Layers, X, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRScanner } from '@/components/scan/QRScanner'
import { ScanActionCard } from '@/components/scan/ScanActionCard'
import { useQRCodeByCode, useProcessQRScan } from '@/hooks/use-qr-codes'
import { useJoinWaitlist } from '@/hooks/use-qr-reservations'
import { useAuth } from '@/lib/auth'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ScanPage() {
  const { user, profile } = useAuth()
  const [scannedCode, setScannedCode] = useState(null)
  const [waitlistJoined, setWaitlistJoined] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(true)

  // Bulk mode state
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkItems, setBulkItems] = useState([]) // [{ code, qrData }]
  const [bulkAction, setBulkAction] = useState(null) // 'take' | 'deposit'
  const [bulkDatesStep, setBulkDatesStep] = useState(false)
  const [bulkPickupDate, setBulkPickupDate] = useState('')
  const [bulkReturnDate, setBulkReturnDate] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResults, setBulkResults] = useState(null)

  const { data: qrData, isLoading: loadingQR } = useQRCodeByCode(scannedCode)
  const joinWaitlist = useJoinWaitlist()
  const scanMutation = useProcessQRScan()

  const handleScan = useCallback((code) => {
    if (bulkMode) {
      // In bulk mode, add to list if not already there
      if (bulkItems.some(item => item.code === code)) {
        toast.info('Item already in list')
        return
      }
      setScannedCode(code) // Trigger lookup
      return
    }
    if (scannedCode) return
    setScanning(false)
    setScannedCode(code)
    setResult(null)
  }, [scannedCode, bulkMode, bulkItems])

  // When in bulk mode and qrData arrives, add to list
  if (bulkMode && qrData && scannedCode && !bulkItems.some(i => i.code === scannedCode)) {
    setBulkItems(prev => [...prev, { code: scannedCode, qrData }])
    setScannedCode(null) // Reset for next scan
    toast.success(`Added: ${qrData.product_name}`)
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    if (bulkMode) {
      handleScan(manualCode.trim())
      setManualCode('')
      return
    }
    setScanning(false)
    setScannedCode(manualCode.trim())
    setResult(null)
  }

  const handleAction = async (action, extra = {}) => {
    try {
      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      const response = await scanMutation.mutateAsync({
        code: scannedCode,
        action,
        userId: user?.id,
        userEmail: user?.email,
        userName: userName || user?.email,
        pickupDate: extra.pickupDate || null,
        expectedReturnDate: extra.returnDate || null,
      })
      if (extra.pickupDate) response.pickupDate = extra.pickupDate
      if (extra.returnDate) response.returnDate = extra.returnDate
      setResult(response)
    } catch (err) {
      setResult({ success: false, error: err.message || 'An error occurred' })
    }
  }

  const handleBulkTakeClick = () => {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    setBulkPickupDate(today)
    setBulkReturnDate(nextWeek)
    setBulkDatesStep(true)
  }

  const handleBulkProcess = async (action) => {
    setBulkProcessing(true)
    setBulkDatesStep(false)
    const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    const results = []

    for (const item of bulkItems) {
      try {
        const response = await scanMutation.mutateAsync({
          code: item.code,
          action,
          userId: user?.id,
          userEmail: user?.email,
          userName: userName || user?.email,
          pickupDate: action === 'take' ? bulkPickupDate : null,
          expectedReturnDate: action === 'take' ? bulkReturnDate : null,
        })
        results.push({ ...response, code: item.code, productName: item.qrData.product_name })
      } catch (err) {
        results.push({ success: false, error: err.message, code: item.code, productName: item.qrData.product_name })
      }
    }

    setBulkProcessing(false)
    setBulkResults(results)

    const successCount = results.filter(r => r.success).length
    toast.success(`${successCount}/${results.length} items processed`)
  }

  const handleScanAgain = () => {
    setScannedCode(null)
    setManualCode('')
    setResult(null)
    setScanning(true)
    setWaitlistJoined(false)
  }

  const resetBulk = () => {
    setBulkMode(false)
    setBulkItems([])
    setBulkAction(null)
    setBulkResults(null)
    setBulkDatesStep(false)
    setBulkPickupDate('')
    setBulkReturnDate('')
    setScannedCode(null)
  }

  const removeBulkItem = (code) => {
    setBulkItems(prev => prev.filter(i => i.code !== code))
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h1 className="font-display font-bold text-lg">
              {bulkMode ? 'Bulk Scan' : 'QR Scan'}
            </h1>
          </div>
          <Button
            variant={bulkMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => bulkMode ? resetBulk() : setBulkMode(true)}
            className="gap-1.5 text-xs"
          >
            <Layers className="h-3.5 w-3.5" />
            {bulkMode ? 'Exit' : 'Bulk'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">
          {/* ── BULK MODE ── */}
          {bulkMode ? (
            <motion.div
              key="bulk"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 max-w-sm mx-auto"
            >
              {/* Bulk results */}
              {bulkResults ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <Card className="p-4 text-center border-2 border-success/30 bg-success/5">
                    <Check className="h-10 w-10 mx-auto text-success mb-2" />
                    <h3 className="font-display font-bold text-lg">Bulk Complete</h3>
                    <p className="text-sm text-muted-foreground">
                      {bulkResults.filter(r => r.success).length} of {bulkResults.length} items processed
                    </p>
                  </Card>
                  <div className="space-y-1.5">
                    {bulkResults.map((r, i) => (
                      <div key={i} className={cn('flex items-center gap-3 p-2.5 rounded-lg text-sm', r.success ? 'bg-success/5' : 'bg-destructive/5')}>
                        {r.success ? <Check className="h-4 w-4 text-success shrink-0" /> : <X className="h-4 w-4 text-destructive shrink-0" />}
                        <span className="flex-1 truncate">{r.productName}</span>
                        {r.success && <span className="text-xs text-muted-foreground">{r.stock_before}→{r.stock_after}</span>}
                        {!r.success && <span className="text-xs text-destructive">{r.error}</span>}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={resetBulk} className="w-full gap-2">
                    <QrCode className="h-4 w-4" /> Done
                  </Button>
                </motion.div>
              ) : (
                <>
                  {/* Scanner (always on in bulk mode) */}
                  <QRScanner onScan={handleScan} scanning={true} />

                  {/* Manual entry */}
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <Input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Or enter code manually..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!manualCode.trim()} size="sm">Add</Button>
                  </form>

                  {/* Scanned items list */}
                  <Card className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        Scanned Items
                        <Badge variant="secondary" className="ml-2 text-[10px]">{bulkItems.length}</Badge>
                      </span>
                      {bulkItems.length > 0 && (
                        <button onClick={() => setBulkItems([])} className="text-xs text-muted-foreground hover:text-destructive">
                          Clear all
                        </button>
                      )}
                    </div>
                    {bulkItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Scan items to add them to the list
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {bulkItems.map((item) => (
                          <div key={item.code} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                            <span className="text-sm flex-1 truncate">{item.qrData.product_name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{item.code}</span>
                            <button onClick={() => removeBulkItem(item.code)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Bulk dates step (before Take All) */}
                  {bulkDatesStep && bulkItems.length > 0 && (
                    <Card className="p-4 border-primary/20">
                      <p className="text-sm font-semibold mb-3">Loan period for all items</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Pickup date</label>
                          <input type="date" value={bulkPickupDate} min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setBulkPickupDate(e.target.value)}
                            className="w-full h-9 px-3 mt-1 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Return by</label>
                          <input type="date" value={bulkReturnDate} min={bulkPickupDate}
                            onChange={(e) => setBulkReturnDate(e.target.value)}
                            className="w-full h-9 px-3 mt-1 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={() => setBulkDatesStep(false)}>Back</Button>
                        <Button size="sm" onClick={() => handleBulkProcess('take')}
                          disabled={!bulkPickupDate || !bulkReturnDate || bulkProcessing} loading={bulkProcessing}
                          className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
                          Confirm Take All
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Bulk action buttons */}
                  {bulkItems.length > 0 && !bulkDatesStep && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleBulkTakeClick}
                        disabled={bulkProcessing}
                        loading={bulkProcessing}
                        className={cn(
                          'h-14 flex-col gap-1 rounded-2xl font-semibold',
                          'bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
                          'text-white shadow-lg shadow-orange-500/25'
                        )}
                      >
                        Take All ({bulkItems.length})
                      </Button>
                      <Button
                        onClick={() => handleBulkProcess('deposit')}
                        disabled={bulkProcessing}
                        loading={bulkProcessing}
                        className={cn(
                          'h-14 flex-col gap-1 rounded-2xl font-semibold',
                          'bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
                          'text-white shadow-lg shadow-emerald-500/25'
                        )}
                      >
                        Deposit All ({bulkItems.length})
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>

          /* ── SINGLE SCAN MODE ── */
          ) : !scannedCode ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {!showManual && (
                <QRScanner onScan={handleScan} scanning={scanning} />
              )}

              <div className="max-w-sm mx-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManual(!showManual)}
                  className="w-full gap-2 text-muted-foreground"
                >
                  <Keyboard className="h-4 w-4" />
                  {showManual ? 'Use camera instead' : 'Enter code manually'}
                </Button>

                {showManual && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    onSubmit={handleManualSubmit}
                    className="mt-3 flex gap-2"
                  >
                    <Input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Enter QR code..."
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="submit" disabled={!manualCode.trim()}>
                      Scan
                    </Button>
                  </motion.form>
                )}
              </div>

              <div className="max-w-sm mx-auto">
                <Card className="p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground text-center">
                    Point your camera at a QR code on the equipment to scan it.
                    You'll then choose to <span className="text-foreground font-medium">take</span> or <span className="text-foreground font-medium">deposit</span> the item.
                  </p>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="action"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {loadingQR && (
                <div className="max-w-sm mx-auto text-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Looking up equipment...</p>
                </div>
              )}

              {!loadingQR && !qrData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-sm mx-auto text-center py-8"
                >
                  <Card className="p-6 border-destructive/20 bg-destructive/5">
                    <QrCode className="h-12 w-12 mx-auto text-destructive mb-3" />
                    <h3 className="font-display font-bold text-lg mb-1">Unknown QR Code</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Code: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{scannedCode}</code>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This QR code is not registered in the system.
                    </p>
                  </Card>
                </motion.div>
              )}

              {!loadingQR && qrData && (
                <ScanActionCard
                  qrData={qrData}
                  onAction={handleAction}
                  loading={scanMutation.isPending}
                  result={result}
                  waitlistJoined={waitlistJoined}
                  onJoinWaitlist={async () => {
                    try {
                      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
                      await joinWaitlist.mutateAsync({
                        productId: qrData.product_id,
                        userId: user?.id,
                        userEmail: user?.email,
                        userName: userName || user?.email,
                      })
                      setWaitlistJoined(true)
                      toast.success('You will be notified when this item is available')
                    } catch {
                      toast.error('Could not join waitlist')
                    }
                  }}
                />
              )}

              <div className="max-w-sm mx-auto">
                <Button
                  variant="outline"
                  onClick={handleScanAgain}
                  className="w-full gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  Scan another item
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
