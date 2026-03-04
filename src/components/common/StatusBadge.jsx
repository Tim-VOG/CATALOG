import { Badge } from '@/components/ui/badge'

const statusConfig = {
  pending: { label: 'Pending', variant: 'soft-warning', dot: true },
  active: { label: 'Active', variant: 'soft-success', dot: true },
  approved: { label: 'Approved', variant: 'soft-success', dot: true },
  rejected: { label: 'Rejected', variant: 'soft-destructive' },
  reserved: { label: 'Reserved', variant: 'soft-primary', dot: true },
  picked_up: { label: 'Picked Up', variant: 'soft-primary' },
  returned: { label: 'Returned', variant: 'secondary' },
  overdue: { label: 'Overdue', variant: 'glow-destructive', dot: true },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
  closed: { label: 'Closed', variant: 'outline' },
}

export function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' }
  return <Badge variant={config.variant} dot={config.dot}>{config.label}</Badge>
}
