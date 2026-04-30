import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowRight, ArrowLeft, Package, ShoppingCart, QrCode, Bell, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'vo-onboarding-seen'

const STEPS = [
  {
    icon: Package,
    color: 'from-blue-500 to-blue-600',
    title: 'Browse the Catalog',
    description: 'Explore all available IT equipment. Filter by category, search by name, and check real-time stock levels.',
    illustration: (Icon) => (
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 w-full rounded-lg bg-white/20 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </div>
    ),
  },
  {
    icon: ShoppingCart,
    color: 'from-emerald-500 to-emerald-600',
    title: 'Add to Cart',
    description: 'Found what you need? Add it to your cart. For phones and routers, you can choose a subscription plan and accessories.',
    illustration: () => (
      <div className="flex items-center justify-center gap-3">
        <div className="h-16 w-16 rounded-xl bg-white/20" />
        <div className="text-3xl font-bold text-white/60">→</div>
        <div className="h-12 w-12 rounded-full bg-white/25 flex items-center justify-center">
          <ShoppingCart className="h-6 w-6 text-white/80" />
        </div>
      </div>
    ),
  },
  {
    icon: Rocket,
    color: 'from-violet-500 to-violet-600',
    title: 'Submit Your Request',
    description: 'Review your cart, set pickup and return dates, then submit. The IT team will be notified instantly.',
    illustration: () => (
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-2">
          {['Pending', 'In Progress', 'Ready'].map((s, i) => (
            <div key={s} className={cn('px-3 py-1.5 rounded-full text-xs font-bold', i === 0 ? 'bg-white/30 text-white' : 'bg-white/10 text-white/40')}>
              {s}
            </div>
          ))}
        </div>
        <div className="w-32 h-1 rounded-full bg-white/20 mt-2">
          <div className="w-1/3 h-full rounded-full bg-white/60" />
        </div>
      </div>
    ),
  },
  {
    icon: Bell,
    color: 'from-amber-500 to-orange-500',
    title: 'Track Your Request',
    description: 'Follow the status of your request in real-time: Pending → In Progress → Ready. You\'ll get an email at each step.',
    illustration: () => (
      <div className="space-y-2">
        {[
          { label: 'Request received', active: true },
          { label: 'Being prepared', active: true },
          { label: 'Ready for pickup', active: false },
        ].map((item, i) => (
          <div key={i} className={cn('flex items-center gap-3 px-4 py-2 rounded-lg', item.active ? 'bg-white/20' : 'bg-white/10')}>
            <div className={cn('w-2.5 h-2.5 rounded-full', item.active ? 'bg-white' : 'bg-white/30')} />
            <span className={cn('text-sm font-medium', item.active ? 'text-white' : 'text-white/40')}>{item.label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: QrCode,
    color: 'from-cyan-500 to-teal-500',
    title: 'You\'re All Set!',
    description: 'When your equipment is ready, come pick it up at the IT desk. The admin will scan the QR code to hand it over.',
    illustration: () => (
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center">
            <QrCode className="h-10 w-10 text-white/80" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white flex items-center justify-center">
            <span className="text-emerald-500 text-sm">✓</span>
          </div>
        </div>
      </div>
    ),
  },
]

export function OnboardingTour({ forceOpen = false, onClose }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceOpen) {
      setStep(0)
      setOpen(true)
      return
    }
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      setOpen(true)
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }, [forceOpen])

  const close = useCallback(() => {
    setOpen(false)
    setStep(0)
    onClose?.()
  }, [onClose])

  const next = () => {
    if (step === STEPS.length - 1) close()
    else setStep((s) => s + 1)
  }

  const back = () => {
    if (step > 0) setStep((s) => s - 1)
  }

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={close}
      >
        <motion.div
          key={`step-${step}`}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>

          {/* Illustration area */}
          <div className={cn('relative px-8 py-10 bg-gradient-to-br', currentStep.color)}>
            <div className="flex justify-center min-h-[120px] items-center">
              {currentStep.illustration(currentStep.icon)}
            </div>
            {/* Floating icon */}
            <div className="absolute bottom-0 left-8 translate-y-1/2">
              <div className={cn('h-12 w-12 rounded-xl bg-gradient-to-br shadow-lg flex items-center justify-center', currentStep.color)}>
                <currentStep.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pt-10 pb-6">
            <h2 className="font-display font-bold text-xl">{currentStep.title}</h2>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{currentStep.description}</p>
          </div>

          {/* Footer: dots + nav */}
          <div className="px-8 pb-6 flex items-center justify-between">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    i === step ? 'w-6 h-2 bg-foreground' : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={back}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {isLast ? 'Get Started' : 'Next'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
