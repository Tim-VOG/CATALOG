import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '@/lib/auth'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { ClipboardList, Calendar, MapPin, ChevronRight, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ACTIVE_STATUSES = ['pending', 'approved', 'picked_up']
const PAST_STATUSES = ['returned', 'closed', 'rejected', 'cancelled']

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function RequestCard({ req }) {
  return (
    <Link to={`/requests/${req.id}`}>
      <Card className="hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{req.project_name}</h3>
                <StatusBadge status={req.status} />
                {req.priority !== 'normal' && (
                  <Badge variant={req.priority === 'urgent' ? 'destructive' : req.priority === 'high' ? 'warning' : 'secondary'}>
                    {req.priority}
                  </Badge>
                )}
                {/* Return status indicators for past requests */}
                {req.status === 'returned' && (
                  <Badge variant="outline" className="gap-1 text-amber-500 border-amber-500/30">
                    <Clock className="h-3 w-3" />
                    Pending close
                  </Badge>
                )}
                {req.status === 'closed' && (
                  <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(req.pickup_date)} &rarr; {formatDate(req.return_date)}
                </span>
                {req.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {req.location_name}
                  </span>
                )}
                <span>{req.item_count} item{req.item_count !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted {formatDate(req.created_at)}
                {req.request_number && <> &mdash; #{req.request_number}</>}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function RequestsPage() {
  const { user } = useAuth()
  const requestsQuery = useMyLoanRequests(user?.id)
  const [tab, setTab] = useState('active')

  if (requestsQuery.isLoading || requestsQuery.isError) {
    return (
      <QueryWrapper
        query={requestsQuery}
        skeleton={
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          </div>
        }
      />
    )
  }

  const requests = requestsQuery.data || []

  const activeRequests = requests.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const pastRequests = requests.filter((r) => PAST_STATUSES.includes(r.status))

  const currentList = tab === 'active' ? activeRequests : pastRequests

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No requests yet"
        description="Browse the catalog and submit an equipment request"
      >
        <Link to="/catalog"><Button>Browse Catalog</Button></Link>
      </EmptyState>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">My Requests</h1>
        <p className="text-muted-foreground mt-1">{requests.length} request{requests.length !== 1 ? 's' : ''} total</p>
        <motion.div
          className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Tabs with animated underline */}
      <div className="flex gap-1 border-b relative">
        {[
          { id: 'active', label: 'Active', count: activeRequests.length, showCount: activeRequests.length > 0 },
          { id: 'past', label: 'Past', count: pastRequests.length, showCount: pastRequests.length > 0 },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative px-4 py-2 text-sm font-medium transition-colors -mb-px',
              tab === t.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            {t.showCount && (
              <span className={cn(
                'ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-xs font-bold px-1.5',
                tab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <motion.div
                layoutId="request-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Request list */}
      {currentList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">
            {tab === 'active'
              ? 'No active requests. Browse the catalog to submit one!'
              : 'No past requests yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((req) => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  )
}
