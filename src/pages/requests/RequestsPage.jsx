import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { ClipboardList, Calendar, MapPin, ChevronRight, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/utils'

const ACTIVE_STATUSES = ['pending', 'approved', 'picked_up']
const PAST_STATUSES = ['returned', 'closed', 'rejected', 'cancelled']

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function RequestCard({ req }) {
  return (
    <Link to={`/requests/${req.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
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
    return <QueryWrapper query={requestsQuery} />
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
        <h1 className="text-3xl font-display font-bold">My Requests</h1>
        <p className="text-muted-foreground mt-1">{requests.length} request{requests.length !== 1 ? 's' : ''} total</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('active')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Active
          {activeRequests.length > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold px-1.5">
              {activeRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('past')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'past'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Past
          {pastRequests.length > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold px-1.5">
              {pastRequests.length}
            </span>
          )}
        </button>
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
