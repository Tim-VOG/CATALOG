import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#f97316'
}

export function RequestsChart({ requests = [] }) {
  const data = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const label = d.toLocaleDateString('en-US', { weekday: 'short' })
      days.push({ date: key, label, count: 0 })
    }

    for (const r of requests) {
      const created = (r.created_at || '').split('T')[0]
      const day = days.find((d) => d.date === created)
      if (day) day.count++
    }
    return days
  }, [requests])

  const primary = getThemeColor('--color-primary')
  const accent = getThemeColor('--color-accent')

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
        <XAxis dataKey="label" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="count" name="Requests" fill={primary} radius={[4, 4, 0, 0]} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  )
}
