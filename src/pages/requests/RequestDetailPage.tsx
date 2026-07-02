import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLoanRequest, useLoanRequestItems } from '@/hooks/use-loan-requests'
import { useCreateExtensionRequest, useMyExtensionRequests } from '@/hooks/use-extension-requests'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import { ArrowLeft, Calendar, CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { StatusBadge } from '@/components/common/StatusBadge'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { AnimatedTimeline } from '@/components/common/AnimatedTimeline'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'

// Loan states where asking for more time makes sense (gear is out / booked).
const EXTENDABLE = ['approved', 'reserved', 'ready', 'picked_up']

const formatDate = (d: any) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function RequestDetailPage() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const showToast = useUIStore((s) => s.showToast)
  const requestQuery = useLoanRequest(requestId)
  const { data: items = [] } = useLoanRequestItems(requestId)
  const { data: myExtensions = [] } = useMyExtensionRequests(requestId)
  const createExtension = useCreateExtensionRequest()
  const request = requestQuery.data

  const [extOpen, setExtOpen] = useState(false)
  const [extDays, setExtDays] = useState('7')
  const [extReason, setExtReason] = useState('')

  const submitExtension = async () => {
    const days = Number.parseInt(extDays, 10)
    if (!days || days < 1) { showToast('Enter a valid number of days', 'error'); return }
    if (!extReason.trim()) { showToast('Please give a reason', 'error'); return }
    try {
      await createExtension.mutateAsync({
        request_id: requestId as string,
        user_id: (request?.user_id as string) || (user?.id as string),
        requested_days: days,
        reason: extReason.trim(),
      })
      showToast('Extension request sent')
      setExtOpen(false)
      setExtReason('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send', 'error')
    }
  }

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

      {/* Extension: ask for more time on an active loan */}
      {EXTENDABLE.includes(request.status) && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <CalendarClock className="h-4 w-4 text-primary shrink-0" />
            {myExtensions.some((e: any) => e.status === 'pending') ? (
              <span className="text-sm text-muted-foreground flex-1">
                Extension request pending review. <Badge className="ml-1 text-[10px] bg-amber-500/15 text-amber-600">pending</Badge>
              </span>
            ) : (
              <>
                <span className="text-sm text-muted-foreground flex-1">Need to keep this equipment longer?</span>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setExtOpen(true)}>
                  <CalendarClock className="h-3.5 w-3.5" /> Request extension
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

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

      <Dialog open={extOpen} onOpenChange={setExtOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request an extension</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Extra days</Label>
              <Input type="number" min={1} value={extDays} onChange={(e) => setExtDays(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">
                Current return date: {formatDate(request.return_date)}. An admin will review your request.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea value={extReason} onChange={(e) => setExtReason(e.target.value)} rows={3} placeholder="Why do you need more time?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtOpen(false)}>Cancel</Button>
            <Button onClick={submitExtension} disabled={createExtension.isPending}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
