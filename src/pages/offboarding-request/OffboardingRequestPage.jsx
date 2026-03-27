import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { UserMinus, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

const BUSINESS_UNITS = [
  'VO GROUP', 'THE LITTLE VOICE', 'VO EVENT', 'VO CONSULTING',
  'VO PRODUCTION', 'VO STUDIOS', 'KRAFTHAUS',
]

export function OffboardingRequestPage() {
  const { user, profile } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    employee_name: '',
    employee_email: '',
    business_unit: '',
    department: '',
    departure_date: '',
    revoke_access: true,
    collect_equipment: true,
    notes: '',
  })

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const canSubmit = form.employee_name && form.employee_email && form.departure_date && form.business_unit

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const submitterName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

      const { error } = await supabase.from('it_requests').insert({
        type: 'offboarding',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: { ...form, submitted_at: new Date().toISOString() },
        status: 'pending',
      })
      if (error) throw error

      sendEmail({
        to: 'admin@vo-group.be',
        subject: `Offboarding Request: ${form.employee_name}`,
        body: `<p><strong>${submitterName}</strong> submitted an offboarding request:</p>
          <ul>
            <li><strong>Employee:</strong> ${form.employee_name}</li>
            <li><strong>Email:</strong> ${form.employee_email}</li>
            <li><strong>Departure date:</strong> ${form.departure_date}</li>
            <li><strong>Business unit:</strong> ${form.business_unit}</li>
            <li><strong>Revoke access:</strong> ${form.revoke_access ? 'Yes' : 'No'}</li>
            <li><strong>Collect equipment:</strong> ${form.collect_equipment ? 'Yes' : 'No'}</li>
          </ul>
          ${form.notes ? `<p><strong>Notes:</strong> ${form.notes}</p>` : ''}`,
      })

      setSuccess(true)
      toast.success('Offboarding request submitted!')
    } catch (err) {
      toast.error(err.message || 'Failed to submit')
    }
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="p-6 text-center border-2 border-success/30 bg-success/5">
            <CheckCircle2 className="h-14 w-14 mx-auto text-success mb-3" />
            <h2 className="text-xl font-display font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground text-sm mt-2">
              The offboarding request for <strong>{form.employee_name}</strong> has been sent to the admin team.
            </p>
            <Link to="/"><Button variant="outline" className="mt-5">Back to Hub</Button></Link>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-6 px-4 space-y-6">
      <Link to="/"><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>

      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <UserMinus className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Offboarding Request</h1>
          <p className="text-sm text-muted-foreground">Request account & equipment offboarding</p>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Employee name *</Label>
            <Input value={form.employee_name} onChange={e => update('employee_name', e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <Label>Employee email *</Label>
            <Input type="email" value={form.employee_email} onChange={e => update('employee_email', e.target.value)} placeholder="john@vo-group.be" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Departure date *</Label>
            <input type="date" value={form.departure_date} onChange={e => update('departure_date', e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10" />
          </div>
          <div>
            <Label>Business unit *</Label>
            <Select value={form.business_unit} onChange={e => update('business_unit', e.target.value)}>
              <option value="">Select...</option>
              {BUSINESS_UNITS.map(bu => <option key={bu} value={bu}>{bu}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <Label>Department</Label>
          <Input value={form.department} onChange={e => update('department', e.target.value)} placeholder="Marketing" />
        </div>

        <div className="border-t border-border/30 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="mb-0">Revoke all access (email, tools, VPN)</Label>
            <Button variant={form.revoke_access ? 'default' : 'outline'} size="sm" onClick={() => update('revoke_access', !form.revoke_access)}>
              {form.revoke_access ? 'Yes' : 'No'}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Label className="mb-0">Collect equipment (laptop, phone, etc.)</Label>
            <Button variant={form.collect_equipment ? 'default' : 'outline'} size="sm" onClick={() => update('collect_equipment', !form.collect_equipment)}>
              {form.collect_equipment ? 'Yes' : 'No'}
            </Button>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Special instructions..." rows={3} />
        </div>
      </Card>

      <Button onClick={handleSubmit} disabled={!canSubmit || submitting} loading={submitting} className="w-full">
        Submit Offboarding Request
      </Button>
    </div>
  )
}
