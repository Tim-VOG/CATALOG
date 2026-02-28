import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CalendarRange, Package, Trash2, X, CheckSquare, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminCalendarRequests } from '@/hooks/use-admin-calendar-requests'
import { useDeleteLoanRequests } from '@/hooks/use-loan-requests'
import { useDeleteItRequests } from '@/hooks/use-it-requests'
import { useDeleteMailboxRequests } from '@/hooks/use-mailbox-requests'
import { RequestsCalendar } from '@/components/calendar/RequestsCalendar'
import { CatalogLoansView } from '@/components/calendar/CatalogLoansView'
import { cn } from '@/lib/utils'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-4 w-40 mt-2" />
        <Skeleton className="h-0.5 w-16 mt-3" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="rounded-2xl border border-border/50 p-3">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-5 w-full rounded" />
          ))}
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-14 sm:h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function BulkDeleteBar({ selectedIds, events, onClear, onDelete, isDeleting }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const counts = useMemo(() => {
    const c = { catalog: 0, it: 0, mailbox: 0 }
    for (const id of selectedIds) {
      const ev = events.find((e) => e.id === id)
      if (ev) c[ev.type] = (c[ev.type] || 0) + 1
    }
    return c
  }, [selectedIds, events])

  const total = selectedIds.size

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{total} selected</span>
          {counts.catalog > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/30">
              <Package className="h-2.5 w-2.5" />
              {counts.catalog}
            </Badge>
          )}
          {counts.it > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-500 border-amber-500/30">
              {counts.it} IT
            </Badge>
          )}
          {counts.mailbox > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-violet-500/10 text-violet-500 border-violet-500/30">
              {counts.mailbox} Mail
            </Badge>
          )}
        </div>

        <div className="h-5 w-px bg-border/60" />

        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>

        {!confirmOpen ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} className="text-xs gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              Confirm?
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onDelete(); setConfirmOpen(false) }}
              disabled={isDeleting}
              className="text-xs"
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} className="text-xs">
              Cancel
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function AdminAllRequestsPage() {
  const { events, isLoading, counts, users } = useAdminCalendarRequests()
  const [tab, setTab] = useState('calendar')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const deleteLoan = useDeleteLoanRequests()
  const deleteIt = useDeleteItRequests()
  const deleteMail = useDeleteMailboxRequests()
  const isDeleting = deleteLoan.isPending || deleteIt.isPending || deleteMail.isPending

  const toggleSelect = useCallback((eventId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleBulkDelete = useCallback(async () => {
    const catalogIds = []
    const itIds = []
    const mailboxIds = []

    for (const id of selectedIds) {
      const ev = events.find((e) => e.id === id)
      if (!ev?.original?.id) continue
      const realId = ev.original.id
      if (ev.type === 'catalog') catalogIds.push(realId)
      else if (ev.type === 'it') itIds.push(realId)
      else if (ev.type === 'mailbox') mailboxIds.push(realId)
    }

    try {
      const promises = []
      if (catalogIds.length > 0) promises.push(deleteLoan.mutateAsync(catalogIds))
      if (itIds.length > 0) promises.push(deleteIt.mutateAsync(itIds))
      if (mailboxIds.length > 0) promises.push(deleteMail.mutateAsync(mailboxIds))
      await Promise.all(promises)
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Bulk delete error:', err)
    }
  }, [selectedIds, events, deleteLoan, deleteIt, deleteMail])

  if (isLoading) return <LoadingSkeleton />

  const totalCount = events.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarRange className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-gradient-primary">
              All Requests
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {totalCount} request{totalCount !== 1 ? 's' : ''} across all users
            </p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs gap-1.5 hidden sm:flex">
            <CalendarRange className="h-3 w-3" />
            Overview
          </Badge>
        </div>
        <motion.div
          className="mt-4 h-0.5 w-16 rounded-full bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </motion.div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30 border border-border/30">
          <TabsTrigger value="calendar" className="gap-1.5 text-xs">
            <CalendarRange className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" />
            Catalog Loans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <RequestsCalendar
            events={events}
            counts={counts}
            hasCatalog
            hasItForm
            hasMailbox
            isAdmin
            users={users}
            showUser
            storageKey="admin-calendar-view-mode"
            selectable
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </TabsContent>

        <TabsContent value="loans" className="mt-6">
          <CatalogLoansView events={events} />
        </TabsContent>
      </Tabs>

      {/* Bulk delete floating bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkDeleteBar
            selectedIds={selectedIds}
            events={events}
            onClear={clearSelection}
            onDelete={handleBulkDelete}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
