import { useState } from 'react'
import { usePendingExtensions } from '@/hooks/use-extension-requests'
import { ExtensionApprovalDialog } from '@/components/admin/ExtensionApprovalDialog'
import { CalendarPlus, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export function PendingExtensionsBanner() {
  const { data: pending = [] } = usePendingExtensions()
  const [selectedExtension, setSelectedExtension] = useState(null)

  if (pending.length === 0) return null

  return (
    <>
      <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-5 w-5 text-orange-400" />
          <h3 className="font-semibold text-sm">
            {pending.length} Pending Extension{pending.length !== 1 ? 's' : ''}
          </h3>
        </div>

        <div className="space-y-2">
          {pending.map((ext) => (
            <div
              key={ext.id}
              className="flex items-center justify-between gap-3 rounded-md bg-card/50 border p-3"
            >
              <div className="text-sm space-y-0.5 min-w-0">
                <p className="font-medium truncate">
                  {ext.user_first_name} {ext.user_last_name}
                  <span className="text-muted-foreground font-normal"> — {ext.project_name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  +{ext.requested_days} days requested &middot; Current return: {ext.return_date ? format(new Date(ext.return_date), 'dd MMM') : '—'}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => setSelectedExtension(ext)}>
                Review <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <ExtensionApprovalDialog
        open={!!selectedExtension}
        onOpenChange={(open) => !open && setSelectedExtension(null)}
        extension={selectedExtension}
      />
    </>
  )
}
