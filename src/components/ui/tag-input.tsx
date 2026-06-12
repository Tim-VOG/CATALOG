import { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * TagInput — chip/tag input like email CC fields.
 * Press Enter, comma, or semicolon to add a tag. Click × to remove.
 *
 * Props:
 *   value      - string[] of current tags
 *   onChange    - (tags: string[]) => void
 *   placeholder - input placeholder text
 *   className  - optional wrapper className
 */
export function TagInput({ value = [], onChange, placeholder = 'Add item...', className }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  const addTags = useCallback(
    (raw) => {
      // Split on comma, semicolon, or newline, then trim & deduplicate
      const newTags = raw
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !value.includes(s))
      if (newTags.length > 0) {
        onChange([...value, ...newTags])
      }
    },
    [value, onChange],
  )

  const removeTag = useCallback(
    (index) => {
      onChange(value.filter((_, i) => i !== index))
    },
    [value, onChange],
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      if (input.trim()) {
        addTags(input)
        setInput('')
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      // Remove last tag on backspace when input is empty
      removeTag(value.length - 1)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    if (pasted) {
      addTags(pasted)
      setInput('')
    }
  }

  const handleBlur = () => {
    // Commit whatever is in the input on blur
    if (input.trim()) {
      addTags(input)
      setInput('')
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm',
        'ring-ring/50 focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-ring transition-all cursor-text min-h-[40px]',
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-xs font-medium max-w-[200px] group"
        >
          <span className="truncate">{tag}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(i)
            }}
            className="shrink-0 rounded-sm hover:bg-primary/20 transition-colors p-0.5 -mr-0.5 cursor-pointer"
            tabIndex={-1}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground/40 text-sm"
      />
    </div>
  )
}
