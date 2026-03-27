import { useAuth } from '@/lib/auth'
import { useScanLogs } from '@/hooks/use-qr-codes'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Package, AlertTriangle, QrCode, Monitor } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { motion } from 'motion/react'

export function MyEquipmentsPage() {
  const { user } = useAuth()
  const { data: allScanLogs = [], isLoading } = useScanLogs({ limit: 200 })

  const myEquipment = (() => {
    if (!user?.id) return []
    const myLogs = allScanLogs.filter(l => l.user_id === user.id)
    const takes = myLogs.filter(l => l.action === 'take')
    const deposits = myLogs.filter(l => l.action === 'deposit')
    const productCounts = {}
    for (const t of takes) {
      if (!productCounts[t.product_id]) productCounts[t.product_id] = { takes: 0, deposits: 0, latest: null }
      productCounts[t.product_id].takes++
      if (!productCounts[t.product_id].latest || new Date(t.created_at) > new Date(productCounts[t.product_id].latest.created_at))
        productCounts[t.product_id].latest = t
    }
    for (const d of deposits) {
      if (productCounts[d.product_id]) productCounts[d.product_id].deposits++
    }
    return Object.values(productCounts).filter(pc => pc.takes > pc.deposits).map(pc => pc.latest)
  })()

  if (isLoading) return <PageLoading />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">My Equipments</h1>
          <motion.div
            className="mt-3 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ originX: 0 }}
          />
        </div>
        <Link to="/scan">
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="h-4 w-4" />
            Scan to return
          </Button>
        </Link>
      </div>

      {myEquipment.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="No equipment"
          description="You don't have any equipment currently checked out."
        />
      ) : (
        <div className="space-y-2">
          {myEquipment.map((loan) => {
            const today = new Date().toISOString().split('T')[0]
            const isOverdue = loan.expected_return_date && loan.expected_return_date < today
            return (
              <Card key={loan.id} variant="elevated" className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {loan.product_image ? (
                      <img src={loan.product_image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{loan.product_name}</p>
                      {loan.created_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Taken on {format(new Date(loan.created_at), 'MMM d, yyyy')}
                        </p>
                      )}
                      {loan.expected_return_date && (
                        <p className="text-xs text-muted-foreground">
                          Return by {format(new Date(loan.expected_return_date + 'T12:00:00'), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    {isOverdue && (
                      <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] shrink-0">
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Overdue
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
