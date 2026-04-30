import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowRight, ArrowLeft, Package, ShoppingCart, QrCode, Bell, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'vo-onboarding-seen'

const STEPS = [
  {
    icon: Package,
    color: 'from-blue-500 to-indigo-600',
    title: 'Browse the Catalog',
    description: 'Explore all available IT equipment. Filter by category, search by name, and check real-time stock levels.',
    illustration: () => (
      <div className="grid grid-cols-3 gap-2.5">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
            className="h-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10"
          />
        ))}
        <motion.div
          className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Package className="h-5 w-5 text-white/80" />
        </motion.div>
      </div>
    ),
  },
  {
    icon: ShoppingCart,
    color: 'from-emerald-500 to-teal-600',
    title: 'Add to Cart',
    description: 'Found what you need? Add it to your cart with one click. For phones and routers, choose a plan and accessories.',
    illustration: () => (
      <div className="flex items-center justify-center gap-5">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10"
        />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
          className="text-white/40"
        >
          <ArrowRight className="h-6 w-6" />
        </motion.div>
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="relative h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/10"
        >
          <ShoppingCart className="h-6 w-6 text-white/80" />
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-emerald-600 text-[10px] font-bold flex items-center justify-center"
          >
            1
          </motion.span>
        </motion.div>
      </div>
    ),
  },
  {
    icon: Rocket,
    color: 'from-violet-500 to-purple-600',
    title: 'Submit Your Request',
    description: 'Review your cart, set pickup and return dates, then submit. The IT team gets notified instantly.',
    illustration: () => (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {['Cart', 'Details', 'Review'].map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-semibold border',
                i === 2 ? 'bg-white/25 text-white border-white/30' : 'bg-white/8 text-white/50 border-white/10'
              )}
            >
              {s}
            </motion.div>
          ))}
        </div>
        <motion.div
          className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="h-full rounded-full bg-white/50"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }}
          />
        </motion.div>
      </div>
    ),
  },
  {
    icon: Bell,
    color: 'from-amber-500 to-orange-600',
    title: 'Track Your Request',
    description: 'Follow your request in real-time: Pending → In Progress → Ready. You\'ll receive an email at each step.',
    illustration: () => (
      <div className="space-y-2 w-full max-w-[240px] mx-auto">
        {[
          { label: 'Request received', done: true },
          { label: 'Being prepared', done: true },
          { label: 'Ready for pickup', done: false },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2, type: 'spring', stiffness: 200 }}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl border',
              item.done ? 'bg-white/15 border-white/20' : 'bg-white/5 border-white/8'
            )}
          >
            <motion.div
              className={cn('w-3 h-3 rounded-full', item.done ? 'bg-white' : 'bg-white/25')}
              animate={item.done ? { scale: [1, 1.3, 1] } : {}}
              transition={{ delay: i * 0.2 + 0.3, duration: 0.3 }}
            />
            <span className={cn('text-sm font-medium', item.done ? 'text-white' : 'text-white/35')}>{item.label}</span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    icon: QrCode,
    color: 'from-cyan-500 to-blue-600',
    title: 'You\'re All Set!',
    description: 'When your equipment is ready, come to the IT desk. The admin will scan the QR code and hand it over. Easy!',
    illustration: () => (
      <div className="flex items-center justify-center">
        <motion.div
          className="relative"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="h-24 w-24 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/15 flex items-center justify-center">
            <QrCode className="h-12 w-12 text-white/70" />
          </div>
          <motion.div
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 500 }}
          >
            <span className="text-emerald-500 text-lg font-bold">✓</span>
          </motion.div>
          <motion.div
            className="absolute -bottom-1 -left-1 h-4 w-4 rounded-full bg-cyan-300/40"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -top-1 -left-3 h-3 w-3 rounded-full bg-blue-300/30"
            animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          />
        </motion.div>
      </div>
    ),
  },
]

export function OnboardingTour({ forceOpen = false, onClose }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (forceOpen) {
      setStep(0)
      setDirection(1)
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
    if (step === STEPS.length - 1) { close(); return }
    setDirection(1)
    setStep((s) => s + 1)
  }

  const back = () => {
    if (step > 0) { setDirection(-1); setStep((s) => s - 1) }
  }

  const goTo = (i) => {
    setDirection(i > step ? 1 : -1)
    setStep(i)
  }

  const currentStep = STEPS[step]
  const isLast = step === STEPS.length - 1

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  }

  if (!open) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="onboarding-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-lg"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[420px] bg-card rounded-[20px] overflow-hidden"
            style={{ boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35), 0 10px 20px -5px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={close}
              className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-black/15 hover:bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* Illustration */}
            <div className={cn('relative overflow-hidden', `bg-gradient-to-br ${currentStep.color}`)}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative px-10 py-12 min-h-[180px] flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.85 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
                    className="w-full"
                  >
                    {currentStep.illustration()}
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Bottom gradient fade */}
              <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

              {/* Floating icon badge */}
              <motion.div
                className="absolute bottom-0 left-8 translate-y-1/2 z-10"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
                key={`icon-${step}`}
              >
                <div className={cn(
                  'h-12 w-12 rounded-[14px] flex items-center justify-center shadow-lg bg-gradient-to-br',
                  currentStep.color
                )} style={{ boxShadow: '0 8px 20px -4px rgba(0,0,0,0.3)' }}>
                  <currentStep.icon className="h-6 w-6 text-white" />
                </div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="px-8 pt-10 pb-4">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h2 className="font-display font-bold text-[22px] tracking-tight text-foreground">
                    {currentStep.title}
                  </h2>
                  <p className="text-muted-foreground text-[14px] mt-2.5 leading-[1.65]">
                    {currentStep.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-8 pb-7 pt-3 flex items-center justify-between">
              {/* Dots */}
              <div className="flex items-center gap-2 h-8">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className="flex items-center justify-center h-8"
                  >
                    <motion.div
                      className="rounded-full"
                      animate={{
                        width: i === step ? 24 : 8,
                        height: 8,
                        backgroundColor: i === step ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                        opacity: i === step ? 1 : 0.25,
                      }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </button>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-1.5">
                {step > 0 && (
                  <motion.button
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={back}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-muted/50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </motion.button>
                )}
                <motion.button
                  onClick={next}
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold transition-shadow hover:shadow-lg hover:shadow-foreground/20"
                >
                  {isLast ? 'Get Started' : 'Next'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
