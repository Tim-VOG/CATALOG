import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSharedMailboxes, useCreateSharedMailbox, useUpdateSharedMailbox, useDeleteSharedMailbox,
} from '@/hooks/use-shared-mailboxes'
import { Search, Plus, Trash2, Loader2, Download, Mail, Upload, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

// Minimal CSV parser (handles quoted fields with commas / newlines).
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

const CATEGORIES = ['LEGER', 'MOYEN', 'LOURD']
const LICENCES = ['SHARED MAILBOX', 'Plan 1', 'O365 Premium', 'ARCHIVED']
const PROFILES = ['WORK MAILBOX', 'ARCHIVED', 'EMPLOYEE']
const COMPANIES = [
  'MIT', 'SIGN', 'STUDIO GONDO', 'THE LITTLE VOICE',
  'VO EU EVENT', 'VO EUR', 'VO EVENT', 'VO GROUP',
]

// ── Editable cell (debounced commit on blur) ──
function EditableCell({ value, type = 'text', onChange, placeholder, className  }: any) {
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
      type={type}
      value={local ?? ''}
      onChange={(e: any) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter') (e.target as any).blur()
        if (e.key === 'Escape') { setLocal(initial.current); (e.target as any).blur() }
      }}
      placeholder={placeholder}
      className={cn(
        'w-full min-w-0 px-2 py-1.5 text-xs bg-transparent border border-transparent rounded',
        'focus:bg-card focus:border-primary/30 focus:outline-none transition-colors',
        'hover:bg-muted/30',
        className,
      )}
    />
  )
}

function SelectCell({ value, options, onChange  }: any) {
  return (
    <select
      value={value ?? ''}
      onChange={(e: any) => onChange(e.target.value || null)}
      className="w-full px-2 py-1.5 text-xs bg-transparent border border-transparent rounded focus:bg-card focus:border-primary/30 focus:outline-none hover:bg-muted/30"
    >
      <option value="">—</option>
      {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function CheckboxCell({ value, onChange  }: any) {
  return (
    <input
      type="checkbox"
      checked={!!value}
      onChange={(e: any) => onChange(e.target.checked)}
      className="h-4 w-4"
    />
  )
}

const CAT_COLORS = {
  LEGER: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  MOYEN: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  LOURD: 'bg-rose-500/15 text-rose-600 border-rose-500/30',
}

function buildColumns(t: (key: string) => string) {
  return [
    { key: 'name',           label: t('admin.sharedMailboxes.columnName'),          type: 'text',   width: '200px' },
    { key: 'mail',           label: t('admin.sharedMailboxes.columnMail'),          type: 'text',   width: '220px' },
    { key: 'company',        label: t('admin.sharedMailboxes.columnCompany'),       type: 'select', width: '130px', options: COMPANIES },
    { key: 'category',       label: t('admin.sharedMailboxes.columnCategory'),      type: 'select', width: '90px',  options: CATEGORIES, render: 'badge' },
    { key: 'licence',        label: t('admin.sharedMailboxes.columnLicence'),       type: 'select', width: '140px', options: LICENCES },
    { key: 'licence_checked',label: '✓',                                            type: 'checkbox', width: '40px' },
    { key: 'profile',        label: t('admin.sharedMailboxes.columnProfile'),       type: 'select', width: '130px', options: PROFILES },
    { key: 'project_leader', label: t('admin.sharedMailboxes.columnProjectLeader'), type: 'text',   width: '160px' },
    { key: 'display_name',   label: t('admin.sharedMailboxes.columnDisplayName'),   type: 'text',   width: '200px' },
    { key: 'have_access',    label: t('admin.sharedMailboxes.columnAccess'),        type: 'text',   width: '200px' },
    { key: 'job_title',      label: t('admin.sharedMailboxes.columnJobTitle'),      type: 'text',   width: '180px' },
    { key: 'archive_from',   label: t('admin.sharedMailboxes.columnArchiveFrom'),   type: 'date',   width: '130px' },
    { key: 'archive_to',     label: t('admin.sharedMailboxes.columnArchiveTo'),     type: 'date',   width: '130px' },
    { key: 'delete_on',      label: t('admin.sharedMailboxes.columnDeleteOn'),      type: 'date',   width: '130px' },
    { key: 'created_in',     label: t('admin.sharedMailboxes.columnCreatedIn'),     type: 'text',   width: '90px' },
  ]
}

export function AdminSharedMailboxesPage() {
  const { t } = useTranslation()
  const { data: rows = [], isLoading } = useSharedMailboxes()
  const createItem = useCreateSharedMailbox()
  const updateItem = useUpdateSharedMailbox()
  const deleteItem = useDeleteSharedMailbox()
  const showToast = useUIStore((s: any) => s.showToast)

  const COLUMNS = useMemo(() => buildColumns(t), [t])

  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkEdit, setBulkEdit] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    let r = rows
    if (companyFilter !== 'all') r = r.filter((x: any) => x.company === companyFilter)
    if (catFilter !== 'all') r = r.filter((x: any) => x.category === catFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter((x: any) =>
        (x.name || '').toLowerCase().includes(q) ||
        (x.mail || '').toLowerCase().includes(q) ||
        (x.project_leader || '').toLowerCase().includes(q) ||
        (x.display_name || '').toLowerCase().includes(q),
      )
    }
    return r
  }, [rows, search, companyFilter, catFilter])

  const counts = useMemo(() => ({
    total: rows.length,
    leger: rows.filter((r: any) => r.category === 'LEGER').length,
    moyen: rows.filter((r: any) => r.category === 'MOYEN').length,
    lourd: rows.filter((r: any) => r.category === 'LOURD').length,
  }), [rows])

  const companiesPresent = useMemo(() => {
    const s = new Set(COMPANIES)
    rows.forEach((r: any) => r.company && s.add(r.company))
    return Array.from(s).sort()
  }, [rows])

  const handleAdd = useCallback(async () => {
    try {
      await createItem.mutateAsync({ name: t('admin.sharedMailboxes.newMailboxName'), category: 'LEGER' })
    } catch (err: any) {
      showToast(err.message || t('admin.sharedMailboxes.errorAddFailed'), 'error')
    }
  }, [createItem, showToast, t])

  const handleUpdate = useCallback(async (id: any, field: any, value: any) => {
    try {
      await updateItem.mutateAsync({ id, [field]: value })
    } catch (err: any) {
      showToast(err.message || t('admin.sharedMailboxes.errorSaveFailed'), 'error')
    }
  }, [updateItem, showToast, t])

  const handleDelete = useCallback(async (id: any) => {
    if (!confirm(t('admin.sharedMailboxes.confirmDelete'))) return
    try {
      await deleteItem.mutateAsync(id)
    } catch (err: any) {
      showToast(err.message || t('admin.sharedMailboxes.errorDeleteFailed'), 'error')
    }
  }, [deleteItem, showToast, t])

  const handleExportCsv = useCallback(() => {
    const headers = COLUMNS.map((c: any) => c.label).join(',')
    const lines = filtered.map((r: any) =>
      COLUMNS.map((col: any) => {
        const v = r[col.key]
        if (v == null || v === false) return ''
        if (v === true) return t('admin.sharedMailboxes.exportYes')
        return /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)
      }).join(',')
    )
    const csv = [headers, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `shared-mailboxes-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }, [filtered, COLUMNS, t])

  // ── Selection ──
  const toggleRow = (id: string) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const allFilteredSelected = filtered.length > 0 && filtered.every((r: any) => selected.has(r.id))
  const toggleAll = () => setSelected((prev) => {
    if (allFilteredSelected) { const n = new Set(prev); filtered.forEach((r: any) => n.delete(r.id)); return n }
    const n = new Set(prev); filtered.forEach((r: any) => n.add(r.id)); return n
  })
  const clearSelection = () => setSelected(new Set())

  // ── Bulk delete ──
  const handleBulkDelete = useCallback(async () => {
    if (!confirm(t('admin.sharedMailboxes.confirmBulkDelete', { count: selected.size }))) return
    setBusy(true)
    try {
      for (const id of Array.from(selected)) await deleteItem.mutateAsync(id)
      showToast(t('admin.sharedMailboxes.bulkDeleted', { count: selected.size }))
      clearSelection()
    } catch (err: any) {
      showToast(err.message || t('admin.sharedMailboxes.errorDeleteFailed'), 'error')
    } finally { setBusy(false) }
  }, [selected, deleteItem, showToast, t])

  // ── Bulk edit (only fields the admin filled in the dialog) ──
  const handleBulkEditApply = useCallback(async () => {
    const patch: Record<string, any> = {}
    for (const [k, v] of Object.entries(bulkEdit)) if (v) patch[k] = v
    if (!Object.keys(patch).length) { setBulkOpen(false); return }
    setBusy(true)
    try {
      for (const id of Array.from(selected)) await updateItem.mutateAsync({ id, ...patch })
      showToast(t('admin.sharedMailboxes.bulkUpdated', { count: selected.size }))
      setBulkOpen(false); setBulkEdit({})
    } catch (err: any) {
      showToast(err.message || t('admin.sharedMailboxes.errorSaveFailed'), 'error')
    } finally { setBusy(false) }
  }, [bulkEdit, selected, updateItem, showToast, t])

  // ── Import CSV (headers matched to column labels; upsert by mail) ──
  const handleImport = useCallback(async (file: File) => {
    setBusy(true)
    try {
      const text = await file.text()
      const grid = parseCsv(text)
      if (grid.length < 2) throw new Error(t('admin.sharedMailboxes.importEmpty'))
      const headers = grid[0].map((h) => h.trim().toLowerCase())
      // Map each CSV header to a column key (by label or key).
      const keyFor = (h: string) => {
        const col = COLUMNS.find((c: any) => c.label.toLowerCase() === h || c.key.toLowerCase() === h)
        return col?.key
      }
      const colKeys = headers.map(keyFor)
      const byMail = new Map(rows.map((r: any) => [(r.mail || '').toLowerCase(), r]))
      let created = 0, updated = 0
      for (const line of grid.slice(1)) {
        const obj: Record<string, any> = {}
        line.forEach((val, i) => { const k = colKeys[i]; if (k && val.trim() !== '') obj[k] = val.trim() })
        if (!obj.name && !obj.mail) continue
        const existing = obj.mail ? byMail.get(String(obj.mail).toLowerCase()) : null
        if (existing) { await updateItem.mutateAsync({ id: existing.id, ...obj }); updated++ }
        else { await createItem.mutateAsync(obj); created++ }
      }
      showToast(t('admin.sharedMailboxes.imported', { created, updated }))
    } catch (err: any) {
      showToast(err.message || t('admin.sharedMailboxes.importFailed'), 'error')
    } finally { setBusy(false); if (importRef.current) importRef.current.value = '' }
  }, [COLUMNS, rows, createItem, updateItem, showToast, t])

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t('admin.sharedMailboxes.pageTitle')}
        description={t('admin.sharedMailboxes.pageDescription', {
          count: counts.total,
          leger: counts.leger,
          moyen: counts.moyen,
          lourd: counts.lourd,
        })}
      />

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.sharedMailboxes.searchPlaceholder')}
            className="pl-9 h-9"
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={companyFilter}
          onChange={(e: any) => setCompanyFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-md border border-input bg-background"
        >
          <option value="all">{t('admin.sharedMailboxes.allCompanies')}</option>
          {companiesPresent.map((c: any) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={catFilter}
          onChange={(e: any) => setCatFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-md border border-input bg-background"
        >
          <option value="all">{t('admin.sharedMailboxes.allCategories')}</option>
          {CATEGORIES.map((c: any) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          ref={importRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e: any) => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
        />
        <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {t('admin.sharedMailboxes.importCsv')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> {t('admin.sharedMailboxes.exportCsv')}
        </Button>
        <Button size="sm" onClick={handleAdd} disabled={createItem.isPending} className="gap-1.5">
          {createItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {t('admin.sharedMailboxes.addMailbox')}
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">{t('admin.sharedMailboxes.selectedCount', { count: selected.size })}</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setBulkOpen(true)} disabled={busy}>
            <Pencil className="h-3.5 w-3.5" /> {t('admin.sharedMailboxes.bulkEdit')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={handleBulkDelete} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" /> {t('admin.sharedMailboxes.bulkDelete')}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={clearSelection}>
            <X className="h-3.5 w-3.5" /> {t('admin.sharedMailboxes.clearSelection')}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-x-auto bg-card">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/40 border-b border-border sticky top-0">
            <tr>
              <th className="px-2 py-2 w-8">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="h-4 w-4" title={t('admin.sharedMailboxes.selectAll')} />
              </th>
              {COLUMNS.map((col: any) => (
                <th key={col.key} className="px-2 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap" style={{ width: col.width, minWidth: col.width }}>
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="py-12 text-center text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {t('admin.sharedMailboxes.emptyState')}
                </td>
              </tr>
            ) : (
              filtered.map((r: any) => (
                <tr key={r.id} className={cn('hover:bg-muted/20', selected.has(r.id) && 'bg-primary/5')}>
                  <td className="px-2 align-middle">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} className="h-4 w-4" />
                  </td>
                  {COLUMNS.map((col: any) => (
                    <td key={col.key} className="px-1 py-0.5 align-middle" style={{ width: col.width, minWidth: col.width }}>
                      {col.type === 'select' && col.render === 'badge' && r[col.key] ? (
                        <div className="px-2 py-1">
                          <Badge variant="outline" className={cn('text-[10px]', (CAT_COLORS as Record<string, any>)[r[col.key]])}>
                            {r[col.key]}
                          </Badge>
                        </div>
                      ) : col.type === 'select' ? (
                        <SelectCell value={r[col.key]} options={col.options} onChange={(v: any) => handleUpdate(r.id, col.key, v)} />
                      ) : col.type === 'checkbox' ? (
                        <div className="px-2"><CheckboxCell value={r[col.key]} onChange={(v: any) => handleUpdate(r.id, col.key, v)} /></div>
                      ) : (
                        <EditableCell value={r[col.key]} type={col.type} onChange={(v: any) => handleUpdate(r.id, col.key, v)} />
                      )}
                    </td>
                  ))}
                  <td className="px-1 py-0.5 align-middle">
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded" title={t('admin.sharedMailboxes.deleteTitle')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk edit dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.sharedMailboxes.bulkEditTitle', { count: selected.size })}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{t('admin.sharedMailboxes.bulkEditHint')}</p>
          <div className="space-y-3">
            {[
              { key: 'company', label: t('admin.sharedMailboxes.columnCompany'), options: companiesPresent },
              { key: 'category', label: t('admin.sharedMailboxes.columnCategory'), options: CATEGORIES },
              { key: 'licence', label: t('admin.sharedMailboxes.columnLicence'), options: LICENCES },
              { key: 'profile', label: t('admin.sharedMailboxes.columnProfile'), options: PROFILES },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <select
                  value={bulkEdit[f.key] || ''}
                  onChange={(e: any) => setBulkEdit((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background"
                >
                  <option value="">{t('admin.sharedMailboxes.bulkKeepValue')}</option>
                  {f.options.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>{t('admin.sharedMailboxes.cancel')}</Button>
            <Button onClick={handleBulkEditApply} disabled={busy} className="gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{t('admin.sharedMailboxes.bulkApply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
