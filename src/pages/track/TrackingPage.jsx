import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { motion } from 'motion/react'
import { Package, Clock, Loader2, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STEPS = [
  { key: 'pending', label: 'Pending', description: 'Request received', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500' },
  { key: 'in_progress', label: 'In Progress', description: 'Being prepared', icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500' },
  { key: 'ready', label: 'Ready', description: 'Ready for pickup', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500' },
]

function getStepIndex(status) {
  const idx = STEPS.findIndex((s) => s.key === status)
  return idx >= 0 ? idx : 0
}

function useTrackingData(token) {
  return useQuery({
    queryKey: ['tracking', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_requests')
        .select('id, request_number, project_name, status, created_at, updated_at, pickup_date, return_date')
        .eq('tracking_token', token)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!token,
  })
}

export function TrackingPage() {
  const { token } = useParams()
  const { data: request, isLoading, isError } = useTrackingData(token)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="font-display font-bold text-lg">Request not found</h2>
            <p className="text-sm text-muted-foreground mt-2">This tracking link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStep = getStepIndex(request.status)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="bg-primary/5 border-b px-6 py-5">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Request #{request.request_number}
            </p>
            <h1 className="font-display font-bold text-xl mt-1">{request.project_name || 'Equipment Request'}</h1>
            {request.pickup_date && (
              <p className="text-xs text-muted-foreground mt-2">
                {request.pickup_date}{request.return_date ? ` → ${request.return_date}` : ''}
              </p>
            )}
          </div>

          {/* Stepper */}
          <CardContent className="p-6">
            <div className="space-y-0">
              {STEPS.map((step, idx) => {
                const isDone = idx < currentStep
                const isCurrent = idx === currentStep
                const isPending = idx > currentStep
                const Icon = step.icon

                return (
                  <div key={step.key} className="flex gap-4">
                    {/* Vertical line + dot */}
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: isCurrent ? 1.1 : 1 }}
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all',
                          isDone && `${step.bg} text-white`,
                          isCurrent && `${step.bg} text-white shadow-lg`,
                          isPending && 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className={cn('h-5 w-5', isCurrent && step.key === 'in_progress' && 'animate-spin')} />
                      </motion.div>
                      {idx < STEPS.length - 1 && (
                        <div className={cn(
                          'w-0.5 h-12 my-1 rounded-full transition-colors',
                          isDone ? step.bg : 'bg-muted'
                        )} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pt-2 pb-6">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          'font-semibold text-sm',
                          isPending && 'text-muted-foreground'
                        )}>
                          {step.label}
                        </h3>
                        {isCurrent && (
                          <Badge variant="outline" className={cn('text-[10px]', step.color)}>
                            Current
                          </Badge>
                        )}
                        {isDone && (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                      </div>
                      <p className={cn(
                        'text-xs mt-0.5',
                        isPending ? 'text-muted-foreground/50' : 'text-muted-foreground'
                      )}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/20 text-center">
            <p className="text-[11px] text-muted-foreground">
              IT Hub — VO Group
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
