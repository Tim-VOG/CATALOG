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
          />
          {/* Content */}
          <motion.div
            key="dialog-content"
            ref={ref}
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg gap-4 border bg-card p-6 shadow-lg rounded-lg max-h-[85vh] overflow-y-auto',
              className
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {children}
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
              onClick={() => onOpenChange?.(false)}
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

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)

const DialogFooter = ({ className, ...props }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
DialogDescription.displayName = 'DialogDescription'

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
