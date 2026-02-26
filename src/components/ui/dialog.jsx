import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const DialogContext = React.createContext({})

function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({ children, asChild, ...props }) {
  const { onOpenChange } = React.useContext(DialogContext)
  if (asChild) {
    return React.cloneElement(children, { onClick: () => onOpenChange?.(true), ...props })
  }
  return <button onClick={() => onOpenChange?.(true)} {...props}>{children}</button>
}

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(DialogContext)
  const contentRef = React.useRef(null)
  const previousFocusRef = React.useRef(null)

  // Focus trap + restore focus on close
  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement
      // Delay to allow animation to start
      const timer = setTimeout(() => {
        const el = contentRef.current
        if (!el) return
        const focusable = el.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [open])

  // ESC key handler
  React.useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onOpenChange?.(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  // Focus trap — keep Tab within dialog
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return
    const el = contentRef.current
    if (!el) return
    const focusables = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const titleId = React.useId()
  const descId = React.useId()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="dialog-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/80"
            onClick={() => onOpenChange?.(false)}
            aria-hidden="true"
          />
          {/* Content */}
          <motion.div
            key="dialog-content"
            ref={(node) => {
              contentRef.current = node
              if (typeof ref === 'function') ref(node)
              else if (ref) ref.current = node
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg gap-4 border bg-card p-6 shadow-lg max-h-[85vh] overflow-y-auto',
              'rounded-lg max-sm:max-w-none max-sm:h-full max-sm:max-h-full max-sm:rounded-none',
              className
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            {...props}
          >
            <DialogIdContext.Provider value={{ titleId, descId }}>
              {children}
            </DialogIdContext.Provider>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => onOpenChange?.(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
DialogContent.displayName = 'DialogContent'

const DialogIdContext = React.createContext({})

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)

const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => {
  const { titleId } = React.useContext(DialogIdContext)
  return (
    <h2 ref={ref} id={titleId} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
})
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => {
  const { descId } = React.useContext(DialogIdContext)
  return (
    <p ref={ref} id={descId} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
})
DialogDescription.displayName = 'DialogDescription'

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
