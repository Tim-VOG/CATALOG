import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Package, Home, User, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: 'Hub', icon: Home, exact: true },
  { to: '/catalog', label: 'Catalog', icon: Package },
  { to: '/scan', label: 'Scan', icon: QrCode },
  { to: '/profile', label: 'Profile', icon: User },
]

export function BottomTabBar() {
  const location = useLocation()

  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden glass-panel border-t border-primary/10 shadow-[0_-4px_20px_0_rgb(var(--color-primary)/0.06)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-0 px-3 py-1.5 rounded-lg transition-colors relative',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <motion.span
                className="relative"
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon className={cn('h-5 w-5 transition-transform duration-200', active && 'scale-110')} />
              </motion.span>
              <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                {label}
              </span>
              {active && (
                <motion.div
                  layoutId="bottom-tab-active"
                  className="absolute -bottom-0.5 h-[3px] w-5 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
