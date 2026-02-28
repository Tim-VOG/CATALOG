import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, Users } from 'lucide-react'
import { UserAvatar } from '@/components/common/UserAvatar'
import { CalendarFilterBar } from './CalendarFilterBar'
import { cn } from '@/lib/utils'

function UserFilterDropdown({ users, selectedUsers, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = search
    ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
    : users

  const toggleUser = (userId) => {
    const next = selectedUsers.includes(userId)
      ? selectedUsers.filter((id) => id !== userId)
      : [...selectedUsers, userId]
    onChange(next)
  }

  const clearAll = () => onChange([])

  const selectedNames = users
    .filter((u) => selectedUsers.includes(u.id))
    .map((u) => u.name.split(' ')[0])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
          selectedUsers.length > 0
            ? 'bg-blue-500/15 text-blue-500 border-blue-500/30 shadow-sm'
            : 'bg-muted/20 text-muted-foreground/60 border-transparent hover:bg-muted/40'
        )}
      >
        <Users className="h-3 w-3" />
        {selectedUsers.length > 0 ? (
          <span className="max-w-[120px] truncate">
            {selectedNames.length <= 2 ? selectedNames.join(', ') : `${selectedNames.length} users`}
          </span>
        ) : (
          'All users'
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-border/50 bg-card shadow-lg z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border/30">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30">
              <Search className="h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="h-3 w-3 text-muted-foreground/50" />
                </button>
              )}
            </div>
          </div>

          {/* User list */}
          <div className="max-h-[240px] overflow-y-auto p-1">
            {selectedUsers.length > 0 && (
              <button
                onClick={clearAll}
                className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
            {filtered.map((user) => {
              const isActive = selectedUsers.includes(user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all',
                    isActive ? 'bg-blue-500/10 text-foreground' : 'hover:bg-muted/30 text-muted-foreground'
                  )}
                >
                  <UserAvatar
                    avatarUrl={user.avatar}
                    firstName={user.name?.split(' ')[0]}
                    lastName={user.name?.split(' ')[1]}
                    email={user.email}
                    size="sm"
                    className="h-6 w-6 text-[9px]"
                  />
                  <span className="flex-1 truncate font-medium">{user.name}</span>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground/50 text-center">No users found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminCalendarFilterBar({ filters, onChange, counts, users }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Base type + status filters */}
      <CalendarFilterBar
        filters={filters}
        onChange={onChange}
        counts={counts}
        hasCatalog
        hasItForm
        hasMailbox
      />

      {/* Separator */}
      <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />

      {/* User filter */}
      <UserFilterDropdown
        users={users}
        selectedUsers={filters.users || []}
        onChange={(userIds) => onChange({ ...filters, users: userIds })}
      />
    </div>
  )
}
