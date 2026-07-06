import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { DynamicsItem } from '@/components/ui/motion'
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

const ACTIVE_STATUSES = ['pending', 'in_progress']
const PAST_STATUSES = ['ready']

const formatDate = (d: any) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function RequestCard({ req  }: any) {
  const { t } = useTranslation()
  return (
    <Link to={`/requests/${req.id}`}>
      <Card className="hover:-translate-y-1 hover:shadow-elevated hover:border-primary/30 transition-all duration-300 cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{req.project_name}</h3>
                <StatusBadge status={req.status} />
                {req.priority !== 'normal' && (
                  <Badge variant={req.priority === 'urgent' ? 'destructive' : req.priority === 'high' ? 'warning' : 'secondary'}>
                    {t(`user.requestsList.priority.${req.priority}`, { defaultValue: req.priority })}
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
                <span>{t('user.requestsList.itemCount', { count: req.item_count })}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('user.requestsList.submittedOn', { date: formatDate(req.created_at) })}
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
  const { t } = useTranslation()
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
              {Array.from({ length: 4 }).map((_: any, i: any) => (
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

  const activeRequests = requests.filter((r: any) => ACTIVE_STATUSES.includes(r.status))
  const pastRequests = requests.filter((r: any) => PAST_STATUSES.includes(r.status))

  const currentList = tab === 'active' ? activeRequests : pastRequests

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t('user.requestsList.emptyTitle')}
        description={t('user.requestsList.emptyDescription')}
      >
        <Link to="/catalog"><Button>{t('user.requestsList.browseCatalog')}</Button></Link>
      </EmptyState>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">{t('user.requestsList.pageTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('user.requestsList.requestsTotal', { count: requests.length })}</p>
        <motion.div
          className="mt-3 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Tabs with animated underline */}
      <div className="flex gap-1 border-b relative">
        {[
          { id: 'active', label: t('user.requestsList.tabActive'), count: activeRequests.length, showCount: activeRequests.length > 0 },
          { id: 'past', label: t('user.requestsList.tabPast'), count: pastRequests.length, showCount: pastRequests.length > 0 },
        ].map((tabItem: any) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={cn(
              'relative px-4 py-2 text-sm font-medium transition-colors -mb-px',
              tab === tabItem.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tabItem.label}
            {tabItem.showCount && (
              <span className={cn(
                'ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full text-xs font-bold px-1.5',
                tab === tabItem.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {tabItem.count}
              </span>
            )}
            {tab === tabItem.id && (
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
              ? t('user.requestsList.emptyActive')
              : t('user.requestsList.emptyPast')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((req: any, i: any) => (
            <DynamicsItem key={req.id} index={i}>
              <RequestCard req={req} />
            </DynamicsItem>
          ))}
        </div>
      )}
    </div>
  )
}
