import { useId, cloneElement, isValidElement, Children } from 'react'
import { Label } from './label'
import { cn } from '@/lib/utils'

/**
 * Field — a11y-friendly wrapper that auto-associates a label with its input.
 *
 * Usage:
 *   <Field label="Email" required>
 *     <Input type="email" value={...} onChange={...} />
 *   </Field>
 *
 * The child input receives `id` and `aria-required`/`aria-invalid` automatically.
 * If an explicit `id` is passed on the child, it is preserved.
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  children,
  className,
  labelClassName,
}) {
  const autoId = useId()

  // Pull the first element child (the input/select/textarea)
  const child = Children.only(children)
  if (!isValidElement(child)) return children

  const id = child.props.id || autoId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const enhanced = cloneElement(child, {
    id,
    'aria-required': required || undefined,
    'aria-invalid': !!error || undefined,
    'aria-describedby': describedBy,
  })

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={id} className={cn(labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
        </Label>
      )}
      {enhanced}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
