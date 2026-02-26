import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { useLoans, useUpdateLoanStatus } from '@/hooks/use-loans'
import { User, Calendar, Check, X, Inbox, ChevronRight, Eye } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useUIStore } from '@/stores/ui-store'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function AdminRequestsPage() {
  const { data: requests = [], isLoading: reqLoading } = useLoanRequests()
  const { data: loans = [], isLoading: loansLoading } = useLoans()
  const updateLoanStatus = useUpdateLoanStatus()
  const showToast = useUIStore((s) => s.showToast)
  const [filter, setFilter] = useState('all')

  const isLoading = reqLoading || loansLoading

  // Legacy pending loans (from old system)
  const pendingLoans = loans.filter((l) => l.status === 'pending')

  // New request system
  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter((r) => r.status === filter)

  const handleLegacyApprove = async (id) => {
    try {
      await updateLoanStatus.mutateAsync({ id, status: 'active' })
      showToast('Request approved')
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleLegacyReject = async (id) => {
    try {
      await updateLoanStatus.mutateAsync({ id, status: 'rejected' })
      showToast('Request rejected')
    } catch (err) { showToast(err.message, 'error') }
  }

  if (isLoading) return <PageLoading />

  const statusFilters = ['all', 'pending', 'approved', 'picked_up', 'returned']

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">Requests</h1>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            {s === 'pending' && requests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">
                {requests.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Legacy pending loans */}
      {pendingLoans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Legacy Requests</h2>
          {pendingLoans.map((loan) => (
            <Card key={loan.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{loan.product_name} &times; {loan.quantity}</h3>
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {loan.borrower_name}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(loan.pickup_date)} &rarr; {formatDate(loan.return_date)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="success" size="sm" className="gap-1" onClick={() => handleLegacyApprove(loan.id)}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button variant="destructive" size="sm" className="gap-1" onClick={() => handleLegacyReject(loan.id)}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New request system */}
      {filteredRequests.length === 0 && pendingLoans.length === 0 ? (
        <EmptyState icon={Inbox} title="No requests" description="No requests match the current filter" />
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <Link key={req.id} to={`/admin/requests/${req.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          <span className="text-muted-foreground font-normal">{req.user_first_name} {req.user_last_name}</span>
                          {' — '}
                          {req.project_name}
                        </h3>
                        <StatusBadge status={req.status} />
                        {req.priority !== 'normal' && (
                          <Badge variant={req.priority === 'urgent' ? 'destructive' : req.priority === 'high' ? 'warning' : 'secondary'}>
                            {req.priority}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <UserAvatar
                            avatarUrl={req.user_avatar_url}
                            firstName={req.user_first_name}
                            lastName={req.user_last_name}
                            email={req.user_email}
                            size="sm"
                          />
                          {req.user_first_name} {req.user_last_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {formatDate(req.pickup_date)} &rarr; {formatDate(req.return_date)}
                        </span>
                        <span>{req.item_count} item{req.item_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
