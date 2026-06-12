// @ts-nocheck — Phase-3 migration in progress; this file will be properly typed in a follow-up pass.
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  useDeviceCredentials, useCreateDeviceCredential,
  useUpdateDeviceCredential, useDeleteDeviceCredential,
} from '@/hooks/use-device-credentials'
import { useQRCodes } from '@/hooks/use-qr-codes'
import { Search, Plus, Trash2, Loader2, Download, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

function EditableCell({ value, type = 'text', onChange, placeholder, masked = false, className }) {
  const [local, setLocal] = useState(value ?? '')
  const initial = useRef(value ?? '')
  useEffect(() => { setLocal(value ?? ''); initial.current = value ?? '' }, [value])

  const commit = () => {
    if (String(local) === String(initial.current)) return
    onChange(local === '' ? null : local)
    initial.current = local
  }

  return (
    <input
      type={masked ? 'password' : type}
      value={local ?? ''}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.target.blur()
        if (e.key === 'Escape') { setLocal(initial.current); e.target.blur() }
      }}
      placeholder={placeholder}
      className={cn(
        'w-full min-w-0 px-2 py-1.5 text-xs bg-transparent border border-transparent rounded font-mono',
        'focus:bg-card focus:border-primary/30 focus:outline-none transition-colors',
        'hover:bg-muted/30',
        className,
      )}
    />
  )
}

const STATUS_COLORS = {
  available: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  assigned:  'bg-amber-500/15 text-amber-600 border-amber-500/30',
  reserved:  'bg-blue-500/15 text-blue-600 border-blue-500/30',
  damaged:   'bg-rose-500/15 text-rose-600 border-rose-500/30',
  lost:      'bg-rose-500/15 text-rose-600 border-rose-500/30',
}

const COLUMNS = [
  { key: 'imei',            label: 'IMEI',           width: '150px' },
  { key: 'serial_number',   label: 'Serial',         width: '130px' },
  { key: 'phone_number',    label: 'Phone',          width: '130px' },
  { key: 'sim_iccid',       label: 'SIM ICCID',      width: '180px' },
  { key: 'sim_pin',         label: 'SIM PIN',        width: '80px',  masked: true },
  { key: 'carrier',         label: 'Carrier',        width: '110px' },
  { key: 'mac_address',     label: 'MAC',            width: '140px' },
  { key: 'wifi_ssid',       label: 'WiFi SSID',      width: '150px' },
  { key: 'wifi_password',   label: 'WiFi pwd',       width: '110px', masked: true },
  { key: 'router_password', label: 'Router pwd',     width: '110px', masked: true },
  { key: 'os_version',      label: 'OS',             width: '90px' },
  { key: 'notes',           label: 'Notes',          width: '200px' },
]

export function AdminDeviceCredentialsPage() {
  const { data: rows = [], isLoading } = useDeviceCredentials()
  const { data: qrCodes = [] } = useQRCodes()
  const createItem = useCreateDeviceCredential()
  const updateItem = useUpdateDeviceCredential()
  const deleteItem = useDeleteDeviceCredential()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [revealSecrets, setRevealSecrets] = useState(false)

  const categories = useMemo(() => {
    const set = new Set()
    rows.forEach((r) => {
      const name = r.qr_code?.product?.category?.name
      if (name) set.add(name)
    })
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    let r = rows
    if (categoryFilter !== 'all') {
      r = r.filter((x) => x.qr_code?.product?.category?.name === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter((x) =>
        (x.qr_code?.code || '').toLowerCase().includes(q) ||
        (x.qr_code?.product?.name || '').toLowerCase().includes(q) ||
        (x.imei || '').toLowerCase().includes(q) ||
        (x.serial_number || '').toLowerCase().includes(q) ||
        (x.phone_number || '').toLowerCase().includes(q) ||
        (x.notes || '').toLowerCase().includes(q),
      )
    }
    return r.sort((a, b) => (a.qr_code?.code || '').localeCompare(b.qr_code?.code || ''))
  }, [rows, search, categoryFilter])

  const usedQrIds = useMemo(() => new Set(rows.map((r) => r.qr_code_id)), [rows])
  const availableQrs = useMemo(
    () => qrCodes.filter((q) => !usedQrIds.has(q.id)).sort((a, b) => a.code.localeCompare(b.code)),
    [qrCodes, usedQrIds],
  )

  const handleAdd = useCallback(async () => {
    if (availableQrs.length === 0) {
      showToast('All QR codes already have credentials attached', 'info')
      return
    }
    const choices = availableQrs.slice(0, 50).map((q, i) => `${i + 1}. ${q.code}`).join('\n')
    const pick = prompt(`Pick a QR code (number):\n\n${choices}`)
    const idx = parseInt(pick, 10) - 1
    if (Number.isNaN(idx) || idx < 0 || idx >= availableQrs.length) return
    try {
      await createItem.mutateAsync({ qr_code_id: availableQrs[idx].id })
    } catch (err) {
      showToast(err.message || 'Failed to add', 'error')
    }
  }, [availableQrs, createItem, showToast])

  const handleUpdate = useCallback(async (id, field, value) => {
    try {
      await updateItem.mutateAsync({ id, [field]: value })
    } catch (err) {
      showToast(err.message || 'Save failed', 'error')
    }
  }, [updateItem, showToast])

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Delete these credentials? The QR code itself stays.')) return
    try {
      await deleteItem.mutateAsync(id)
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error')
    }
  }, [deleteItem, showToast])

  const handleExportCsv = useCallback(() => {
    const headers = ['QR Code', 'Product', 'Category', 'Status', 'Assigned To', ...COLUMNS.map((c) => c.label)]
    const lines = filtered.map((r) => {
      const row = [
        r.qr_code?.code || '',
        r.qr_code?.product?.name || '',
        r.qr_code?.product?.category?.name || '',
        r.qr_code?.status || '',
        r.qr_code?.assigned_to_name || '',
        ...COLUMNS.map((c) => r[c.key] ?? ''),
      ]
      return row.map((v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)).join(',')
    })
    const csv = [headers.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `device-credentials-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }, [filtered])

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Device Credentials"
        description={`${rows.length} device${rows.length !== 1 ? 's' : ''} with sensitive IT data (admin-only)`}
      />

      <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          IMEI, SIM PIN, WiFi passwords and router credentials are visible on this page.
          Don't share screenshots. Edits are logged.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search code, product, IMEI, serial, phone…"
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-md border border-input bg-background"
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRevealSecrets((v) => !v)}
          className="gap-1.5"
        >
          {revealSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {revealSecrets ? 'Hide secrets' : 'Reveal secrets'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <Button size="sm" onClick={handleAdd} disabled={createItem.isPending} className="gap-1.5">
          {createItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add credentials
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto bg-card">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/40 border-b border-border sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: '160px' }}>
                QR Code
              </th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: '180px' }}>
                Product
              </th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: '100px' }}>
                Status
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 4} className="py-12 text-center text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No credentials match the current filter.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-2 py-1.5 align-middle font-mono text-[11px] text-foreground/90">
                    {r.qr_code?.code || '—'}
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <div className="truncate">{r.qr_code?.product?.name || '—'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {r.qr_code?.product?.category?.name || ''}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    {r.qr_code?.status && (
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[r.qr_code.status])}>
                        {r.qr_code.status}
                      </Badge>
                    )}
                    {r.qr_code?.assigned_to_name && (
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {r.qr_code.assigned_to_name}
                      </div>
                    )}
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-1 py-0.5 align-middle" style={{ width: col.width, minWidth: col.width }}>
                      <EditableCell
                        value={r[col.key]}
                        masked={col.masked && !revealSecrets}
                        onChange={(v) => handleUpdate(r.id, col.key, v)}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-0.5 align-middle">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded"
                      title="Delete credentials"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
