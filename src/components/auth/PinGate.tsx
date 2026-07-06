import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1357'
const PIN_STORAGE_KEY = 'vo-admin-pin-verified'
const PIN_EXPIRY_MS = 4 * 60 * 60 * 1000 // 4 hours

export function isPinValid(): boolean {
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

/**
 * Wraps children behind a 4-digit PIN that stays valid for 4 hours.
 * Shared by RequireAdmin and RequireStaff so the whole /admin area
 * (and the scanner) is gated once, not per page.
 */
export function PinGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [verified, setVerified] = useState(isPinValid)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  if (verified) return <>{children}</>

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      setPinVerified()
      setVerified(true)
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
              <h2 className="font-display font-bold text-lg">{t('comp.pinGate.title')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('comp.pinGate.subtitle')}</p>
            </div>
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e: any) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(false) }}
                placeholder={t('comp.pinGate.placeholder')}
                className={`text-center text-lg tracking-[0.5em] ${pinError ? 'border-destructive' : ''}`}
                autoFocus
              />
              {pinError && <p className="text-xs text-destructive">{t('comp.pinGate.error')}</p>}
              <Button type="submit" disabled={pin.length < 4} className="w-full gap-2">
                <ShieldCheck className="h-4 w-4" /> {t('comp.pinGate.unlock')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
