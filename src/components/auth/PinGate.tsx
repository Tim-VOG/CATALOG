import { useState, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, ShieldCheck, Fingerprint, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import {
  isBiometricSupported, hasBiometricRegistered, registerBiometric, verifyBiometric,
} from '@/lib/biometric'

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
 * On supported devices, the user can enable biometric unlock (Touch ID /
 * Face ID / Windows Hello) and skip the PIN on that device afterwards.
 */
export function PinGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [verified, setVerified] = useState(isPinValid)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)

  const [bioSupported, setBioSupported] = useState(false)
  const [bioRegistered, setBioRegistered] = useState(hasBiometricRegistered())
  const [enableBio, setEnableBio] = useState(false)
  const [bioBusy, setBioBusy] = useState(false)
  const [bioError, setBioError] = useState(false)

  useEffect(() => { isBiometricSupported().then(setBioSupported) }, [])

  if (verified) return <>{children}</>

  const unlock = () => { setPinVerified(); setVerified(true); setPinError(false) }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin !== ADMIN_PIN) { setPinError(true); setPin(''); return }
    // Optionally enroll this device for biometric unlock (needs the gesture).
    if (enableBio && bioSupported && !bioRegistered) {
      setBioBusy(true)
      const ok = await registerBiometric()
      setBioBusy(false)
      if (ok) setBioRegistered(true)
    }
    unlock()
  }

  const handleBiometric = async () => {
    setBioBusy(true); setBioError(false)
    const ok = await verifyBiometric()
    setBioBusy(false)
    if (ok) unlock()
    else setBioError(true)
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

            {/* Biometric unlock — shown when this device has enrolled */}
            {bioSupported && bioRegistered && (
              <>
                <Button type="button" onClick={handleBiometric} disabled={bioBusy} className="w-full gap-2">
                  {bioBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                  {t('comp.pinGate.biometricUnlock')}
                </Button>
                {bioError && <p className="text-xs text-destructive">{t('comp.pinGate.biometricFailed')}</p>}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('comp.pinGate.or')}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

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

              {/* Offer to enroll this device for biometric */}
              {bioSupported && !bioRegistered && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer justify-center">
                  <input type="checkbox" checked={enableBio} onChange={(e: any) => setEnableBio(e.target.checked)} className="h-3.5 w-3.5" />
                  <Fingerprint className="h-3.5 w-3.5" />
                  {t('comp.pinGate.enableBiometric')}
                </label>
              )}

              <Button type="submit" disabled={pin.length < 4 || bioBusy} className="w-full gap-2">
                {bioBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {t('comp.pinGate.unlock')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
