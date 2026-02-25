import { useLoans } from '@/hooks/use-loans'
import { useProducts } from '@/hooks/use-products'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Inbox, Package, AlertTriangle, RotateCcw } from 'lucide-react'
import { PageLoading } from '@/components/common/LoadingSpinner'

export function AdminDashboardPage() {
  const { data: loans = [], isLoading: loansLoading } = useLoans()
  const { data: products = [], isLoading: productsLoading } = useProducts()

  if (loansLoading || productsLoading) return <PageLoading />

  const today = new Date().toISOString().split('T')[0]
  const pending = loans.filter((l) => l.status === 'pending')
  const active = loans.filter((l) => l.status === 'active')
  const overdue = active.filter((l) => l.return_date < today)
  const lowStock = products.filter((p) => {
    const borrowed = loans
      .filter((l) => l.product_id === p.id && (l.status === 'active' || l.status === 'pending'))
      .reduce((s, l) => s + l.quantity, 0)
    return p.total_stock - borrowed <= 1
  })

  const stats = [
    { label: 'Pending Requests', value: pending.length, icon: Inbox, color: 'text-warning' },
    { label: 'Active Loans', value: active.length, icon: Package, color: 'text-primary' },
    { label: 'Overdue', value: overdue.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Low Stock Items', value: lowStock.length, icon: RotateCcw, color: 'text-muted-foreground' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your equipment management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
