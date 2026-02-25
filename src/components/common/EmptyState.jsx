import { cn } from '@/lib/utils'

export function EmptyState({ icon: Icon, title, description, children, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4 text-center', className)}>
      {Icon && <Icon className="h-16 w-16 text-muted-foreground/50" />}
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}
