import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useAppSettings } from '@/hooks/use-settings'
import { useCreateInvitation } from '@/hooks/use-invitations'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml } from '@/lib/email-html'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const BUSINESS_UNITS = [
  'VO GROUP', 'THE LITTLE VOICE', 'VO EVENT', 'VO CONSULTING',
  'VO PRODUCTION', 'VO STUDIOS', 'KRAFTHAUS',
]

export function InviteUserDialog({ open, onOpenChange }) {
  const { user } = useAuth()
  const { data: settings } = useAppSettings()
  const createInvitation = useCreateInvitation()
  const showToast = useUIStore((s) => s.showToast)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [businessUnit, setBusinessUnit] = useState('')
  const [sending, setSending] = useState(false)

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url || ''
  const tagline = settings?.tagline || ''
  const logoHeight = settings?.logo_height || 0

  const resetForm = () => {
    setEmail('')
    setFirstName('')
    setLastName('')
    setBusinessUnit('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast('Please enter a valid email address', 'error')
      return
    }

    setSending(true)
    try {
      // 1. Create invitation record
      await createInvitation.mutateAsync({
        email: trimmedEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        business_unit: businessUnit,
        invited_by: user?.id,
      })

      // 2. Send branded invitation email
      const loginUrl = `${window.location.origin}/login`
      const greeting = firstName.trim() ? `Dear ${firstName.trim()},` : 'Hello,'

      const bodyHtml = `${greeting}

You've been invited to join ${appName}! Click the button below to sign in with your Microsoft account and get started.

<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 0;">
<a href="${loginUrl}" style="display:inline-block;padding:14px 32px;border-radius:8px;background:linear-gradient(135deg,#f97316,#06b6d4);color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">Get Started</a>
</td></tr></table>

You'll have access to all platform features once you sign in.

Best regards,
The ${appName} Team`

      const wrappedBody = wrapEmailHtml(bodyHtml, { appName, logoUrl, tagline, logoHeight })

      await sendEmail({
        to: trimmedEmail,
        subject: `You're invited to join ${appName}`,
        body: wrappedBody,
        isHtml: true,
      })

      showToast(`Invitation sent to ${trimmedEmail}`)
      resetForm()
      onOpenChange(false)
    } catch (err) {
      const msg = err?.message || 'Failed to send invitation'
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        showToast('An invitation is already pending for this email', 'error')
      } else {
        showToast(msg, 'error')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="john.doe@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="invite-first">First Name</Label>
              <Input
                id="invite-first"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-last">Last Name</Label>
              <Input
                id="invite-last"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-bu">Business Unit</Label>
            <Select
              id="invite-bu"
              value={businessUnit}
              onChange={(e) => setBusinessUnit(e.target.value)}
            >
              <option value="">— None —</option>
              {BUSINESS_UNITS.map((bu) => (
                <option key={bu} value={bu}>{bu}</option>
              ))}
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            The user will receive an email with a sign-in link. On first login via Microsoft SSO, they'll automatically get access to all modules.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
