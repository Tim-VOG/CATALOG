import { useState, useMemo } from 'react'
import { useProfiles, useUpdateProfile, useUpdateProfileRole, useToggleProfileActive, useDeleteProfile } from '@/hooks/use-profiles'
import { useAllModuleAccess, useUpsertModuleAccess } from '@/hooks/use-module-access'
import { useInvitations, useDeleteInvitation } from '@/hooks/use-invitations'
import { useAuth } from '@/lib/auth'
import {
  Search, Trash2,
  Package, UserPlus, ClipboardList, Mail, UserMinus,
  Check, Loader2, ShieldCheck, Clock, X, Send, Pencil,
} from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { InviteUserDialog } from '@/components/admin/InviteUserDialog'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'user', label: 'User', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'admin', label: 'Admin', color: 'bg-red-500/20 text-red-400' },
]

const ROLE_FILTERS = ['all', 'admin', 'user']

const BUSINESS_UNITS = [
  'VO GROUP', 'THE LITTLE VOICE', 'VO EVENT', 'VO CONSULTING',
  'VO PRODUCTION', 'VO STUDIOS', 'KRAFTHAUS',
]

const MODULES = [
  { key: 'catalog', label: 'Catalog', icon: Package, color: 'text-primary', bg: 'bg-primary/10', alwaysOn: true },
  { key: 'onboarding', label: 'Onboarding', icon: UserPlus, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { key: 'it_form', label: 'IT Form', icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'functional_mailbox', label: 'Mailbox', icon: Mail, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { key: 'offboarding', label: 'Offboarding', icon: UserMinus, color: 'text-rose-500', bg: 'bg-rose-500/10' },
]

/* ------------------------------------------------------------------ */
/*  ModuleToggle – small 7x7 icon button per module                   */
/* ------------------------------------------------------------------ */
function ModuleToggle({ userId, mod, granted, isAdmin, onToggle, isUpdating }) {
  const Icon = mod.icon

  // Catalog is always on for everyone
  if (mod.alwaysOn) {
    return (
      <div
        className={cn('h-7 w-7 rounded-lg flex items-center justify-center', mod.bg)}
        title={`${mod.label} — always on`}
      >
        <Icon className={cn('h-3.5 w-3.5', mod.color)} />
      </div>
    )
  }

  // Admins get full access automatically
  if (isAdmin) {
    return (
      <div
        className="h-7 w-7 rounded-lg flex items-center justify-center bg-primary/10"
        title={`${mod.label} — admin (full access)`}
      >
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
      </div>
    )
  }

  // Regular toggle
  return (
    <button
      onClick={() => onToggle(userId, mod.key, !granted)}
      disabled={isUpdating}
      className={cn(
        'h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        granted ? mod.bg : 'bg-muted-foreground/10',
      )}
      title={granted ? `${mod.label} — granted (click to revoke)` : `${mod.label} — no access (click to grant)`}
    >
      {isUpdating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Icon className={cn('h-3.5 w-3.5', granted ? mod.color : 'text-muted-foreground/40')} />
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  AdminUsersPage                                                     */
/* ------------------------------------------------------------------ */
export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [buFilter, setBuFilter] = useState('all')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editingInvitation, setEditingInvitation] = useState(null)

  const { data: profiles = [], isLoading: profilesLoading } = useProfiles({ search: search.trim() || undefined, role: roleFilter })
  const { data: allAccess = [], isLoading: accessLoading } = useAllModuleAccess()
  const { data: invitations = [] } = useInvitations('pending')
  const cancelInvitation = useDeleteInvitation()

  const updateProfile = useUpdateProfile()
  const updateRole = useUpdateProfileRole()
  const toggleActive = useToggleProfileActive()
  const deleteProfile = useDeleteProfile()
  const upsertAccess = useUpsertModuleAccess()

  const { user: currentUser } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [confirmDialog, setConfirmDialog] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [updatingKey, setUpdatingKey] = useState(null)

  // Access map: "userId:moduleKey" -> granted
  const accessMap = useMemo(() => {
    const map = {}
    allAccess.forEach((row) => {
      map[`${row.user_id}:${row.module_key}`] = row.granted
    })
    return map
  }, [allAccess])

  // Filter by Business Unit
  const filtered = useMemo(() => {
    if (buFilter === 'all') return profiles
    return profiles.filter((p) => p.business_unit === buFilter)
  }, [profiles, buFilter])

  /* ---------- handlers ---------- */

  const handleRoleChange = (userId, newRole, userName) => {
    setConfirmDialog({ userId, newRole, userName })
  }

  const confirmRoleChange = async () => {
    if (!confirmDialog) return
    try {
      await updateRole.mutateAsync({ userId: confirmDialog.userId, role: confirmDialog.newRole })
      showToast(`Role updated to ${confirmDialog.newRole}`)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setConfirmDialog(null)
  }

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await toggleActive.mutateAsync({ userId, isActive: !currentActive })
      showToast(currentActive ? 'User deactivated' : 'User activated')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleBuChange = async (userId, value) => {
    try {
      await updateProfile.mutateAsync({ userId, business_unit: value || null })
      showToast('Business unit updated')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleModuleToggle = async (userId, moduleKey, granted) => {
    const key = `${userId}:${moduleKey}`
    setUpdatingKey(key)
    try {
      await upsertAccess.mutateAsync({ userId, moduleKey, granted })
      showToast(granted ? 'Access granted' : 'Access revoked')
    } catch (err) {
      showToast(err.message || 'Failed to update access', 'error')
    } finally {
      setUpdatingKey(null)
    }
  }

  const handleDelete = (userId, userName) => {
    setDeleteDialog({ userId, userName })
  }

  const confirmDelete = async () => {
    if (!deleteDialog) return
    try {
      await deleteProfile.mutateAsync(deleteDialog.userId)
      showToast('User deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
    setDeleteDialog(null)
  }

  /* ---------- render ---------- */

  const handleCancelInvitation = async (inv) => {
    try {
      await cancelInvitation.mutateAsync(inv.id)
      showToast('Invitation cancelled')
    } catch (err) {
      showToast(err.message || 'Failed to cancel invitation', 'error')
    }
  }

  if (profilesLoading || accessLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Users"
        description={`${filtered.length} user${filtered.length !== 1 ? 's' : ''}`}
      >
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <Send className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </AdminPageHeader>

      {/* Module legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {MODULES.map((mod) => {
          const Icon = mod.icon
          return (
            <div key={mod.key} className="flex items-center gap-1.5">
              <div className={cn('h-5 w-5 rounded-md flex items-center justify-center', mod.bg)}>
                <Icon className={cn('h-3 w-3', mod.color)} />
              </div>
              <span>{mod.label}</span>
            </div>
          )
        })}
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
          <div className="h-5 w-5 rounded-md flex items-center justify-center bg-primary/10">
            <ShieldCheck className="h-3 w-3 text-primary" />
          </div>
          <span>Admin (full access)</span>
        </div>
      </div>

      {/* Pending invitations banner */}
      {invitations.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-400">
              Pending Invitations ({invitations.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {invitations.map((inv) => {
              const isSent = !!inv.email_sent_at
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-sm"
                >
                  <span className="text-foreground">
                    {inv.first_name || inv.last_name
                      ? `${inv.first_name} ${inv.last_name}`.trim()
                      : inv.email}
                  </span>
                  {(inv.first_name || inv.last_name) && (
                    <span className="text-muted-foreground text-xs">{inv.email}</span>
                  )}
                  {isSent ? (
                    <Badge className="bg-green-500/20 text-green-400 text-[10px]">Sent</Badge>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground text-[10px]">Draft</Badge>
                  )}
                  {!isSent && (
                    <button
                      onClick={() => {
                        setEditingInvitation(inv)
                        setInviteOpen(true)
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      title="Edit draft"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleCancelInvitation(inv)}
                    className="text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                    title="Cancel invitation"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Role filter buttons */}
        <div className="flex gap-1">
          {ROLE_FILTERS.map((role) => (
            <Button
              key={role}
              variant={roleFilter === role ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setRoleFilter(role)}
              className="capitalize"
            >
              {role === 'all' ? 'All' : role}
            </Button>
          ))}
        </div>

        {/* BU filter dropdown */}
        <Select
          value={buFilter}
          onChange={(e) => setBuFilter(e.target.value)}
          className="w-44 h-8 text-xs"
        >
          <option value="all">All Business Units</option>
          {BUSINESS_UNITS.map((bu) => (
            <option key={bu} value={bu}>{bu}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[260px]">User</TableHead>
              <TableHead className="w-[180px]">Business Unit</TableHead>
              <TableHead className="w-[110px]">Role</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const isSelf = p.id === currentUser?.id
              const isUserAdmin = p.role === 'admin'
              const inactive = p.is_active === false

              return (
                <TableRow key={p.id} className={cn(inactive && 'opacity-50')}>
                  {/* User */}
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
                          {isSelf && (
                            <span className="text-[10px] text-muted-foreground ml-1">(you)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{p.email}</div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Business Unit */}
                  <TableCell>
                    {isSelf ? (
                      <span className="text-sm text-muted-foreground">{p.business_unit || '—'}</span>
                    ) : (
                      <Select
                        value={p.business_unit || ''}
                        onChange={(e) => handleBuChange(p.id, e.target.value)}
                        className="w-40 h-8 text-xs"
                      >
                        <option value="">— None —</option>
                        {BUSINESS_UNITS.map((bu) => (
                          <option key={bu} value={bu}>{bu}</option>
                        ))}
                      </Select>
                    )}
                  </TableCell>

                  {/* Role */}
                  <TableCell>
                    {isSelf ? (
                      (() => {
                        const opt = ROLE_OPTIONS.find((r) => r.value === p.role) || ROLE_OPTIONS[0]
                        return <Badge className={opt.color}>{opt.label}</Badge>
                      })()
                    ) : (
                      <Select
                        value={p.role}
                        onChange={(e) => handleRoleChange(p.id, e.target.value, p.full_name || p.email)}
                        className="w-24 h-8 text-xs"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </Select>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {isSelf ? (
                      <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleToggleActive(p.id, p.is_active !== false)}
                      >
                        {p.is_active !== false ? (
                          <Badge className="bg-green-500/20 text-green-400 cursor-pointer">Active</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 cursor-pointer">Disabled</Badge>
                        )}
                      </Button>
                    )}
                  </TableCell>

                  {/* Permissions */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {MODULES.map((mod) => {
                        const key = `${p.id}:${mod.key}`
                        const granted = accessMap[key] ?? false
                        return (
                          <ModuleToggle
                            key={mod.key}
                            userId={p.id}
                            mod={mod}
                            granted={granted}
                            isAdmin={isUserAdmin}
                            onToggle={handleModuleToggle}
                            isUpdating={updatingKey === key}
                          />
                        )
                      })}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    {!isSelf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-400"
                        onClick={() => handleDelete(p.id, p.full_name || p.email)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirm role change dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Change <strong>{confirmDialog?.userName}</strong>&apos;s role to{' '}
            <strong className="capitalize">{confirmDialog?.newRole}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button onClick={confirmRoleChange} disabled={updateRole.isPending}>
              {updateRole.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user confirmation dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteDialog?.userName}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteProfile.isPending}>
              {deleteProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Invite user dialog */}
      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) setEditingInvitation(null)
        }}
        invitation={editingInvitation}
      />
    </div>
  )
}
