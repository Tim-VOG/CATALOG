import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CalendarRange, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DateRangeCalendar } from './DateRangeCalendar'
import { cn } from '@/lib/utils'

const formatDate = (s) => {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function CompactDateBar({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const hasRange = startDate && endDate

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null, null)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      {/* Compact bar */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200',
          'bg-muted/40 hover:bg-muted/60',
          open && 'ring-2 ring-primary/30 border-primary/30'
        )}
      >
        <CalendarRange className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">Loan Period</span>
        <div className="flex-1 flex items-center justify-center gap-2">
          {hasRange ? (
            <>
              <span className="text-sm font-semibold text-foreground bg-background/60 px-2.5 py-1 rounded-md">
                {formatDate(startDate)}
              </span>
              <span className="text-xs text-muted-foreground">&rarr;</span>
              <span className="text-sm font-semibold text-foreground bg-background/60 px-2.5 py-1 rounded-md">
                {formatDate(endDate)}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground/70 italic">Select pickup & return dates</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasRange && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClear}
              aria-label="Clear dates"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Dropdown calendar */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ originY: 0 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-[260px]"
          >
            <Card className="p-3 shadow-card border-primary/10">
              <DateRangeCalendar
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  onChange(start, end)
                  // Auto-close when both dates selected
                  if (start && end) {
                    setTimeout(() => setOpen(false), 300)
                  }
                }}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
