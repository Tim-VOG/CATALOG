import { motion } from 'motion/react'
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
              <motion.tr
                key={keyExtractor(item)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                className="border-b border-border/30 transition-colors duration-200 hover:bg-muted/40"
              >
                {renderRow(item, i)}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {data.map((item, i) => (
          <motion.div
            key={keyExtractor(item)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
          >
            {renderMobileCard(item, i)}
          </motion.div>
        ))}
      </div>
    </>
  )
}
