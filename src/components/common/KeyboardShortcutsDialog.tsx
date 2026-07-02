import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['Esc'], label: 'Close dialogs / clear focus' },
  { keys: ['g', 'h'], label: 'Go to Hub' },
  { keys: ['g', 'c'], label: 'Go to Catalog' },
  { keys: ['g', 'r'], label: 'Go to My Requests' },
  { keys: ['g', 'p'], label: 'Go to Profile' },
  { keys: ['g', 'a'], label: 'Go to Admin (if allowed)' },
  { keys: ['/'], label: 'Focus the page search field (when available)' },
]

const ROUTE_MAP = { h: '/', c: '/catalog', r: '/my-requests', p: '/profile', a: '/admin' }

function isTyping(target: any) {
  if (!target) return false
  const tag = (target.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (target.isContentEditable) return true
  return false
}

function Kbd({ children  }: any) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-semibold text-foreground">
      {children}
    </kbd>
  )
}

export function KeyboardShortcutsProvider({ children  }: any) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pendingG, setPendingG] = useState(false)

  useEffect(() => {
    const onKey = (e: any) => {
      if (e.defaultPrevented) return
      if (isTyping(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // ?
      if (e.key === '?') { e.preventDefault(); setOpen(true); return }

      // / focuses the first visible "search" placeholder input
      if (e.key === '/') {
        const input = document.querySelector('input[placeholder*="earch" i]')
        if (input) { e.preventDefault(); (input as any).focus(); }
        return
      }

      // g … prefix
      if (e.key === 'g') {
        setPendingG(true)
        setTimeout(() => setPendingG(false), 1200)
        return
      }
      if (pendingG && ROUTE_MAP[e.key]) {
        e.preventDefault()
        setPendingG(false)
        navigate(ROUTE_MAP[e.key])
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navigate, pendingG])

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" /> Keyboard shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 divide-y divide-border/50">
            {SHORTCUTS.map(({ keys, label }: any) => (
              <div key={label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-1">
                  {keys.map((k: any, i: any) => (
                    <span key={`${k}-${i}`} className="flex items-center gap-1">
                      <Kbd>{k}</Kbd>
                      {i < keys.length - 1 && <span className="text-muted-foreground text-xs">then</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-4">
            Press <Kbd>?</Kbd> anywhere to open this list.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
