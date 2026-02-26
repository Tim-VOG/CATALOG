import { useState, useMemo } from 'react'
import { useProfiles, useUpdateProfileRole, useToggleProfileActive } from '@/hooks/use-profiles'
import { useAuth } from '@/lib/auth'
import { Search, Users, Shield, ShieldCheck, User } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/stores/ui-store'

const ROLE_OPTIONS = [
  { value: 'user', label: 'User', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'manager', label: 'Manager', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'admin', label: 'Admin', color: 'bg-red-500/20 text-red-400' },
]

const ROLE_FILTERS = ['all', 'admin', 'manager', 'user']

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const { data: profiles = [], isLoading } = useProfiles({ search: search.trim() || undefined, role: roleFilter })
  const updateRole = useUpdateProfileRole()
  const toggleActive = useToggleProfileActive()
  const { user: currentUser } = useAuth()
  const showToast = useUIStore((s) => s.showToast)

  const [confirmDialog, setConfirmDialog] = useState(null)

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

  const getRoleBadge = (role) => {
    const opt = ROLE_OPTIONS.find((r) => r.value === role) || ROLE_OPTIONS[0]
    return <Badge className={opt.color}>{opt.label}</Badge>
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">{profiles.length} user{profiles.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

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
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((p) => {
            const isSelf = p.id === currentUser?.id
            return (
              <TableRow key={p.id} className={!p.is_active && p.is_active !== undefined ? 'opacity-50' : ''}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={p.avatar_url}
                      firstName={p.first_name}
                      lastName={p.last_name}
                      email={p.email}
                      size="md"
                    />
                    <div>
                      <div className="font-medium">{p.full_name || 'Unnamed'}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{p.department || '—'}</span>
                </TableCell>
                <TableCell>
                  {isSelf ? (
                    getRoleBadge(p.role)
                  ) : (
                    <Select
                      value={p.role}
                      onChange={(e) => handleRoleChange(p.id, e.target.value, p.full_name || p.email)}
                      className="w-28 h-8 text-xs"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </Select>
                  )}
                </TableCell>
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
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
          {profiles.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Change <strong>{confirmDialog?.userName}</strong>'s role to <strong className="capitalize">{confirmDialog?.newRole}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button onClick={confirmRoleChange}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
