import { useState, useMemo } from 'react'
import { useProfiles } from '@/hooks/use-profiles'
import { useAllModuleAccess, useUpsertModuleAccess } from '@/hooks/use-module-access'
import { useAuth } from '@/lib/auth'
import {
  Search, ShieldCheck, Package, UserPlus, ClipboardList, Mail,
  Check, X, Loader2,
} from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useUIStore } from '@/stores/ui-store'

const MODULES = [
  { key: 'catalog', label: 'Catalog', icon: Package, color: 'text-primary', alwaysOn: true },
  { key: 'onboarding', label: 'Onboarding', icon: UserPlus, color: 'text-cyan-500' },
  { key: 'it_form', label: 'IT Form', icon: ClipboardList, color: 'text-amber-500' },
  { key: 'functional_mailbox', label: 'Mailbox', icon: Mail, color: 'text-violet-500' },
]

function AccessToggle({ userId, moduleKey, granted, alwaysOn, isAdmin, onToggle, isUpdating }) {
  if (alwaysOn) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center" title="Always accessible">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        </div>
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center" title="Admin: full access">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <button
        onClick={() => onToggle(userId, moduleKey, !granted)}
        disabled={isUpdating}
        className={`
          h-7 w-12 rounded-full relative transition-colors duration-200 cursor-pointer
          ${granted ? 'bg-emerald-500' : 'bg-muted-foreground/20'}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={granted ? 'Access granted — click to revoke' : 'No access — click to grant'}
      >
        {isUpdating ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-3 w-3 animate-spin text-white" />
          </div>
        ) : (
          <div
            className={`
              absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm
              transition-transform duration-200
              ${granted ? 'translate-x-5.5' : 'translate-x-0.5'}
            `}
          />
        )}
      </button>
    </div>
  )
}

export function AdminModuleAccessPage() {
  const { data: profiles = [], isLoading: profilesLoading } = useProfiles({})
  const { data: allAccess = [], isLoading: accessLoading } = useAllModuleAccess()
  const upsertAccess = useUpsertModuleAccess()
  const { user: currentUser } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [updatingKey, setUpdatingKey] = useState(null) // "userId:moduleKey"

  // Build a lookup map: userId:moduleKey → granted
  const accessMap = useMemo(() => {
    const map = {}
    allAccess.forEach((row) => {
      map[`${row.user_id}:${row.module_key}`] = row.granted
    })
    return map
  }, [allAccess])

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles
    const q = search.toLowerCase()
    return profiles.filter(
      (p) =>
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.department || '').toLowerCase().includes(q)
    )
  }, [profiles, search])

  const handleToggle = async (userId, moduleKey, granted) => {
    const key = `${userId}:${moduleKey}`
    setUpdatingKey(key)
    try {
      await upsertAccess.mutateAsync({ userId, moduleKey, granted })
      showToast(granted ? `Access granted` : `Access revoked`)
    } catch (err) {
      showToast(err.message || 'Failed to update access', 'error')
    } finally {
      setUpdatingKey(null)
    }
  }

  if (profilesLoading || accessLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader title="Module Access" description="Control which modules each user can access" />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-emerald-500" />
          </div>
          <span>Always on</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-2.5 w-2.5 text-primary" />
          </div>
          <span>Admin (full access)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-8 rounded-full bg-emerald-500" />
          <span>Granted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-8 rounded-full bg-muted-foreground/20" />
          <span>No access</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Access matrix table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">User</TableHead>
              {MODULES.map((mod) => {
                const Icon = mod.icon
                return (
                  <TableHead key={mod.key} className="text-center w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <Icon className={`h-4 w-4 ${mod.color}`} />
                      <span className="text-[10px] uppercase tracking-wider">{mod.label}</span>
                      {mod.alwaysOn && (
                        <Badge variant="outline" className="text-[8px] py-0">All users</Badge>
                      )}
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const isUserAdmin = p.role === 'admin'
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatarUrl={p.avatar_url}
                        firstName={p.first_name}
                        lastName={p.last_name}
                        email={p.email}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.full_name || 'Unnamed'}
                          {p.id === currentUser?.id && (
                            <span className="text-[10px] text-muted-foreground ml-1">(you)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{p.email}</div>
                      </div>
                      {isUserAdmin && (
                        <Badge className="bg-red-500/20 text-red-400 text-[10px] shrink-0">Admin</Badge>
                      )}
                    </div>
                  </TableCell>
                  {MODULES.map((mod) => {
                    const key = `${p.id}:${mod.key}`
                    const granted = accessMap[key] ?? false
                    return (
                      <TableCell key={mod.key}>
                        <AccessToggle
                          userId={p.id}
                          moduleKey={mod.key}
                          granted={granted}
                          alwaysOn={mod.alwaysOn}
                          isAdmin={isUserAdmin}
                          onToggle={handleToggle}
                          isUpdating={updatingKey === key}
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={MODULES.length + 1} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{profiles.length} user{profiles.length !== 1 ? 's' : ''} total</span>
        <span>·</span>
        <span>{allAccess.filter((a) => a.granted).length} module access{allAccess.filter((a) => a.granted).length !== 1 ? 'es' : ''} granted</span>
      </div>
    </div>
  )
}
