import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { X, Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toast() {
  const toast = useUIStore((s) => s.toast)
  const clearToast = useUIStore((s) => s.clearToast)

  if (!toast) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
        toast.type === 'success' && 'bg-success/10 border-success text-success',
        toast.type === 'error' && 'bg-destructive/10 border-destructive text-destructive'
      )}
    >
      {toast.type === 'success' ? (
        <Check className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      )}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={clearToast} className="ml-2 opacity-70 hover:opacity-100">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
