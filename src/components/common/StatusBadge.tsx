import { Badge } from '@/components/ui/badge'

const statusConfig = {
  pending: { label: 'Pending', variant: 'soft-warning', dot: true },
  in_progress: { label: 'In Progress', variant: 'soft-primary', dot: true },
  ready: { label: 'Ready', variant: 'soft-success', dot: true },
  returned: { label: 'Returned', variant: 'outline', dot: false },
  welcome: { label: 'Welcome', variant: 'soft-success', dot: true },
}

export function StatusBadge({ status  }: any) {
  const config = (statusConfig as Record<string, any>)[status] || { label: status, variant: 'outline' }
  return <Badge variant={config.variant} dot={config.dot}>{config.label}</Badge>
}
