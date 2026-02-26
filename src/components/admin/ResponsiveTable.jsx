import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

/**
 * ResponsiveTable — renders a standard table on desktop and cards on mobile.
 *
 * Props:
 *   columns: Array<{ key: string, label: string, className?: string }>
 *   data: Array<Record>
 *   renderRow: (item, i) => TableRow content (for desktop)
 *   renderMobileCard: (item, i) => card content (for mobile)
 *   keyExtractor: (item) => unique key
 */
export function ResponsiveTable({ columns = [], data = [], renderRow, renderMobileCard, keyExtractor }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, i) => (
              <TableRow key={keyExtractor(item)}>
                {renderRow(item, i)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {data.map((item, i) => (
          <div key={keyExtractor(item)}>
            {renderMobileCard(item, i)}
          </div>
        ))}
      </div>
    </>
  )
}
