import * as React from 'react'
import { cn } from '@/lib/utils'

const Table = React.forwardRef<any, any>(({ className, ...props }: any, ref: any) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<any, any>(({ className, ...props }: any, ref: any) => (
  <thead
    ref={ref}
    className={cn(
      '[&_tr]:border-b [&_tr]:border-border/50',
      'sticky top-0 z-10 bg-card/90 backdrop-blur-md',
      className
    )}
    {...props}
  />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<any, any>(({ className, ...props }: any, ref: any) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
))
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<any, any>(({ className, ...props }: any, ref: any) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-border/30 transition-colors duration-200',
      'hover:bg-muted/40',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<any, any>(({ className, ...props }: any, ref: any) => (
  <th
    ref={ref}
    className={cn(
      'h-10 px-3 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wider',
      '[&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<any, any>(({ className, ...props }: any, ref: any) => (
  <td
    ref={ref}
    className={cn(
      'p-3 align-middle [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
