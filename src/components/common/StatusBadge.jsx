import { Badge } from '@/components/ui/badge'

const statusConfig = {
  pending: { label: 'Pending', variant: 'warning' },
  active: { label: 'Active', variant: 'success' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  reserved: { label: 'Reserved', variant: 'default' },
  picked_up: { label: 'Picked Up', variant: 'default' },
  returned: { label: 'Returned', variant: 'secondary' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
  closed: { label: 'Closed', variant: 'outline' },
}

export function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, variant: 'outline' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
