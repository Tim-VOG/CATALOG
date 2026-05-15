import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useOnboardingByToken, useSubmitPersonalInfo } from '@/hooks/use-personal-info'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Mail, Loader2 } from 'lucide-react'

export function PersonalInfoPage() {
  const { token } = useParams()
  const { data: onboarding, isLoading, error } = useOnboardingByToken(token)
  const submit = useSubmitPersonalInfo()

  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !onboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <div className="text-2xl font-bold text-[#0a2540]">Link expired or invalid</div>
            <p className="text-sm text-muted-foreground">
              Ask the person who sent you this link to share a fresh one.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const firstName = onboarding.first_name || 'there'

  if (submitted || onboarding.already_submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-[#0a2540]">Thanks {firstName}!</div>
            <p className="text-sm text-muted-foreground">
              We&apos;ve got your personal email. Your manager will be in touch shortly with everything you need for your first day. 🎉
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setSubmitError('Please enter a valid email address.')
      return
    }
    try {
      await submit.mutateAsync({ token, personalEmail: trimmed })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] p-4 flex items-center justify-center">
      <Card className="max-w-md w-full overflow-hidden">
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#f97316 0%,#ec4899 50%,#06b6d4 100%)' }} />
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-[#0a2540] leading-tight">
              Hey {firstName} 👋
            </div>
            <p className="text-[15px] text-[#425466] leading-relaxed">
              Welcome to the team! Just one quick thing before your first day —
              drop us your <strong className="text-[#0a2540]">personal email</strong> so we can
              send you everything you need.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="personal-email" className="text-sm font-medium text-[#0a2540]">
                Personal email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="personal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="pl-10 h-11"
                  required
                />
              </div>
              {submitError && <p className="text-xs text-red-600">{submitError}</p>}
            </div>

            <Button
              type="submit"
              disabled={submit.isPending}
              className="w-full h-11 bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white gap-2"
            >
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submit.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            We&apos;ll only use this to send you onboarding materials before your account is ready.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
