import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Determines if text should be white or dark based on background color brightness.
 * Uses relative luminance formula.
 */
function getContrastColor(hex) {
  if (!hex || !hex.startsWith('#')) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1e293b' : '#ffffff'
}

/**
 * CategoryBadge — reusable category label with automatic text contrast.
 *
 * Props:
 *   name     — category name (required)
 *   color    — hex color string (defaults to gray)
 *   subType  — optional sub-type appended after " - "
 *   className — additional classes for positioning, etc.
 */
export function CategoryBadge({ name, color, subType, className }) {
  const bg = color || '#6b7280'
  const fg = getContrastColor(bg)

  return (
    <Badge
      className={cn('border border-white/20', className)}
      style={{ backgroundColor: bg, color: fg }}
    >
      {name}
      {subType && ` - ${subType}`}
    </Badge>
  )
}
