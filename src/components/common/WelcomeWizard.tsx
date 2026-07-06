import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Sun, Moon, ArrowRight, ArrowLeft, Check, X,
  Package, UserPlus, UserMinus, Mail,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useThemeMode, useSetTheme } from '@/hooks/use-theme'
import { updateProfile } from '@/lib/api/profiles'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'vo-welcome-seen'

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

const FEATURES = [
  { icon: Package, key: 'featEquipment' },
  { icon: UserPlus, key: 'featOnboarding' },
  { icon: UserMinus, key: 'featOffboarding' },
  { icon: Mail, key: 'featMailbox' },
]

/**
 * First-login welcome wizard — a short, animated flow that greets the user,
 * lets them pick their language and theme (applied live), then drops them on
 * the Hub. Shown once (localStorage flag); re-openable via `forceOpen`.
 */
export function WelcomeWizard({ forceOpen = false, onClose }: any) {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const themeMode = useThemeMode()
  const setTheme = useSetTheme()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  // Auto-open once on first login (or whenever forceOpen is toggled).
  useEffect(() => {
    if (forceOpen) { setStep(0); setOpen(true); return }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch { /* ignore */ }
  }, [forceOpen])

  const finish = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* ignore */ }
    setOpen(false)
    onClose?.()
  }, [onClose])

  const pickLanguage = (code: string) => {
    i18n.changeLanguage(code)
    if (user?.id) updateProfile(user.id, { language: code } as any).catch(() => {})
  }

  const pickTheme = (mode: 'dark' | 'light') => setTheme(mode)

  const currentLang = (i18n.language || 'fr').startsWith('en')
    ? 'en' : (i18n.language || 'fr').startsWith('nl') ? 'nl' : 'fr'

  const firstName = profile?.first_name || (user?.email ? user.email.split('@')[0] : '') || ''

  const STEPS = 4

  if (!open) return null

  const goNext = () => (step < STEPS - 1 ? setStep((s) => s + 1) : (finish(), navigate('/')))
  const goBack = () => setStep((s) => Math.max(0, s - 1))

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={finish} />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl"
        >
          {/* Skip */}
          <button
            onClick={finish}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-white/90 backdrop-blur transition hover:bg-black/20"
            aria-label={t('welcome.skip')}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Gradient header with floating feature icons */}
          <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-accent">
            <div className="absolute inset-0 bg-dot-grid opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center gap-3">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.key}
                  initial={{ opacity: 0, y: 14, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 300, damping: 18 }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-sm"
                >
                  <f.icon className="h-6 w-6 text-white" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full bg-muted">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${((step + 1) / STEPS) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            />
          </div>

          {/* Body */}
          <div className="px-7 pb-7 pt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
              >
                {step === 0 && (
                  <div className="text-center">
                    <h2 className="text-2xl font-display font-bold tracking-tight text-foreground text-balance">
                      {t('welcome.step1Title', { name: firstName })}
                    </h2>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      {t('welcome.step1Body')}
                    </p>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 className="text-center text-xl font-display font-bold text-foreground">{t('welcome.step2Title')}</h2>
                    <p className="mx-auto mt-2 max-w-xs text-center text-sm text-muted-foreground">{t('welcome.step2Body')}</p>
                    <div className="mt-5 grid gap-2.5">
                      {LANGS.map((l) => {
                        const active = currentLang === l.code
                        return (
                          <button
                            key={l.code}
                            onClick={() => pickLanguage(l.code)}
                            className={cn(
                              'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all',
                              active
                                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
                            )}
                          >
                            <span className="text-2xl">{l.flag}</span>
                            <span className="flex-1 font-medium text-foreground">{l.label}</span>
                            {active && <Check className="h-5 w-5 text-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="text-center text-xl font-display font-bold text-foreground">{t('welcome.step3Title')}</h2>
                    <p className="mx-auto mt-2 max-w-xs text-center text-sm text-muted-foreground">{t('welcome.step3Body')}</p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {([
                        { mode: 'light' as const, icon: Sun, label: t('welcome.themeLight'), preview: 'bg-slate-100', dot: 'bg-white border-slate-300' },
                        { mode: 'dark' as const, icon: Moon, label: t('welcome.themeDark'), preview: 'bg-slate-800', dot: 'bg-slate-900 border-slate-600' },
                      ]).map((th) => {
                        const active = themeMode === th.mode
                        return (
                          <button
                            key={th.mode}
                            onClick={() => pickTheme(th.mode)}
                            className={cn(
                              'flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-all',
                              active
                                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                : 'border-border hover:border-primary/40 hover:bg-muted/40',
                            )}
                          >
                            <div className={cn('flex h-14 w-full items-center justify-center rounded-xl', th.preview)}>
                              <div className={cn('h-6 w-6 rounded-full border', th.dot)} />
                            </div>
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                              <th.icon className="h-4 w-4" /> {th.label}
                              {active && <Check className="h-4 w-4 text-primary" />}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15"
                    >
                      <Sparkles className="h-8 w-8 text-emerald-500" />
                    </motion.div>
                    <h2 className="mt-4 text-2xl font-display font-bold tracking-tight text-foreground text-balance">
                      {t('welcome.step4Title')}
                    </h2>
                    <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      {t('welcome.step4Body')}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav */}
            <div className="mt-7 flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> {t('welcome.back')}
                </Button>
              ) : (
                <button onClick={finish} className="text-sm text-muted-foreground hover:text-foreground transition">
                  {t('welcome.skip')}
                </button>
              )}

              <Button onClick={goNext} className="gap-1.5">
                {step === STEPS - 1 ? (
                  <>{t('welcome.discoverHub')} <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>{t('welcome.next')} <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
