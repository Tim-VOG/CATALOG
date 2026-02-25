import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

/**
 * Renders a custom form field based on its type definition.
 *
 * Props:
 *   field     - field definition from checkout_form_fields table
 *   value     - current value
 *   onChange  - callback(newValue)
 *   error     - error message string
 */
export function DynamicField({ field, value, onChange, error }) {
  const fieldId = `custom_${field.field_key}`
  const options = field.options || []

  const renderInput = () => {
    switch (field.field_type) {
      case 'text':
      case 'url':
      case 'phone':
        return (
          <Input
            id={fieldId}
            type={field.field_type === 'phone' ? 'tel' : field.field_type === 'url' ? 'url' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
          />
        )

      case 'email':
        return (
          <Input
            id={fieldId}
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
          />
        )

      case 'number':
        return (
          <Input
            id={fieldId}
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder || ''}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        )

      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
          />
        )

      case 'date':
        return (
          <Input
            id={fieldId}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )

      case 'select':
        return (
          <Select
            id={fieldId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        )

      case 'multi_select':
        return (
          <div className="space-y-2">
            {options.map((opt) => {
              const selected = Array.isArray(value) ? value : []
              const isChecked = selected.includes(opt.value)
              return (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const newVal = checked
                        ? [...selected, opt.value]
                        : selected.filter((v) => v !== opt.value)
                      onChange(newVal)
                    }}
                  />
                  {opt.label}
                </label>
              )
            })}
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={fieldId}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!value}
              onCheckedChange={(v) => onChange(v)}
            />
            {field.placeholder || field.label}
          </label>
        )

      default:
        return (
          <Input
            id={fieldId}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
          />
        )
    }
  }

  return (
    <div className="space-y-1">
      {field.field_type !== 'checkbox' && (
        <Label htmlFor={fieldId}>
          {field.label}{field.is_required ? ' *' : ''}
        </Label>
      )}
      {renderInput()}
      {field.help_text && (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
