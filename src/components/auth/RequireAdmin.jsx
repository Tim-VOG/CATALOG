import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw, Lock, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'

const ADMIN_PIN = '1357'
const PIN_STORAGE_KEY = 'vo-admin-pin-verified'
const PIN_EXPIRY_MS = 4 * 60 * 60 * 1000 // 4 hours

function isPinValid() {
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY)
    if (!stored) return false
    const { timestamp } = JSON.parse(stored)
    return Date.now() - timestamp < PIN_EXPIRY_MS
  } catch {
    return false
  }
}

function setPinVerified() {
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify({ timestamp: Date.now() }))
}

export function RequireAdmin({ children }) {
  const { user, profile, isAdmin, loading, refreshProfile } = useAuth()
  const [retryCount, setRetryCount] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [pinVerified, setPinState] = useState(isPinValid)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  useEffect(() => {
    if (!loading && user && !profile && retryCount < 3 && !retrying) {
      const delay = 1000 * (retryCount + 1)
      const timer = setTimeout(async () => {
        setRetrying(true)
        try { await refreshProfile() } catch {}
        setRetrying(false)
        setRetryCount((c) => c + 1)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [loading, user, profile, retryCount, retrying, refreshProfile])

  if (loading || retrying || (user && !profile && retryCount < 3)) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">
          {retryCount > 0 ? `Loading profile... (attempt ${retryCount + 1}/3)` : 'Loading...'}
        </span>
      </div>
    )
  }

  if (user && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-sm text-muted-foreground">Unable to load your profile.</p>
        <Button variant="outline" className="gap-2" onClick={() => { setRetryCount(0); setRetrying(false) }}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  // PIN gate
  if (!pinVerified) {
    const handlePinSubmit = (e) => {
      e.preventDefault()
      if (pin === ADMIN_PIN) {
        setPinVerified()
        setPinState(true)
        setPinError(false)
      } else {
        setPinError(true)
        setPin('')
      }
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-80">
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg">Admin Access</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter the admin PIN to continue</p>
              </div>
              <form onSubmit={handlePinSubmit} className="space-y-3">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(false) }}
                  placeholder="Enter PIN"
                  className={`text-center text-lg tracking-[0.5em] ${pinError ? 'border-destructive' : ''}`}
                  autoFocus
                />
                {pinError && <p className="text-xs text-destructive">Incorrect PIN</p>}
                <Button type="submit" disabled={pin.length < 4} className="w-full gap-2">
                  <ShieldCheck className="h-4 w-4" /> Unlock
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return children
}
