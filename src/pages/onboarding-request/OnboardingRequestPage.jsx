import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { UserPlus, ArrowLeft, CheckCircle2, Monitor, Laptop, HelpCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/api/send-email'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const BUSINESS_UNITS = [
  'VO GROUP', 'THE LITTLE VOICE', 'VO EVENT', 'VO CONSULTING',
  'VO PRODUCTION', 'VO STUDIOS', 'KRAFTHAUS',
]

const EQUIPMENT_OPTIONS = [
  { value: 'mac', label: 'Mac', icon: Laptop },
  { value: 'windows', label: 'Windows', icon: Monitor },
  { value: 'other', label: 'Other', icon: HelpCircle },
]

export function OnboardingRequestPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    new_employee_name: '',
    new_employee_email: '',
    department: '',
    business_unit: '',
    start_date: '',
    job_title: '',
    manager_name: '',
    needs_equipment: null, // null | true | false
    equipment_type: '',    // 'mac' | 'windows' | 'other'
    equipment_other: '',
    notes: '',
  })

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const canSubmit = form.new_employee_name && form.new_employee_email && form.start_date && form.business_unit

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const submitterName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

      // Split name into first/last
      const nameParts = form.new_employee_name.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      // 1. Create onboarding recipient directly (appears in Recipients page)
      const { error: recipientError } = await supabase.from('onboarding_recipients').insert({
        first_name: firstName,
        last_name: lastName,
        email: form.new_employee_email,
        team: form.business_unit,
        department: form.department || '',
        start_date: form.start_date || null,
        language: 'en',
      })
      if (recipientError) throw recipientError

      // 2. Also save to it_requests for tracking
      await supabase.from('it_requests').insert({
        type: 'onboarding',
        requester_id: user.id,
        requester_email: user.email,
        requester_name: submitterName,
        data: { ...form, submitted_at: new Date().toISOString() },
        status: 'pending',
      }).catch(() => {}) // Non-blocking — recipient is the important part

      // Send notification email to admins
      sendEmail({
        to: 'admin@vo-group.be',
        subject: `New Onboarding Request: ${form.new_employee_name}`,
        body: `<p><strong>${submitterName}</strong> submitted an onboarding request:</p>
          <ul>
            <li><strong>New employee:</strong> ${form.new_employee_name}</li>
            <li><strong>Email:</strong> ${form.new_employee_email}</li>
            <li><strong>Start date:</strong> ${form.start_date}</li>
            <li><strong>Department:</strong> ${form.department || '—'}</li>
            <li><strong>Business unit:</strong> ${form.business_unit}</li>
            <li><strong>Equipment:</strong> ${form.needs_equipment ? (form.equipment_type === 'other' ? form.equipment_other : form.equipment_type) : 'No'}</li>
          </ul>
          ${form.notes ? `<p><strong>Notes:</strong> ${form.notes}</p>` : ''}`,
      })

      setSuccess(true)
      toast.success('Onboarding request submitted!')
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
              The onboarding request for <strong>{form.new_employee_name}</strong> has been sent to the admin team.
            </p>
            <div className="flex gap-3 justify-center mt-5">
              <Link to="/"><Button variant="outline">Back to Hub</Button></Link>
            </div>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-6 px-4 space-y-6">
      <Link to="/"><Button variant="ghost" size="sm" className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>

      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Onboarding Request</h1>
            <p className="text-sm text-muted-foreground">Request IT setup for a new team member</p>
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        {/* Employee info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Full name *</Label>
            <Input value={form.new_employee_name} onChange={e => update('new_employee_name', e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.new_employee_email} onChange={e => update('new_employee_email', e.target.value)} placeholder="john@vo-group.be" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start date *</Label>
            <input type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg bg-muted/40 border border-border/50 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10" />
          </div>
          <div>
            <Label>Job title</Label>
            <Input value={form.job_title} onChange={e => update('job_title', e.target.value)} placeholder="Designer" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Business unit *</Label>
            <Select value={form.business_unit} onChange={e => update('business_unit', e.target.value)}>
              <option value="">Select...</option>
              {BUSINESS_UNITS.map(bu => <option key={bu} value={bu}>{bu}</option>)}
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Input value={form.department} onChange={e => update('department', e.target.value)} placeholder="Marketing" />
          </div>
        </div>

        <div>
          <Label>Manager name</Label>
          <Input value={form.manager_name} onChange={e => update('manager_name', e.target.value)} placeholder="Jane Smith" />
        </div>

        {/* Equipment question */}
        <div className="border-t border-border/30 pt-4">
          <Label className="text-sm font-semibold">Does this person need IT equipment?</Label>
          <div className="flex gap-3 mt-2">
            <Button
              variant={form.needs_equipment === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('needs_equipment', true)}
            >
              Yes
            </Button>
            <Button
              variant={form.needs_equipment === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => update('needs_equipment', false)}
            >
              No
            </Button>
          </div>
        </div>

        {form.needs_equipment && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
            <Label>Equipment type</Label>
            <div className="grid grid-cols-3 gap-2">
              {EQUIPMENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update('equipment_type', opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-sm',
                    form.equipment_type === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  <opt.icon className="h-5 w-5" />
                  {opt.label}
                </button>
              ))}
            </div>
            {form.equipment_type === 'other' && (
              <Input value={form.equipment_other} onChange={e => update('equipment_other', e.target.value)} placeholder="Specify equipment..." />
            )}
          </motion.div>
        )}

        <div>
          <Label>Additional notes</Label>
          <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Anything else the IT team should know..." rows={3} />
        </div>
      </Card>

      <Button onClick={handleSubmit} disabled={!canSubmit || submitting} loading={submitting} className="w-full">
        Submit Onboarding Request
      </Button>
    </div>
  )
}
