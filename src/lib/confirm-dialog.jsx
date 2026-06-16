import { createRoot } from 'react-dom/client'
import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

/**
 * confirmDialog — drop-in async replacement for native `confirm()`.
 *
 * Usage:
 *   if (!(await confirmDialog('Delete this item?'))) return
 *   // or with options:
 *   const ok = await confirmDialog({
 *     title: 'Delete item',
 *     description: 'This action cannot be undone.',
 *     confirmLabel: 'Delete',
 *     destructive: true,
 *   })
 *
 * Returns a Promise<boolean>.
 */
export function confirmDialog(optsOrMessage) {
  const opts = typeof optsOrMessage === 'string'
    ? { description: optsOrMessage }
    : (optsOrMessage || {})

  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    const cleanup = (result) => {
      // Defer unmount to let AlertDialog exit animation finish
      setTimeout(() => {
        root.unmount()
        host.remove()
      }, 150)
      resolve(result)
    }

    root.render(<ConfirmDialog opts={opts} onDone={cleanup} />)
  })
}

function ConfirmDialog({ opts, onDone }) {
  const [open, setOpen] = useState(false)

  // Open on next tick so AlertDialog sees a false→true transition (triggers animation)
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 10)
    return () => clearTimeout(t)
  }, [])

  const handle = (result) => {
    setOpen(false)
    onDone(result)
  }

  const {
    title = 'Are you sure?',
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
  } = opts

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) handle(false) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handle(false)}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handle(true)}
            className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
