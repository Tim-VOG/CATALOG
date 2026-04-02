import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyEquipment, useReturnEquipment } from '@/hooks/use-user-equipment'
import { useUIStore } from '@/stores/ui-store'
import { format, differenceInDays } from 'date-fns'
import { motion } from 'motion/react'
import {
  Package, AlertTriangle, Monitor, Clock, CheckCircle,
  CalendarDays, ArrowRight, RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { ScrollFadeIn } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

function getEquipmentStatus(item) {
  const today = new Date().toISOString().split('T')[0]
  if (item.status === 'returned') return { label: 'Returned', color: 'text-muted-foreground bg-muted/30 border-border/30', icon: CheckCircle }
  if (item.status === 'lost') return { label: 'Lost', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: AlertTriangle }
  if (item.status === 'damaged') return { label: 'Damaged', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle }
  if (!item.expected_return_date) return { label: 'Active', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle }

  const daysLeft = differenceInDays(new Date(item.expected_return_date), new Date(today))
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}d overdue`, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: AlertTriangle }
  if (daysLeft <= 3) return { label: `${daysLeft}d left`, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Clock }
  return { label: 'Active', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle }
}

export function MyEquipmentsPage() {
  const { user } = useAuth()
  const { data: equipment = [], isLoading } = useMyEquipment()
  const returnMutation = useReturnEquipment()
  const showToast = useUIStore((s) => s.showToast)

  const { active, returned } = useMemo(() => {
    const active = equipment.filter((e) => e.status === 'active')
    const returned = equipment.filter((e) => e.status !== 'active')
    return { active, returned }
  }, [equipment])

  const handleReturn = async (item) => {
    if (!confirm(`Mark "${item.product_name}" as returned?`)) return
    try {
      await returnMutation.mutateAsync(item.id)
      showToast('Equipment marked as returned')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-gradient-primary">
              My Equipment
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {active.length} active item{active.length !== 1 ? 's' : ''} assigned to you
            </p>
          </div>
        </div>
        <motion.div
          className="mt-4 h-0.5 w-16 rounded-full bg-primary/60"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Active Equipment */}
      {active.length === 0 && returned.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="No equipment assigned"
          description="You don't have any equipment currently assigned. Submit a request to get started."
        />
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                Active ({active.length})
              </h2>
              <div className="space-y-2">
                {active.map((item, i) => {
                  const status = getEquipmentStatus(item)
                  const StatusIcon = status.icon
                  return (
                    <ScrollFadeIn key={item.id} delay={i * 0.05}>
                      <Card variant="elevated" className="transition-all hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {item.product_image ? (
                              <img src={item.product_image} alt="" className="w-14 h-14 rounded-xl object-cover" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{item.product_name}</p>
                              {item.category_name && (
                                <p className="text-[11px] text-muted-foreground">{item.category_name}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(new Date(item.assigned_date), 'MMM d, yyyy')}
                                </span>
                                {item.expected_return_date && (
                                  <span className="flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3" />
                                    {format(new Date(item.expected_return_date + 'T12:00:00'), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                              {/* Subscription plan */}
                              {item.subscription_plan_name && (
                                <p className="text-[11px] text-primary mt-1">
                                  Plan: {item.subscription_plan_name} ({item.subscription_plan_price})
                                </p>
                              )}
                              {/* Included items */}
                              {item.includes?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {item.includes.map((inc, j) => (
                                    <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      {inc}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <Badge variant="outline" className={cn('text-[10px] gap-1', status.color)}>
                                <StatusIcon className="h-2.5 w-2.5" />
                                {status.label}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </ScrollFadeIn>
                  )
                })}
              </div>
            </div>
          )}

          {/* Returned / Past Equipment */}
          {returned.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <RotateCcw className="h-3.5 w-3.5" />
                Past Equipment ({returned.length})
              </h2>
              <div className="space-y-2">
                {returned.slice(0, 5).map((item) => (
                  <Card key={item.id} className="opacity-60">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(item.assigned_date), 'MMM d')} — {item.actual_return_date ? format(new Date(item.actual_return_date), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {item.status === 'returned' ? 'Returned' : item.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
