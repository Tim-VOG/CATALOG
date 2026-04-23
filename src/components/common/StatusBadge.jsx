import { Badge } from '@/components/ui/badge'

const statusConfig = {
  pending: { label: 'Pending', variant: 'soft-warning', dot: true },
  in_progress: { label: 'In Progress', variant: 'soft-primary', dot: true },
  ready: { label: 'Ready', variant: 'soft-success', dot: true },
}

export function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' }
  return <Badge variant={config.variant} dot={config.dot}>{config.label}</Badge>
}
