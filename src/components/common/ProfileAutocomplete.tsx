// @ts-nocheck — Phase-3 migration in progress; this file will be properly typed in a follow-up pass.
import { useState, useMemo, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { useProfiles } from '@/hooks/use-profiles'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/common/UserAvatar'
import { cn } from '@/lib/utils'

/**
 * Type-ahead picker on the existing profiles list. Used when an offboarding
 * form needs to identify the leaving person so we can pre-fill company /
 * email and surface their already-assigned equipment.
 *
 * Props:
 *   value         — currently typed text (free text, even if no profile matched)
 *   onChange(text)— called as the user types
 *   onSelect(profile) — called when a profile is picked from the dropdown
 *   placeholder
 */
export function ProfileAutocomplete({ value, onChange, onSelect, placeholder }) {
  const { data: profiles = [] } = useProfiles()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const matches = useMemo(() => {
    const q = (value || '').trim().toLowerCase()
    if (q.length < 2) return []
    return profiles
      .filter((p) => {
        const full = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase()
        const reverse = `${p.last_name || ''} ${p.first_name || ''}`.toLowerCase()
        const email = (p.email || '').toLowerCase()
        return full.includes(q) || reverse.includes(q) || email.includes(q)
      })
      .slice(0, 8)
  }, [profiles, value])

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto py-1">
          {matches.map((p) => {
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors',
                )}
              >
                <UserAvatar
                  avatarUrl={p.avatar_url}
                  firstName={p.first_name}
                  lastName={p.last_name}
                  email={p.email}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {p.email}{p.business_unit ? ` · ${p.business_unit}` : ''}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
