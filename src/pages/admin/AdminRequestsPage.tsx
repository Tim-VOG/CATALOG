// @ts-nocheck — Phase-3 typing follow-up; remove this and fix once the surrounding API/component types stabilise.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoanRequests } from '@/hooks/use-loan-requests'
import { Inbox, Calendar, ChevronRight, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export-csv'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusBadge'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
]

export function AdminRequestsPage() {
  const { data: requests = [], isLoading } = useLoanRequests()
  const [filter, setFilter] = useState('all')

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter((r) => r.status === filter)

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Equipment Requests" description={`${requests.length} total requests`}>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToCSV(filteredRequests.map(r => ({
          Request: r.request_number, Project: r.project_name, User: `${r.user_first_name} ${r.user_last_name}`,
          Status: r.status, Priority: r.priority, Pickup: r.pickup_date, Return: r.return_date, Items: r.item_count,
        })), 'equipment-requests')}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s.value}
            variant={filter === s.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s.value)}
          >
            {s.label}
            {s.value === 'pending' && pendingCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </Button>
        ))}
      </AdminPageHeader>

      {/* Mobile scan tip */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <span className="text-lg">📱</span>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          For a better experience, use your phone to scan QR codes when assigning equipment.
        </p>
      </div>

      {filteredRequests.length === 0 ? (
        <EmptyState icon={Inbox} title="No requests" description="No requests match the current filter" />
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => (
            <Link key={req.id} to={`/admin/requests/${req.id}`}>
              <Card className="hover:border-primary/30 hover:shadow-card-hover transition-all duration-200 cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      avatarUrl={req.user_avatar_url}
                      firstName={req.user_first_name}
                      lastName={req.user_last_name}
                      email={req.user_email}
                      size="md"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{req.project_name}</h3>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{req.user_first_name} {req.user_last_name}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(req.pickup_date)} → {formatDate(req.return_date)}
                        </span>
                        <span>{req.item_count} item{req.item_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
