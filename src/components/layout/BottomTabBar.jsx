import { Link, useLocation } from 'react-router-dom'
import { Package, ShoppingCart, ClipboardList, User } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { ScalePop } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/catalog', label: 'Catalog', icon: Package },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/requests', label: 'Requests', icon: ClipboardList },
  { to: '/profile', label: 'Profile', icon: User },
]

export function BottomTabBar() {
  const location = useLocation()
  const cartCount = useCartStore((s) => s.items.length)

  const isActive = (to) => location.pathname.startsWith(to)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-primary/10 shadow-[0_-1px_3px_0_rgb(var(--color-primary)/0.06)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = isActive(to)
          const isCart = to === '/cart'
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 min-w-0 px-3 py-1.5 rounded-lg transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {isCart && cartCount > 0 && (
                  <ScalePop motionKey={cartCount}>
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-1">
                      {cartCount}
                    </span>
                  </ScalePop>
                )}
              </span>
              <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
