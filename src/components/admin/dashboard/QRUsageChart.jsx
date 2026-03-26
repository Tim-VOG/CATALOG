import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const COLORS = {
  takes: '#f97316',   // orange
  deposits: '#10b981', // emerald
}

export function QRUsageChart({ stats }) {
  const chartData = useMemo(() => {
    if (!stats) return []
    return Object.entries(stats)
      .map(([category, { takes, deposits }]) => ({
        category,
        takes,
        deposits,
      }))
      .sort((a, b) => (b.takes + b.deposits) - (a.takes + a.deposits))
      .slice(0, 8)
  }, [stats])

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No scan data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <ChartTooltip />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => value === 'takes' ? 'Taken' : 'Deposited'}
        />
        <Bar dataKey="takes" fill={COLORS.takes} radius={[4, 4, 0, 0]} name="takes" />
        <Bar dataKey="deposits" fill={COLORS.deposits} radius={[4, 4, 0, 0]} name="deposits" />
      </BarChart>
    </ResponsiveContainer>
  )
}
