import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useProfiles } from '@/hooks/use-profiles'
import { useItRequests } from '@/hooks/use-it-requests'
import { useQRCodes } from '@/hooks/use-qr-codes'
import { useProducts } from '@/hooks/use-products'
import { useMailboxRequests } from '@/hooks/use-mailbox-requests'
import { Search, User, Package, QrCode, Mail, Inbox, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type Result = { id: string; label: string; sub?: string; group: string; icon: any; to: string }

export function GlobalSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: profiles = [] } = useProfiles()
  const { data: itRequests = [] } = useItRequests()
  const { data: devices = [] } = useQRCodes()
  const { data: products = [] } = useProducts()
  const { data: mailboxes = [] } = useMailboxRequests()

  // Open on Cmd/Ctrl+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); else { setQ(''); setActive(0) } }, [open])

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    const out: Result[] = []
    const hit = (s: any) => String(s || '').toLowerCase().includes(query)

    for (const p of (profiles as any[]).slice(0, 500)) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email
      if (hit(name) || hit(p.email) || hit(p.business_unit)) {
        out.push({ id: `u-${p.id}`, label: name, sub: p.email, group: t('globalSearch.people'), icon: User, to: `/admin/users/${p.id}` })
      }
    }
    for (const d of (devices as any[]).slice(0, 500)) {
      if (hit(d.product_name) || hit(d.serial_number) || hit(d.label) || hit(d.qr_code)) {
        out.push({ id: `d-${d.id}`, label: d.product_name || d.label, sub: d.serial_number || d.qr_code, group: t('globalSearch.devices'), icon: QrCode, to: `/admin/device-history` })
      }
    }
    for (const p of (products as any[]).slice(0, 500)) {
      if (hit(p.name) || hit(p.category_name)) {
        out.push({ id: `p-${p.id}`, label: p.name, sub: p.category_name, group: t('globalSearch.products'), icon: Package, to: `/admin/products` })
      }
    }
    for (const m of (mailboxes as any[]).slice(0, 500)) {
      if (hit(m.project_name) || hit(m.email_to_create) || hit(m.agency)) {
        out.push({ id: `m-${m.id}`, label: m.project_name || m.email_to_create, sub: m.email_to_create, group: t('globalSearch.mailboxes'), icon: Mail, to: `/admin/mailbox-requests` })
      }
    }
    for (const r of (itRequests as any[]).slice(0, 500)) {
      const data = r.data || {}
      const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email_to_create || r.type
      if (hit(name) || hit(r.type) || hit(data.company) || hit(data.business_unit)) {
        const to = r.type === 'onboarding' ? '/admin/onboarding/requests' : r.type === 'offboarding' ? '/admin/offboarding-requests' : '/admin/requests'
        out.push({ id: `r-${r.id}`, label: name, sub: String(t(`admin.requestTypes.${r.type}`, { defaultValue: r.type })), group: t('globalSearch.requests'), icon: Inbox, to })
      }
    }
    return out.slice(0, 24)
  }, [q, profiles, devices, products, mailboxes, itRequests, t])

  useEffect(() => { setActive(0) }, [q])

  const go = (r: Result) => { setOpen(false); navigate(r.to) }

  const onKeyDown = (e: any) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('globalSearch.placeholder')}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {q.trim() && results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('globalSearch.noResults')}</p>
          ) : !q.trim() ? (
            <p className="text-xs text-muted-foreground/70 text-center py-8">{t('globalSearch.hint')}</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => go(r)}
                onMouseEnter={() => setActive(i)}
                className={cn('w-full flex items-center gap-3 px-4 py-2 text-left transition-colors', i === active ? 'bg-primary/10' : 'hover:bg-muted/50')}
              >
                <r.icon className={cn('h-4 w-4 shrink-0', i === active ? 'text-primary' : 'text-muted-foreground')} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.label}</div>
                  {r.sub && <div className="text-xs text-muted-foreground truncate">{r.sub}</div>}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.group}</span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
