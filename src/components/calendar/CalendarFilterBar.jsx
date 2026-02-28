import { Package, ClipboardList, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  catalog: { label: 'Catalog', icon: Package, dot: 'bg-primary', active: 'bg-primary/15 text-primary border-primary/30', ring: 'ring-primary/20' },
  it: { label: 'IT', icon: ClipboardList, dot: 'bg-amber-500', active: 'bg-amber-500/15 text-amber-500 border-amber-500/30', ring: 'ring-amber-500/20' },
  mailbox: { label: 'Mailbox', icon: Mail, dot: 'bg-violet-500', active: 'bg-violet-500/15 text-violet-500 border-violet-500/30', ring: 'ring-violet-500/20' },
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  approved: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  rejected: { label: 'Rejected', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  completed: { label: 'Completed', color: 'bg-primary/15 text-primary border-primary/30' },
}

export function CalendarFilterBar({ filters, onChange, counts, hasCatalog, hasItForm, hasMailbox }) {
  const toggleType = (type) => {
    const current = filters.types
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    onChange({ ...filters, types: next })
  }

  const toggleStatus = (status) => {
    const current = filters.statuses
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    onChange({ ...filters, statuses: next })
  }

  const clearStatuses = () => {
    onChange({ ...filters, statuses: [] })
  }

  const types = [
    hasCatalog && { key: 'catalog', count: counts.catalog },
    hasItForm && { key: 'it', count: counts.it },
    hasMailbox && { key: 'mailbox', count: counts.mailbox },
  ].filter(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type toggles */}
      {types.map(({ key, count }) => {
        const cfg = TYPE_CONFIG[key]
        const isActive = filters.types.includes(key)
        return (
          <button
            key={key}
            onClick={() => toggleType(key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
              isActive
                ? cn(cfg.active, 'shadow-sm')
                : 'bg-muted/20 text-muted-foreground/60 border-transparent hover:bg-muted/40'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full transition-opacity', cfg.dot, !isActive && 'opacity-30')} />
            {cfg.label}
            <span className={cn(
              'text-[10px] font-semibold ml-0.5 tabular-nums',
              isActive ? 'opacity-100' : 'opacity-50'
            )}>
              {count}
            </span>
          </button>
        )
      })}

      {/* Separator */}
      <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />

      {/* Status filters */}
      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
        const isActive = filters.statuses.includes(key)
        return (
          <button
            key={key}
            onClick={() => toggleStatus(key)}
            className={cn(
              'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all duration-200 capitalize',
              isActive
                ? cn(cfg.color, 'shadow-sm')
                : 'bg-transparent text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:bg-muted/30'
            )}
          >
            {cfg.label}
          </button>
        )
      })}

      {/* Clear status filters */}
      {filters.statuses.length > 0 && (
        <button
          onClick={clearStatuses}
          className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors ml-1"
        >
          Clear
        </button>
      )}
    </div>
  )
}
