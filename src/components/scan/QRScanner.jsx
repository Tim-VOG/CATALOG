import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QRScanner({ onScan, scanning = true }) {
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const [error, setError] = useState(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!scanning) return

    const scannerId = 'qr-scanner-region'
    let html5Qr = null

    const startScanner = async () => {
      try {
        html5Qr = new Html5Qrcode(scannerId)
        html5QrRef.current = html5Qr

        await html5Qr.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Haptic feedback on successful scan
            if (navigator.vibrate) navigator.vibrate(100)
            // Short beep sound
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)()
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain)
              gain.connect(ctx.destination)
              osc.frequency.value = 880
              gain.gain.value = 0.15
              osc.start()
              osc.stop(ctx.currentTime + 0.1)
            } catch {}
            onScan(decodedText)
          },
          () => {} // ignore errors during scanning
        )
        setStarted(true)
        setError(null)
      } catch (err) {
        setError(err?.message || 'Unable to access camera. Please grant camera permission.')
        setStarted(false)
      }
    }

    startScanner()

    return () => {
      if (html5Qr && html5Qr.isScanning) {
        html5Qr.stop().catch(() => {})
      }
    }
  }, [scanning, onScan])

  const handleRetry = async () => {
    setError(null)
    if (html5QrRef.current?.isScanning) {
      await html5QrRef.current.stop().catch(() => {})
    }
    // Re-mount by toggling state
    setStarted(false)
    setTimeout(() => {
      const scannerId = 'qr-scanner-region'
      const html5Qr = new Html5Qrcode(scannerId)
      html5QrRef.current = html5Qr
      html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => onScan(decodedText),
        () => {}
      ).then(() => {
        setStarted(true)
        setError(null)
      }).catch((err) => {
        setError(err?.message || 'Camera access failed')
      })
    }, 300)
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Scanner viewport */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-black/90">
        <div id="qr-scanner-region" ref={scannerRef} className="w-full" />

        {/* Overlay corners */}
        {started && !error && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[calc(50%-125px)] left-[calc(50%-125px)] w-[250px] h-[250px]">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-primary rounded-br-lg" />
            </div>
          </div>
        )}

        {/* Scanning indicator */}
        {started && !error && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-white font-medium">Scanning...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
          <CameraOff className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive font-medium mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Camera hint */}
      {!started && !error && (
        <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
          <Camera className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Starting camera...</span>
        </div>
      )}
    </div>
  )
}
