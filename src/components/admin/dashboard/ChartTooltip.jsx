export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-card-sm text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted-foreground text-xs">
          {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}
