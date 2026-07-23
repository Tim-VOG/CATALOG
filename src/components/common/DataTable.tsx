import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type Column<T> = {
  key: string
  header: string
  render?: (row: T) => ReactNode
  /** value used for sorting + global search + CSV export */
  value?: (row: T) => string | number | null | undefined
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  className?: string
  headerClassName?: string
  width?: string
}

type Props<T> = {
  columns: Column<T>[]
  data: T[]
  getRowId: (row: T) => string
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  toolbar?: ReactNode
  exportName?: string
  onRowClick?: (row: T) => void
  selectable?: boolean
  bulkActions?: (rows: T[], clear: () => void) => ReactNode
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  loading?: boolean
}

const csvCell = (v: any) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function DataTable<T>({
  columns, data, getRowId, searchable = true, searchPlaceholder, pageSize = 25,
  initialSort, toolbar, exportName, onRowClick, selectable = false, bulkActions,
  emptyIcon, emptyTitle, emptyDescription, loading = false,
}: Props<T>) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const colFor = (key: string) => columns.find((c) => c.key === key)

  // ── Filter ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data
    return data.filter((row) =>
      columns.some((c) => String(c.value ? c.value(row) ?? '' : '').toLowerCase().includes(q)),
    )
  }, [data, columns, query])

  // ── Sort ──
  const sorted = useMemo(() => {
    if (!sort) return filtered
    const col = colFor(sort.key)
    if (!col?.value) return filtered
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = col.value!(a) ?? '', vb = col.value!(b) ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sort])

  // ── Paginate ──
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const toggleSort = (key: string) => {
    setPage(0)
    setSort((s) => s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' })
  }

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(getRowId(r)))
  const togglePageAll = () => setSelected((prev) => {
    const n = new Set(prev)
    if (allPageSelected) pageRows.forEach((r) => n.delete(getRowId(r)))
    else pageRows.forEach((r) => n.add(getRowId(r)))
    return n
  })
  const clearSelection = () => setSelected(new Set())
  const selectedRows = data.filter((r) => selected.has(getRowId(r)))

  const handleExport = () => {
    const cols = columns.filter((c) => c.value)
    const headers = cols.map((c) => csvCell(c.header)).join(',')
    const lines = sorted.map((r) => cols.map((c) => csvCell(c.value!(r))).join(','))
    const blob = new Blob([[headers, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${exportName || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const colSpan = columns.length + (selectable ? 1 : 0)

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e: any) => { setQuery(e.target.value); setPage(0) }}
              placeholder={searchPlaceholder || t('comp.dataTable.search')}
              className="pl-9 h-9"
            />
          </div>
        )}
        {toolbar}
        <div className="flex-1" />
        {exportName && (
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Download className="h-3.5 w-3.5" /> {t('comp.dataTable.export')}
          </button>
        )}
      </div>

      {/* Bulk bar */}
      {selectable && selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">{t('comp.dataTable.selected', { count: selected.size })}</span>
          <div className="flex-1" />
          {bulkActions?.(selectedRows, clearSelection)}
          <button onClick={clearSelection} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" /> {t('comp.dataTable.clear')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto max-h-[calc(100vh-18rem)]">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 sticky top-0 z-10 backdrop-blur">
              <tr className="border-b border-border">
                {selectable && (
                  <th className="w-9 px-3 py-2.5">
                    <input type="checkbox" checked={allPageSelected} onChange={togglePageAll} className="h-4 w-4 align-middle" />
                  </th>
                )}
                {columns.map((c) => {
                  const active = sort?.key === c.key
                  return (
                    <th
                      key={c.key}
                      style={{ width: c.width }}
                      className={cn('px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                        c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.headerClassName)}
                    >
                      {c.sortable && c.value ? (
                        <button onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 hover:text-foreground transition-colors', active && 'text-foreground')}>
                          {c.header}
                          {active ? (sort!.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                        </button>
                      ) : c.header}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {selectable && <td className="px-3 py-3"><div className="h-4 w-4 rounded bg-muted animate-pulse" /></td>}
                    {columns.map((c) => <td key={c.key} className="px-3 py-3"><div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${50 + (i * 7 + c.key.length * 3) % 40}%` }} /></td>)}
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      {emptyIcon}
                      <p className="text-sm mt-2">{emptyTitle || t('comp.dataTable.empty')}</p>
                      {emptyDescription && <p className="text-xs mt-1">{emptyDescription}</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const id = getRowId(row)
                  const isSel = selected.has(id)
                  return (
                    <tr
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn('hover:bg-muted/25 transition-colors', onRowClick && 'cursor-pointer', isSel && 'bg-primary/5')}
                    >
                      {selectable && (
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })}
                            className="h-4 w-4 align-middle"
                          />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td key={c.key} className={cn('px-3 py-2.5 align-middle', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                          {c.render ? c.render(row) : String(c.value ? c.value(row) ?? '' : '')}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border/50 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {t('comp.dataTable.showing', {
                from: safePage * pageSize + 1,
                to: Math.min((safePage + 1) * pageSize, sorted.length),
                total: sorted.length,
              })}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="tabular-nums px-1">{t('comp.dataTable.page', { page: safePage + 1, count: pageCount })}</span>
                <button disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted/50 disabled:opacity-40 disabled:pointer-events-none">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
