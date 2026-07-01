import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  useItInventory, useCreateItInventoryItem, useUpdateItInventoryItem, useDeleteItInventoryItem,
} from '@/hooks/use-it-inventory'
import { Search, Plus, Trash2, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const fmtMoney = (n) => {
  if (n == null || isNaN(Number(n))) return ''
  return Number(n).toLocaleString('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

const fmtNum = (n, d = 2) => {
  if (n == null || isNaN(Number(n))) return ''
  return Number(n).toLocaleString('fr-BE', { maximumFractionDigits: d })
}

const monthDiff = (start, end) => {
  if (!start || !end) return null
  const s = new Date(start), e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
}

/**
 * Derive read-only financial columns from the stored row.
 * - Total leasing months = leasing_end - leasing_start
 * - Months elapsed = today - leasing_start (clamped 0..total)
 * - Amortised cumulative = price * (elapsed / total)
 * - Remaining value = price - amortised
 * - Deductible amount = price * deductible_pct / 100
 */
function compute(row) {
  const price = Number(row.purchase_price) || 0
  const residual = Number(row.residual_value) || 0
  const total = monthDiff(row.leasing_start, row.leasing_end)
  const elapsed = row.leasing_start
    ? Math.min(Math.max(0, monthDiff(row.leasing_start, new Date()) || 0), total || 0)
    : null
  const amortised = total && total > 0 ? Math.min(price - residual, ((price - residual) * (elapsed / total))) : null
  const remaining = price && amortised != null ? Math.max(0, price - amortised) : null
  const deductible = price * (Number(row.deductible_pct) || 0) / 100
  return { totalMonths: total, elapsed, amortised, remaining, deductible }
}

// ── A single editable cell (debounced save) ──
function EditableCell({ value, type = 'text', onChange, placeholder, className  }: any) {
  const [local, setLocal] = useState(value ?? '')
  const initial = useRef(value ?? '')
  useEffect(() => { setLocal(value ?? ''); initial.current = value ?? '' }, [value])

  const commit = () => {
    if (String(local) === String(initial.current)) return
    onChange(local === '' && type !== 'text' ? null : local)
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

// ── Column config: drives header + cell rendering ──
const COMPANIES = ['VO GROUP', 'VO EUR', 'VO EVENT', 'THE LITTLE VOICE', 'VO CONSULTING', 'VO PRODUCTION', 'VO STUDIOS', 'KRAFTHAUS', 'SERIAL', 'MAX', 'AOP', 'SIGN', 'DEFECT', 'FREE']
const DEVICE_TYPES = ['Mac', 'PC', 'Other']

const COLUMNS = [
  { key: 'name',           label: 'Name',             type: 'text',    width: '160px' },
  { key: 'company',        label: 'Company',          type: 'select',  width: '140px', options: COMPANIES },
  { key: 'device_type',    label: 'Device',           type: 'select',  width: '90px',  options: DEVICE_TYPES },
  { key: 'model',          label: 'Model',            type: 'text',    width: '180px' },
  { key: 'owner',          label: 'Propri.',          type: 'text',    width: '110px' },
  { key: 'ram',            label: 'RAM',              type: 'text',    width: '70px' },
  { key: 'serial_number',  label: 'Serial',           type: 'text',    width: '150px' },
  { key: 'labo_care',      label: 'Labo Care',        type: 'text',    width: '110px' },
  { key: 'leasing_start',  label: 'Début leasing',    type: 'date',    width: '130px' },
  { key: 'leasing_end',    label: 'Fin leasing',      type: 'date',    width: '130px' },
  { key: 'warranty_end',   label: 'Garantie',         type: 'date',    width: '130px' },
  { key: 'access_notes',   label: 'Access',           type: 'text',    width: '140px' },
  { key: 'purchase_price', label: "Prix d'achat",     type: 'number',  width: '110px', money: true, editable: true },
  { key: 'residual_value', label: 'Valeur résiduelle', type: 'number', width: '120px', money: true, editable: true },
  // Computed
  { key: '_total_months',  label: 'Durée leasing',    width: '100px', computed: true },
  { key: '_elapsed',       label: 'Mois écoulés',     width: '100px', computed: true },
  { key: 'deductible_pct', label: '% franchise',      type: 'number',  width: '90px', editable: true, suffix: '%' },
  { key: '_amortised',     label: 'Amorti cumulé',    width: '120px', computed: true, money: true },
  { key: '_remaining',     label: 'Valeur restante',  width: '120px', computed: true, money: true },
  { key: '_deductible',    label: 'Franchise',        width: '110px', computed: true, money: true },
]

export function AdminItInventoryPage() {
  const { data: rows = [], isLoading } = useItInventory()
  const createItem = useCreateItInventoryItem()
  const updateItem = useUpdateItInventoryItem()
  const deleteItem = useDeleteItInventoryItem()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('all')

  const filtered = useMemo(() => {
    let r = rows
    if (companyFilter !== 'all') r = r.filter((x: any) => x.company === companyFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter((x: any) =>
        (x.name || '').toLowerCase().includes(q) ||
        (x.serial_number || '').toLowerCase().includes(q) ||
        (x.owner || '').toLowerCase().includes(q) ||
        (x.model || '').toLowerCase().includes(q),
      )
    }
    return r
  }, [rows, search, companyFilter])

  const totals = useMemo(() => {
    let price = 0, remaining = 0
    for (const r of filtered) {
      price += Number(r.purchase_price) || 0
      const c = compute(r)
      if (c.remaining != null) remaining += c.remaining
    }
    return { price, remaining, count: filtered.length }
  }, [filtered])

  const handleAdd = useCallback(async () => {
    try {
      await createItem.mutateAsync({ name: 'New asset' })
    } catch (err: any) {
      showToast(err.message || 'Failed to add row', 'error')
    }
  }, [createItem, showToast])

  const handleUpdate = useCallback(async (id, field, value) => {
    try {
      await updateItem.mutateAsync({ id, [field]: value })
    } catch (err: any) {
      showToast(err.message || 'Save failed', 'error')
    }
  }, [updateItem, showToast])

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Delete this asset row?')) return
    try {
      await deleteItem.mutateAsync(id)
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error')
    }
  }, [deleteItem, showToast])

  const handleExportCsv = useCallback(() => {
    const headers = COLUMNS.map((c: any) => c.label).join(',')
    const lines = filtered.map((r: any) => {
      const c = compute(r)
      return COLUMNS.map((col: any) => {
        let v
        if (col.key === '_total_months')  v = c.totalMonths
        else if (col.key === '_elapsed')  v = c.elapsed
        else if (col.key === '_amortised') v = c.amortised
        else if (col.key === '_remaining') v = c.remaining
        else if (col.key === '_deductible') v = c.deductible
        else v = r[col.key]
        if (v == null) return ''
        return /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)
      }).join(',')
    })
    const csv = [headers, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `it-inventory-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [filtered])

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-5">
      <AdminPageHeader title="IT Inventory" description={`${totals.count} asset${totals.count !== 1 ? 's' : ''} · ${fmtMoney(totals.price)} total · ${fmtMoney(totals.remaining)} remaining`} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={companyFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setCompanyFilter('all')}>All companies</Button>
        {COMPANIES.map((c: any) => (
          <Button key={c} variant={companyFilter === c ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => setCompanyFilter(c)}>
            {c}
          </Button>
        ))}
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name / serial / owner..." className="pl-9 h-9" value={search} onChange={(e: any) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5"><Download className="h-3.5 w-3.5" /> CSV</Button>
        <Button size="sm" onClick={handleAdd} disabled={createItem.isPending} className="gap-1.5">
          {createItem.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          New row
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-auto bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              {COLUMNS.map((col: any) => (
                <th key={col.key} className="text-left font-semibold text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border/50" style={{ minWidth: col.width }}>
                  {col.label}
                  {col.computed && <Badge variant="outline" className="ml-1.5 text-[8px] px-1 py-0">auto</Badge>}
                </th>
              ))}
              <th className="px-2 border-b border-border/50" style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="text-center py-12 text-muted-foreground">
                  No assets. <button onClick={handleAdd} className="text-primary underline">Add the first one</button>.
                </td>
              </tr>
            ) : filtered.map((row: any) => {
              const c = compute(row)
              const computedValues = {
                _total_months: c.totalMonths != null ? `${c.totalMonths} mo` : '',
                _elapsed:      c.elapsed != null ? `${c.elapsed} mo` : '',
                _amortised:    c.amortised,
                _remaining:    c.remaining,
                _deductible:   c.deductible,
              }
              return (
                <tr key={row.id} className="hover:bg-muted/20 transition-colors border-b border-border/30">
                  {COLUMNS.map((col: any) => {
                    if (col.computed) {
                      const v = computedValues[col.key]
                      return (
                        <td key={col.key} className="px-3 py-1 text-foreground/70 italic" style={{ minWidth: col.width }}>
                          {col.money ? fmtMoney(v) : (v ?? '')}
                        </td>
                      )
                    }
                    return (
                      <td key={col.key} className="px-1 py-0.5" style={{ minWidth: col.width }}>
                        {col.type === 'select' ? (
                          <SelectCell
                            value={row[col.key]}
                            options={col.options}
                            onChange={(v: any) => handleUpdate(row.id, col.key, v)}
                          />
                        ) : (
                          <EditableCell
                            value={row[col.key]}
                            type={col.type}
                            placeholder={col.suffix || ''}
                            onChange={(v: any) => handleUpdate(row.id, col.key, col.type === 'number' && v != null && v !== '' ? Number(v) : v)}
                          />
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(row.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Computed columns (auto) update from leasing dates, purchase price and deductible %. Edit any cell — changes save on blur.
      </p>
    </div>
  )
}
