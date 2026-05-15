import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'requests', label: 'Requests', to: '/admin/onboarding/requests' },
  { key: 'compose',  label: 'Compose',  to: '/admin/onboarding/compose' },
  { key: 'history',  label: 'History',  to: '/admin/onboarding/history' },
]

export function OnboardingTabNav() {
  const location = useLocation()

  const getActiveTab = () => {
    if (location.pathname.includes('/requests')) return 'requests'
    if (location.pathname.includes('/compose')) return 'compose'
    if (location.pathname.includes('/history')) return 'history'
    return 'requests'
  }

  const active = getActiveTab()

  return (
    <div className="flex gap-1 bg-muted/40 rounded-full p-1 border w-fit">
      {TABS.map(({ key, label, to }) => (
        <Link key={key} to={to}>
          <Button
            variant={active === key ? 'default' : 'ghost'}
            size="sm"
            className={cn('h-8 text-xs px-4 rounded-full', active === key && 'shadow-sm')}
          >
            {label}
          </Button>
        </Link>
      ))}
    </div>
  )
}
