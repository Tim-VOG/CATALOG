import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROUTE_LABELS = {
  '': 'Hub',
  'catalog': 'Catalog',
  'scan': 'QR Scan',
  'my-equipment': 'My Equipment',
  'my-requests': 'My Requests',
  'requests': 'Requests',
  'profile': 'Profile',
  'reserve': 'Reserve',
  'admin': 'Admin',
  'it-request': 'IT Request',
  'functional-mailbox': 'Mailbox Request',
}

export function Breadcrumb({ items, className }) {
  const location = useLocation()

  // Auto-generate from path if no items provided
  const crumbs = items || (() => {
    const segments = location.pathname.split('/').filter(Boolean)
    const auto = [{ label: 'Hub', to: '/' }]
    let path = ''
    for (const seg of segments) {
      path += `/${seg}`
      const label = ROUTE_LABELS[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      auto.push({ label, to: path })
    }
    return auto
  })()

  if (crumbs.length <= 1) return null

  return (
    <nav className={cn('flex items-center gap-1 text-xs text-muted-foreground mb-4', className)}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i === 0 && <Home className="h-3 w-3" />}
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link to={crumb.to} className="hover:text-foreground transition-colors">{crumb.label}</Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
