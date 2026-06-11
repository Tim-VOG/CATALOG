import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { AdminSidebar } from './AdminSidebar'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PageLoading } from '@/components/common/LoadingSpinner'

// ── Section breadcrumb derived from the URL ──
function pathToBreadcrumb(pathname) {
  if (pathname === '/admin' || pathname === '/admin/') return ['DASHBOARD']
  const parts = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  return parts.map((p) => p.replace(/-/g, ' ').toUpperCase())
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function AdminLayout() {
  const location = useLocation()
  const crumbs = pathToBreadcrumb(location.pathname)
  const now = useClock()

  return (
    <div className="admin-shell relative flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Futuristic ambient background ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/12 blur-[100px]" />
        <div className="absolute top-32 -right-20 h-[22rem] w-[22rem] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/8 blur-[100px]" />
      </div>

      <AdminSidebar />

      <main className="admin-main flex-1 overflow-y-auto px-4 pb-10 sm:px-6 lg:px-8">
        {/* ── Sticky top status bar ── */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 backdrop-blur-xl bg-background/60 border-b border-border/30">
          <div className="mx-auto w-full max-w-7xl flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70 min-w-0">
              <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline">VO HUB</span>
              <span className="hidden sm:inline text-muted-foreground/30">/</span>
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-2 truncate">
                  <span className={i === crumbs.length - 1 ? 'text-foreground/80' : ''}>{c}</span>
                  {i < crumbs.length - 1 && <span className="text-muted-foreground/30">/</span>}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 shrink-0">
              <span className="hidden md:inline">
                {now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
              <span className="tabular-nums text-foreground/70">
                {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageLoading />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
