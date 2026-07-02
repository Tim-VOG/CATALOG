import { useParams, useNavigate } from 'react-router-dom'
import { useLoanRequest, useLoanRequestItems } from '@/hooks/use-loan-requests'
import { ArrowLeft, Calendar, User, Clock, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { AnimatedTimeline } from '@/components/common/AnimatedTimeline'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'

const formatDate = (d: any) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function RequestDetailPage() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const requestQuery = useLoanRequest(requestId)
  const { data: items = [] } = useLoanRequestItems(requestId)
  const request = requestQuery.data

  if (requestQuery.isLoading || requestQuery.isError) {
    return (
      <QueryWrapper query={requestQuery} skeleton={
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-6"><SkeletonText lines={4} /></div>
            <div className="rounded-lg border bg-card p-6"><SkeletonText lines={3} /></div>
          </div>
        </div>
      } />
    )
  }
  if (!request) return <div className="text-center py-16 text-muted-foreground">Request not found</div>

  const timeline = [
    { label: 'Submitted', date: request.created_at },
    ...(request.status === 'in_progress' || request.status === 'ready' ? [{ label: 'In Progress', date: request.updated_at }] : []),
    ...(request.status === 'ready' ? [{ label: 'Ready', date: request.updated_at }] : []),
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold">{request.project_name}</h1>
          <StatusBadge status={request.status} />
        </div>
        {request.request_number && (
          <p className="text-sm text-muted-foreground mt-1">Request #{request.request_number}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(request.pickup_date)} &rarr; {formatDate(request.return_date)}</span>
            </div>
            {request.project_description && <p className="text-muted-foreground">{request.project_description}</p>}
            {request.global_comment && <p className="italic text-muted-foreground">&ldquo;{request.global_comment}&rdquo;</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
          <CardContent>
            <AnimatedTimeline events={timeline} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Items ({items.length})</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                {item.product_image && <img src={item.product_image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.product_name}</p>
                <CategoryBadge name={item.category_name} color={item.category_color} />
              </div>
              <span className="text-sm font-medium">&times; {item.quantity}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
