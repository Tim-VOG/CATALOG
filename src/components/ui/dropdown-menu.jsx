import * as React from 'react'
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

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  )
}

function DropdownMenuTrigger({ children, asChild, ...props }) {
  const { open, setOpen } = React.useContext(DropdownContext)
  const handleClick = () => setOpen(!open)
  if (asChild) {
    return React.cloneElement(children, { onClick: handleClick, ...props })
  }
  return <button onClick={handleClick} {...props}>{children}</button>
}

function DropdownMenuContent({ className, align = 'end', children, ...props }) {
  const { open } = React.useContext(DropdownContext)
  if (!open) return null
  return (
    <div
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        align === 'end' ? 'right-0' : 'left-0',
        'top-full mt-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuItem({ className, children, onClick, ...props }) {
  const { setOpen } = React.useContext(DropdownContext)
  return (
    <div
      role="menuitem"
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted',
        className
      )}
      onClick={(e) => { onClick?.(e); setOpen(false) }}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuSeparator({ className, ...props }) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}

function DropdownMenuLabel({ className, ...props }) {
  return <div className={cn('px-2 py-1.5 text-sm font-semibold', className)} {...props} />
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel }
