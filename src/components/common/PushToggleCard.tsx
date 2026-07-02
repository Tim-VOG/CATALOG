import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { useUIStore } from '@/stores/ui-store'
import {
  getPushState, subscribeToPush, unsubscribeFromPush,
  isPushSupported, isPushConfigured,
} from '@/lib/push'

/**
 * Profile card to enable/disable web push notifications on this
 * device. Hides itself entirely if push isn't supported or the app
 * hasn't been configured with a VAPID key.
 */
export function PushToggleCard() {
  const { user } = useAuth()
  const showToast = useUIStore((s: any) => s.showToast)
  const [state, setState] = useState<'unsupported' | 'unconfigured' | 'denied' | 'subscribed' | 'idle'>('idle')
  const [busy, setBusy] = useState(false)

  useEffect(() => { getPushState().then(setState) }, [])

  // Don't render at all when there's nothing actionable.
  if (!isPushSupported() || !isPushConfigured()) return null

  const subscribed = state === 'subscribed'

  const handleToggle = async () => {
    if (!user?.id) return
    setBusy(true)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        showToast('Push notifications disabled on this device', 'success')
      } else {
        await subscribeToPush(user!.id)
        showToast('Push notifications enabled', 'success')
      }
      setState(await getPushState())
    } catch (err: any) {
      showToast(err?.message || 'Could not change push settings', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              {subscribed ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-medium">Push notifications</p>
              <p className="text-xs text-muted-foreground">
                {state === 'denied'
                  ? 'Blocked in your browser settings — re-enable there first.'
                  : subscribed
                    ? 'On for this device.'
                    : 'Get notified on this device when something needs you.'}
              </p>
            </div>
          </div>
          <Button
            variant={subscribed ? 'ghost' : 'outline'}
            size="sm"
            onClick={handleToggle}
            disabled={busy || state === 'denied'}
            className="gap-1.5 shrink-0"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : subscribed ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {subscribed ? 'Turn off' : 'Turn on'}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          On iPhone, add VO Hub to your home screen first (Share → Add to Home Screen).
        </p>
      </CardContent>
    </Card>
  )
}
