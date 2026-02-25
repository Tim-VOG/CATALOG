import { Link } from 'react-router-dom'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { ClipboardList, Calendar, MapPin, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusBadge'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function RequestsPage() {
  const { data: requests = [], isLoading } = useLoanRequests()

  if (isLoading) return <PageLoading />

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
        <p className="text-muted-foreground mt-1">{requests.length} request{requests.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {requests.map((req) => (
          <Link key={req.id} to={`/requests/${req.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{req.project_name}</h3>
                      <StatusBadge status={req.status} />
                      {req.priority !== 'normal' && (
                        <Badge variant={req.priority === 'urgent' ? 'destructive' : req.priority === 'high' ? 'warning' : 'secondary'}>
                          {req.priority}
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
        ))}
      </div>
    </div>
  )
}
