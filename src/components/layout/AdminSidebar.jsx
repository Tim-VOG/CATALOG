import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  LayoutDashboard, Inbox, RotateCcw,
  Users, Palette, Mail, CalendarRange, ArrowLeft,
  FilePlus2, UserPlus, Clock, PenLine, ClipboardList,
  Settings, UserMinus, ChevronsLeft, LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ── Contextual hover animations per icon ──
const ANIM = {
  dashboard:    'group-hover:scale-110',
  requests:     'group-hover:scale-110 group-hover:translate-y-0.5',
  newRequest:   'group-hover:scale-115 group-hover:rotate-12',
  planning:     'group-hover:scale-110 group-hover:-rotate-3',
  returns:      'group-hover:rotate-[-360deg] duration-500',
  users:        'group-hover:scale-110',
  comms:        'sidebar-icon-wiggle',
  catalogBuilder: 'group-hover:scale-110 group-hover:rotate-3',
  design:       'group-hover:rotate-[-20deg] group-hover:scale-110',
  recipients:   'group-hover:scale-115 group-hover:-translate-y-0.5',
  compose:      'group-hover:translate-x-0.5 group-hover:rotate-[-8deg]',
  history:      'group-hover:rotate-[360deg] duration-500',
  itRequests:   'group-hover:scale-110 group-hover:rotate-[-3deg]',
  formBuild:    'group-hover:rotate-180 duration-300',
  offboarding:  'group-hover:scale-110 group-hover:translate-y-0.5',
  mailbox:      'sidebar-icon-wiggle',
}

const sidebarSections = [
  {
    label: 'Catalog',
    links: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, anim: ANIM.dashboard },
      { to: '/admin/catalog-builder', label: 'Catalog Manager', icon: LayoutGrid, anim: ANIM.catalogBuilder },
      { to: '/admin/requests', label: 'Requests', icon: Inbox, anim: ANIM.requests },
      { to: '/admin/new-request', label: 'New Request', icon: FilePlus2, anim: ANIM.newRequest },
      { to: '/admin/planning', label: 'Planning', icon: CalendarRange, anim: ANIM.planning },
      { to: '/admin/returns', label: 'Returns', icon: RotateCcw, anim: ANIM.returns },
      { to: '/admin/users', label: 'Users', icon: Users, anim: ANIM.users },
      { to: '/admin/email-templates', label: 'Communications', icon: Mail, anim: ANIM.comms },
      { to: '/admin/design', label: 'Design', icon: Palette, anim: ANIM.design },
    ],
  },
  {
    label: 'Onboarding',
    links: [
      { to: '/admin/onboarding', label: 'Recipients', icon: UserPlus, exact: true, anim: ANIM.recipients },
      { to: '/admin/onboarding/compose', label: 'Compose', icon: PenLine, anim: ANIM.compose },
      { to: '/admin/onboarding/history', label: 'History', icon: Clock, anim: ANIM.history },
      { to: '/admin/it-requests', label: 'IT Requests', icon: ClipboardList, anim: ANIM.itRequests },
      { to: '/admin/it-form-builder', label: 'Form Builder', icon: Settings, anim: ANIM.formBuild },
    ],
  },
  {
    label: 'Functional Mailbox',
    links: [
      { to: '/admin/mailbox-requests', label: 'Requests', icon: Mail, exact: true, anim: ANIM.mailbox },
      { to: '/admin/mailbox-form-builder', label: 'Form Builder', icon: Settings, anim: ANIM.formBuild },
    ],
  },
  {
    label: 'Offboarding',
    links: [
      { to: '/admin/offboarding', label: 'Processes', icon: UserMinus, exact: true, anim: ANIM.offboarding },
      { to: '/admin/offboarding-form-builder', label: 'Form Builder', icon: Settings, anim: ANIM.formBuild },
    ],
  },
]

export function AdminSidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (to, exact) => {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <motion.aside
      className="hidden lg:block py-3 pl-3 shrink-0 self-start"
      animate={{ width: collapsed ? 76 : 240 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className={cn(
        'rounded-2xl bg-card/90 backdrop-blur-sm border border-border/40 shadow-card flex flex-col max-h-[calc(100vh-5.5rem)] overflow-hidden',
        'bg-gradient-surface',
      )}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          {!collapsed && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display font-semibold text-[10px] text-muted-foreground uppercase tracking-widest"
            >
              Admin
            </motion.h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7 shrink-0', collapsed && 'mx-auto')}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronsLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          </Button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-4">
          {/* All Requests overview link */}
          <div>
            <SidebarLink
              to="/admin/all-requests"
              label="All Requests"
              icon={CalendarRange}
              anim={ANIM.planning}
              active={isActive('/admin/all-requests')}
              collapsed={collapsed}
            />
          </div>

          {sidebarSections.map((section, idx) => (
            <div key={section.label}>
              {idx > 0 && (
                <div className="mx-2 mb-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                </div>
              )}
              {!collapsed && (
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-2.5 mb-1 text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest"
                >
                  {section.label}
                </motion.h3>
              )}
              <div className="space-y-0.5">
                {section.links.map(({ to, label, icon, exact, anim }) => (
                  <SidebarLink
                    key={to}
                    to={to}
                    label={label}
                    icon={icon}
                    anim={anim}
                    active={isActive(to, exact)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Back link */}
        <div className="px-2 py-2 border-t border-border/30">
          <SidebarLink
            to="/"
            label="Back to Hub"
            icon={ArrowLeft}
            anim="group-hover:-translate-x-1"
            active={false}
            collapsed={collapsed}
          />
        </div>
      </div>
    </motion.aside>
  )
}

function SidebarLink({ to, label, icon: Icon, anim, active, collapsed }) {
  const content = (
    <Link to={to} className="group relative block">
      <Button
        variant={active ? 'secondary' : 'ghost'}
        className={cn(
          'w-full h-8 text-xs relative z-10',
          collapsed ? 'justify-center px-0' : 'justify-start gap-2.5',
        )}
        size="sm"
      >
        <Icon className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', anim)} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Button>
      {active && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-primary"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
