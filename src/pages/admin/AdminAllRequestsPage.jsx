import { motion } from 'motion/react'
import { CalendarRange, Package } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAdminCalendarRequests } from '@/hooks/use-admin-calendar-requests'
import { RequestsCalendar } from '@/components/calendar/RequestsCalendar'
import { CatalogLoansView } from '@/components/calendar/CatalogLoansView'
import { useState } from 'react'

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

export function AdminAllRequestsPage() {
  const { events, isLoading, counts, users } = useAdminCalendarRequests()
  const [tab, setTab] = useState('calendar')

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
          />
        </TabsContent>

        <TabsContent value="loans" className="mt-6">
          <CatalogLoansView events={events} users={users} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
