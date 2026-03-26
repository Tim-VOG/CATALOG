import { useState } from 'react'
import { motion } from 'motion/react'
import {
  ClipboardList, Search, ArrowUpFromLine, ArrowDownToLine,
  Filter, Package, User, Clock, Calendar
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { ScrollFadeIn } from '@/components/ui/motion'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { useScanLogs } from '@/hooks/use-qr-codes'
import { cn } from '@/lib/utils'

export function AdminScanLogsPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const { data: logs, isLoading } = useScanLogs({ search, action: actionFilter || undefined })

  if (isLoading) return <PageLoading />

  const stats = logs?.reduce(
    (acc, log) => {
      if (log.action === 'take') acc.takes++
      else acc.deposits++
      return acc
    },
    { takes: 0, deposits: 0 }
  ) || { takes: 0, deposits: 0 }

  return (
    <>
      <AdminPageHeader title="Scan Logs" description="Track all QR code scan activity" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{logs?.length || 0}</div>
          <div className="text-xs text-muted-foreground">Total Scans</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-500">{stats.takes}</div>
          <div className="text-xs text-muted-foreground">Items Taken</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-500">{stats.deposits}</div>
          <div className="text-xs text-muted-foreground">Items Deposited</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, product, user..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
          {[
            { value: '', label: 'All' },
            { value: 'take', label: 'Takes', icon: ArrowUpFromLine },
            { value: 'deposit', label: 'Deposits', icon: ArrowDownToLine },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActionFilter(value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                actionFilter === value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      {!logs?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No scan activity yet"
          description="Scan logs will appear here once users start scanning QR codes."
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log, idx) => (
            <ScrollFadeIn key={log.id} delay={idx * 0.02}>
              <Card className="hover:border-primary/10 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Action icon */}
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      log.action === 'take'
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    )}>
                      {log.action === 'take'
                        ? <ArrowUpFromLine className="h-5 w-5" />
                        : <ArrowDownToLine className="h-5 w-5" />
                      }
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-xs font-bold uppercase px-2 py-0.5 rounded',
                          log.action === 'take'
                            ? 'bg-orange-500/10 text-orange-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        )}>
                          {log.action}
                        </span>
                        <span className="font-medium text-sm">{log.product_name}</span>
                        {log.category_name && (
                          <CategoryBadge name={log.category_name} color={log.category_color} />
                        )}
                        {log.kit_name && (
                          <span className="text-xs text-accent">Kit: {log.kit_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user_name || log.user_email || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </span>
                        <span className="font-mono text-[10px]">{log.qr_code}</span>
                      </div>
                      {log.action === 'take' && log.pickup_date && (
                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                          <span className="text-muted-foreground">
                            Pickup: <strong className="text-foreground">{format(new Date(log.pickup_date + 'T12:00:00'), 'MMM d')}</strong>
                          </span>
                          {log.expected_return_date && (
                            <span className="text-muted-foreground">
                              → Return: <strong className="text-foreground">{format(new Date(log.expected_return_date + 'T12:00:00'), 'MMM d')}</strong>
                            </span>
                          )}
                        </div>
                      )}
                      {log.action === 'deposit' && log.actual_return_date && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Returned: <strong className="text-foreground">{format(new Date(log.actual_return_date + 'T12:00:00'), 'MMM d, yyyy')}</strong>
                        </div>
                      )}
                    </div>

                    {/* Stock change */}
                    <div className="text-center shrink-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{log.stock_before}</span>
                        <span className="text-muted-foreground/50">&rarr;</span>
                        <span className="font-bold">{log.stock_after}</span>
                      </div>
                      <div className={cn(
                        'text-xs font-bold',
                        log.action === 'take' ? 'text-orange-500' : 'text-emerald-500'
                      )}>
                        {log.action === 'take' ? '-1' : '+1'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollFadeIn>
          ))}
        </div>
      )}
    </>
  )
}
