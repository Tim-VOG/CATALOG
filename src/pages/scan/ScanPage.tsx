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
import { Trans, useTranslation } from 'react-i18next'

export function ScanPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [scannedCode, setScannedCode] = useState<any>(null)
  const [waitlistJoined, setWaitlistJoined] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [scanning, setScanning] = useState(true)

  // Bulk mode state
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkItems, setBulkItems] = useState<any[]>([]) // [{ code, qrData }]
  const [bulkAction, setBulkAction] = useState<any>(null) // 'take' | 'deposit'
  const [bulkDatesStep, setBulkDatesStep] = useState(false)
  const [bulkPickupDate, setBulkPickupDate] = useState('')
  const [bulkReturnDate, setBulkReturnDate] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkResults, setBulkResults] = useState<any>(null)

  const { data: qrData, isLoading: loadingQR } = useQRCodeByCode(scannedCode)
  const joinWaitlist = useJoinWaitlist()
  const scanMutation = useProcessQRScan()

  const handleScan = useCallback((code: any) => {
    if (bulkMode) {
      // In bulk mode, add to list if not already there
      if (bulkItems.some((item: any) => item.code === code)) {
        toast.info(t('user.scanPage.itemAlreadyInList'))
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
  if (bulkMode && qrData && scannedCode && !bulkItems.some((i: any) => i.code === scannedCode)) {
    setBulkItems(prev => [...prev, { code: scannedCode, qrData }])
    setScannedCode(null) // Reset for next scan
    toast.success(t('user.scanPage.addedItem', { name: qrData.product_name }))
  }

  const handleManualSubmit = (e: any) => {
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

  const handleAction = async (action: any, extra: any = {}) => {
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
    } catch (err: any) {
      setResult({ success: false, error: err.message || t('user.scanPage.genericError') })
    }
  }

  const handleBulkTakeClick = () => {
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    setBulkPickupDate(today)
    setBulkReturnDate(nextWeek)
    setBulkDatesStep(true)
  }

  const handleBulkProcess = async (action: any) => {
    setBulkProcessing(true)
    setBulkDatesStep(false)
    const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    const results: any[] = []

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
      } catch (err: any) {
        results.push({ success: false, error: err.message, code: item.code, productName: item.qrData.product_name })
      }
    }

    setBulkProcessing(false)
    setBulkResults(results)

    const successCount = results.filter((r: any) => r.success).length
    toast.success(t('user.scanPage.bulkProcessedToast', { success: successCount, total: results.length }))
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

  const removeBulkItem = (code: any) => {
    setBulkItems(prev => prev.filter((i: any) => i.code !== code))
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('user.scanPage.back')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <h1 className="font-display font-bold text-lg">
              {bulkMode ? t('user.scanPage.bulkScanTitle') : t('user.scanPage.scanTitle')}
            </h1>
          </div>
          <Button
            variant={bulkMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => bulkMode ? resetBulk() : setBulkMode(true)}
            className="gap-1.5 text-xs"
          >
            <Layers className="h-3.5 w-3.5" />
            {bulkMode ? t('user.scanPage.exit') : t('user.scanPage.bulk')}
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
                    <h3 className="font-display font-bold text-lg">{t('user.scanPage.bulkCompleteTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('user.scanPage.bulkCompleteSummary', { success: bulkResults.filter((r: any) => r.success).length, total: bulkResults.length })}
                    </p>
                  </Card>
                  <div className="space-y-1.5">
                    {bulkResults.map((r: any, i: any) => (
                      <div key={i} className={cn('flex items-center gap-3 p-2.5 rounded-lg text-sm', r.success ? 'bg-success/5' : 'bg-destructive/5')}>
                        {r.success ? <Check className="h-4 w-4 text-success shrink-0" /> : <X className="h-4 w-4 text-destructive shrink-0" />}
                        <span className="flex-1 truncate">{r.productName}</span>
                        {r.success && <span className="text-xs text-muted-foreground">{r.stock_before}→{r.stock_after}</span>}
                        {!r.success && <span className="text-xs text-destructive">{r.error}</span>}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={resetBulk} className="w-full gap-2">
                    <QrCode className="h-4 w-4" /> {t('user.scanPage.done')}
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
                      onChange={(e: any) => setManualCode(e.target.value)}
                      placeholder={t('user.scanPage.manualPlaceholderBulk')}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!manualCode.trim()} size="sm">{t('user.scanPage.add')}</Button>
                  </form>

                  {/* Scanned items list */}
                  <Card className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        {t('user.scanPage.scannedItemsLabel')}
                        <Badge variant="secondary" className="ml-2 text-[10px]">{bulkItems.length}</Badge>
                      </span>
                      {bulkItems.length > 0 && (
                        <button onClick={() => setBulkItems([])} className="text-xs text-muted-foreground hover:text-destructive">
                          {t('user.scanPage.clearAll')}
                        </button>
                      )}
                    </div>
                    {bulkItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {t('user.scanPage.emptyBulkList')}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {bulkItems.map((item: any) => (
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
                      <p className="text-sm font-semibold mb-3">{t('user.scanPage.loanPeriodTitle')}</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">{t('user.scanPage.pickupDateLabel')}</label>
                          <input type="date" value={bulkPickupDate} min={new Date().toISOString().split('T')[0]}
                            onChange={(e: any) => setBulkPickupDate(e.target.value)}
                            className="w-full h-9 px-3 mt-1 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">{t('user.scanPage.returnByLabel')}</label>
                          <input type="date" value={bulkReturnDate} min={bulkPickupDate}
                            onChange={(e: any) => setBulkReturnDate(e.target.value)}
                            className="w-full h-9 px-3 mt-1 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={() => setBulkDatesStep(false)}>{t('user.scanPage.back')}</Button>
                        <Button size="sm" onClick={() => handleBulkProcess('take')}
                          disabled={!bulkPickupDate || !bulkReturnDate || bulkProcessing} loading={bulkProcessing}
                          className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
                          {t('user.scanPage.confirmTakeAll')}
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
                        {t('user.scanPage.takeAllCount', { count: bulkItems.length })}
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
                        {t('user.scanPage.depositAllCount', { count: bulkItems.length })}
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
                  {showManual ? t('user.scanPage.useCameraInstead') : t('user.scanPage.enterCodeManually')}
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
                      onChange={(e: any) => setManualCode(e.target.value)}
                      placeholder={t('user.scanPage.manualPlaceholderSingle')}
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="submit" disabled={!manualCode.trim()}>
                      {t('user.scanPage.scanButton')}
                    </Button>
                  </motion.form>
                )}
              </div>

              <div className="max-w-sm mx-auto">
                <Card className="p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground text-center">
                    <Trans
                      i18nKey="user.scanPage.scanInstructions"
                      components={{ b: <span className="text-foreground font-medium" /> }}
                    />
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
                  <p className="text-sm text-muted-foreground">{t('user.scanPage.lookingUpEquipment')}</p>
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
                    <h3 className="font-display font-bold text-lg mb-1">{t('user.scanPage.unknownQrTitle')}</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('user.scanPage.codeLabel')} <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{scannedCode}</code>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('user.scanPage.notRegistered')}
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
                      toast.success(t('user.scanPage.waitlistJoinedToast'))
                    } catch {
                      toast.error(t('user.scanPage.waitlistError'))
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
                  {t('user.scanPage.scanAnotherItem')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
