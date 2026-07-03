import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSharedMailboxes, useCreateSharedMailbox, useUpdateSharedMailbox, useDeleteSharedMailbox,
} from '@/hooks/use-shared-mailboxes'
import { Search, Plus, Trash2, Loader2, Download, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

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
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> {t('admin.sharedMailboxes.exportCsv')}
        </Button>
        <Button size="sm" onClick={handleAdd} disabled={createItem.isPending} className="gap-1.5">
          {createItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {t('admin.sharedMailboxes.addMailbox')}
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-x-auto bg-card">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/40 border-b border-border sticky top-0">
            <tr>
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
                <td colSpan={COLUMNS.length + 1} className="py-12 text-center text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {t('admin.sharedMailboxes.emptyState')}
                </td>
              </tr>
            ) : (
              filtered.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/20">
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
    </div>
  )
}
