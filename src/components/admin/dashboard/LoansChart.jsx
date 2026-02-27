import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

export function LoansChart({ requests = [] }) {
  const data = useMemo(() => {
    // Last 4 weeks: count active and returned per week
    const weeks = []
    for (let i = 3; i >= 0; i--) {
      const start = new Date()
      start.setDate(start.getDate() - i * 7 - 6)
      const end = new Date()
      end.setDate(end.getDate() - i * 7)
      const label = `W${4 - i}`

      let active = 0
      let returned = 0
      for (const r of requests) {
        const created = new Date(r.created_at)
        if (created >= start && created <= end) {
          if (r.status === 'picked_up') active++
          else if (r.status === 'returned') returned++
        }
      }
      weeks.push({ label, active, returned })
    }
    return weeks
  }, [requests])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradReturned" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
        <XAxis dataKey="label" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="active" name="Active" stroke="var(--color-accent)" fill="url(#gradActive)" strokeWidth={2} animationDuration={800} />
        <Area type="monotone" dataKey="returned" name="Returned" stroke="var(--color-success)" fill="url(#gradReturned)" strokeWidth={2} animationDuration={800} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
