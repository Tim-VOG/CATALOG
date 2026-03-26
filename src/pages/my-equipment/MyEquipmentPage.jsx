import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { format } from 'date-fns'
import {
  Package, QrCode, ArrowRight, AlertTriangle, Clock,
  CheckCircle2, Layers, ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useScanLogs } from '@/hooks/use-qr-codes'
import { useReportLost } from '@/hooks/use-qr-reservations'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { ScrollFadeIn } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

export function MyEquipmentPage() {
  const { user } = useAuth()
  const { data: allLogs = [], isLoading } = useScanLogs({ limit: 200 })
  const reportLost = useReportLost()

  // Filter: only this user's takes that haven't been deposited
  const myActiveLoans = useMemo(() => {
    if (!user?.id) return []

    // Get all logs for this user
    const myLogs = allLogs.filter(l => l.user_id === user.id)

    // Group takes and find which ones don't have a matching deposit
    const takes = myLogs.filter(l => l.action === 'take')
    const deposits = myLogs.filter(l => l.action === 'deposit')

    // A take is "active" if there are more takes than deposits for that product
    const productCounts = {}
    for (const t of takes) {
      const key = t.product_id
      if (!productCounts[key]) productCounts[key] = { takes: 0, deposits: 0, latestTake: null }
      productCounts[key].takes++
      if (!productCounts[key].latestTake || new Date(t.created_at) > new Date(productCounts[key].latestTake.created_at)) {
        productCounts[key].latestTake = t
      }
    }
    for (const d of deposits) {
      const key = d.product_id
      if (productCounts[key]) productCounts[key].deposits++
    }

    // Return active takes (more takes than deposits)
    return Object.values(productCounts)
      .filter(pc => pc.takes > pc.deposits)
      .map(pc => pc.latestTake)
      .sort((a, b) => new Date(a.expected_return_date || '9999') - new Date(b.expected_return_date || '9999'))
  }, [allLogs, user?.id])

  const today = new Date().toISOString().split('T')[0]

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">My Equipment</h1>
        <p className="text-muted-foreground mt-1">Equipment currently in your possession</p>
        <motion.div
          className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{myActiveLoans.length}</div>
          <div className="text-xs text-muted-foreground">Items with you</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-destructive">
            {myActiveLoans.filter(l => l.expected_return_date && l.expected_return_date < today).length}
          </div>
          <div className="text-xs text-muted-foreground">Overdue</div>
        </Card>
        <Card className="p-4 text-center hidden sm:block">
          <div className="text-2xl font-bold text-warning">
            {myActiveLoans.filter(l => {
              if (!l.expected_return_date) return false
              const days = Math.ceil((new Date(l.expected_return_date + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24))
              return days >= 0 && days <= 3
            }).length}
          </div>
          <div className="text-xs text-muted-foreground">Due soon</div>
        </Card>
      </div>

      {/* Equipment list */}
      {myActiveLoans.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No equipment checked out"
          description="You don't have any equipment right now. Scan a QR code to take an item."
        />
      ) : (
        <div className="space-y-3">
          {myActiveLoans.map((loan, idx) => {
            const isOverdue = loan.expected_return_date && loan.expected_return_date < today
            const daysLeft = loan.expected_return_date
              ? Math.ceil((new Date(loan.expected_return_date + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24))
              : null

            return (
              <ScrollFadeIn key={loan.id} delay={idx * 0.04}>
                <Card className={cn(
                  'hover:border-primary/20 transition-colors',
                  isOverdue && 'border-destructive/40 bg-destructive/5'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Product image */}
                      {loan.product_image ? (
                        <img src={loan.product_image} alt="" className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{loan.product_name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {loan.category_name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: `${loan.category_color}20`, color: loan.category_color }}>
                              {loan.category_name}
                            </span>
                          )}
                          {loan.kit_name && (
                            <span className="text-[10px] text-accent flex items-center gap-0.5">
                              <Layers className="h-2.5 w-2.5" /> {loan.kit_name}
                            </span>
                          )}
                        </div>
                        {loan.pickup_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Taken: {format(new Date(loan.pickup_date + 'T12:00:00'), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {!loan.is_lost && (
                          <button
                            onClick={() => {
                              if (!confirm('Report this item as lost?')) return
                              reportLost.mutateAsync({ scanLogId: loan.id, notes: 'Reported lost by user' })
                                .then(() => toast.success('Item reported as lost. The admin has been notified.'))
                                .catch(() => toast.error('Failed to report'))
                            }}
                            className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Report lost
                          </button>
                        )}
                        {loan.is_lost && (
                          <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                            <ShieldAlert className="h-3 w-3 mr-1" /> Reported lost
                          </Badge>
                        )}
                      </div>

                      {/* Return date / status */}
                      <div className="text-right shrink-0">
                        {isOverdue ? (
                          <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {Math.abs(daysLeft)}d overdue
                          </Badge>
                        ) : daysLeft !== null && daysLeft <= 3 ? (
                          <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" />
                            {daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                          </Badge>
                        ) : loan.expected_return_date ? (
                          <span className="text-xs text-muted-foreground">
                            Return by<br />
                            <strong className="text-foreground">{format(new Date(loan.expected_return_date + 'T12:00:00'), 'MMM d')}</strong>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No date set</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollFadeIn>
            )
          })}
        </div>
      )}

      {/* CTA */}
      <div className="flex justify-center pt-4">
        <Link to="/scan">
          <Button variant="outline" className="gap-2">
            <QrCode className="h-4 w-4" />
            Scan to return equipment
          </Button>
        </Link>
      </div>
    </div>
  )
}
