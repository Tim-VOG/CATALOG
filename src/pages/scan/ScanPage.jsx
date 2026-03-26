import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { QrCode, ArrowLeft, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { QRScanner } from '@/components/scan/QRScanner'
import { ScanActionCard } from '@/components/scan/ScanActionCard'
import { useQRCodeByCode, useProcessQRScan } from '@/hooks/use-qr-codes'
import { useAuth } from '@/lib/auth'
import { Link } from 'react-router-dom'

export function ScanPage() {
  const { user, profile } = useAuth()
  const [scannedCode, setScannedCode] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(true)

  const { data: qrData, isLoading: loadingQR } = useQRCodeByCode(scannedCode)
  const scanMutation = useProcessQRScan()

  const handleScan = useCallback((code) => {
    if (scannedCode) return // Prevent duplicate scans
    setScanning(false)
    setScannedCode(code)
    setResult(null)
  }, [scannedCode])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    setScanning(false)
    setScannedCode(manualCode.trim())
    setResult(null)
  }

  const handleAction = async (action) => {
    try {
      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      const response = await scanMutation.mutateAsync({
        code: scannedCode,
        action,
        userId: user?.id,
        userEmail: user?.email,
        userName: userName || user?.email,
      })
      setResult(response)
    } catch (err) {
      setResult({ success: false, error: err.message || 'An error occurred' })
    }
  }

  const handleScanAgain = () => {
    setScannedCode(null)
    setManualCode('')
    setResult(null)
    setScanning(true)
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
            <h1 className="font-display font-bold text-lg">QR Scan</h1>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-8">
        <AnimatePresence mode="wait">
          {!scannedCode ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Camera scanner */}
              {!showManual && (
                <QRScanner onScan={handleScan} scanning={scanning} />
              )}

              {/* Manual entry toggle */}
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

              {/* Instructions */}
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
              {/* Loading state */}
              {loadingQR && (
                <div className="max-w-sm mx-auto text-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Looking up equipment...</p>
                </div>
              )}

              {/* QR code not found */}
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

              {/* Action card */}
              {!loadingQR && qrData && (
                <ScanActionCard
                  qrData={qrData}
                  onAction={handleAction}
                  loading={scanMutation.isPending}
                  result={result}
                />
              )}

              {/* Scan again button */}
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
