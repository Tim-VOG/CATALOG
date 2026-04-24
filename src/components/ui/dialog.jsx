import * as React from 'react'
import { createPortal } from 'react-dom'
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

const DIALOG_SIZES = {
  sm: 'max-w-sm',
  default: 'max-w-lg',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
}

const DialogContent = React.forwardRef(({ className, children, size = 'default', ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(DialogContext)
  const contentRef = React.useRef(null)
  const previousFocusRef = React.useRef(null)

  // Lock body scroll when dialog is open
  React.useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.left = ''
        document.body.style.right = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [open])

  // Focus trap + restore focus on close
  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement
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

  // Focus trap
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
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }

  const titleId = React.useId()
  const descId = React.useId()

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay — dark + blur, covers everything */}
          <motion.div
            key="dialog-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
            onClick={() => onOpenChange?.(false)}
            aria-hidden="true"
          />
          {/* Centering wrapper — prevents scroll, centers content */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
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
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'relative w-full max-h-[85vh] overflow-y-auto pointer-events-auto',
                'bg-card shadow-2xl',
                'rounded-2xl p-6',
                DIALOG_SIZES[size] || DIALOG_SIZES.default,
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
                className="absolute right-3 top-3 z-10 rounded-full p-1.5 bg-muted/80 hover:bg-muted opacity-70 hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onOpenChange?.(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
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
