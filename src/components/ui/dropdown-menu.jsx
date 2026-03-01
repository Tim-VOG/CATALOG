import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'

const DropdownContext = React.createContext({})

function DropdownMenu({ children }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef(null)

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ESC key to close
  React.useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  )
}

function DropdownMenuTrigger({ children, asChild, ...props }) {
  const { open, setOpen } = React.useContext(DropdownContext)
  const handleClick = () => setOpen(!open)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
    }
  }
  const triggerProps = {
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    ...props,
  }
  if (asChild) {
    return React.cloneElement(children, triggerProps)
  }
  return <button {...triggerProps}>{children}</button>
}

function DropdownMenuContent({ className, align = 'end', children, ...props }) {
  const { open, setOpen } = React.useContext(DropdownContext)
  const contentRef = React.useRef(null)

  // Focus first item when opened
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const el = contentRef.current
        if (!el) return
        const first = el.querySelector('[role="menuitem"]')
        first?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Arrow key navigation within menu
  const handleKeyDown = (e) => {
    const el = contentRef.current
    if (!el) return
    const items = Array.from(el.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])'))
    const current = items.indexOf(document.activeElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = current < items.length - 1 ? current + 1 : 0
      items[next]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = current > 0 ? current - 1 : items.length - 1
      items[prev]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          role="menu"
          aria-orientation="vertical"
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'absolute z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border/50 bg-popover/95 backdrop-blur-md p-1 text-popover-foreground shadow-float',
            align === 'end' ? 'right-0' : 'left-0',
            'top-full mt-1',
            className
          )}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DropdownMenuItem({ className, children, onClick, disabled, ...props }) {
  const { setOpen } = React.useContext(DropdownContext)
  const handleClick = (e) => {
    if (disabled) return
    onClick?.(e)
    setOpen(false)
  }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e)
    }
  }
  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none',
        'transition-colors duration-150',
        'hover:bg-muted/80 focus:bg-muted/80 focus-visible:ring-1 focus-visible:ring-ring',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuSeparator({ className, ...props }) {
  return (
    <div
      role="separator"
      className={cn('-mx-1 my-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent', className)}
      {...props}
    />
  )
}

function DropdownMenuLabel({ className, ...props }) {
  return <div className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...props} />
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel }
