import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const COLORS = [
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-destructive)',
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6366f1', // indigo
]

export function CategoryChart({ products = [] }) {
  const data = useMemo(() => {
    const map = {}
    for (const p of products) {
      const cat = p.category_name || 'Uncategorized'
      map[cat] = (map[cat] || 0) + 1
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [products])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No products yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          dataKey="value"
          animationDuration={800}
          stroke="none"
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
