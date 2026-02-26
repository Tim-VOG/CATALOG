import { useState, useEffect, useRef } from 'react'
import { useProfiles } from '@/hooks/use-profiles'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

/**
 * Searchable user select component for admin features.
 *
 * Props:
 *   value      - selected user object ({ id, first_name, last_name, email, avatar_url }) or null
 *   onChange    - callback with selected user or null
 *   placeholder - input placeholder text
 *   className  - additional className
 */
export function UserSearchSelect({ value, onChange, placeholder = 'Search user by name or email...', className = '' }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { data: profiles = [] } = useProfiles({
    search: debouncedSearch.trim() || undefined,
  })

  // Only show active users, limit to 8
  const filteredProfiles = profiles
    .filter((p) => p.is_active !== false)
    .slice(0, 8)

  const handleSelect = (profile) => {
    onChange(profile)
    setSearch('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setSearch('')
  }

  // If a user is selected, show their card
  if (value) {
    return (
      <div className={`flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5 ${className}`}>
        <UserAvatar
          avatarUrl={value.avatar_url}
          firstName={value.first_name}
          lastName={value.last_name}
          email={value.email}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {value.first_name} {value.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{value.email}</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 rounded-full p-1 hover:bg-muted transition-colors"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {open && debouncedSearch.trim().length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {filteredProfiles.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No users found</div>
          ) : (
            filteredProfiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
              >
                <UserAvatar
                  avatarUrl={p.avatar_url}
                  firstName={p.first_name}
                  lastName={p.last_name}
                  email={p.email}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                {p.department && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{p.department}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
