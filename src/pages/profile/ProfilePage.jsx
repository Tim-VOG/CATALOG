import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { updateProfile } from '@/lib/api/profiles'
import { User, Mail, Phone, Briefcase, Building2, Shield, CalendarDays, ClipboardList, Clock, CheckCircle2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/stores/ui-store'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { data: requests = [] } = useMyLoanRequests(user?.id)
  const showToast = useUIStore((s) => s.showToast)

  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)

  if (loading) return <PageLoading />

  const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase() || '?'
  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email

  // Stats
  const totalRequests = requests.length
  const activeRequests = requests.filter((r) => ['pending', 'approved', 'picked_up'].includes(r.status)).length
  const completedRequests = requests.filter((r) => ['returned', 'closed'].includes(r.status)).length

  const phoneChanged = phone !== (profile?.phone || '')

  const handleSavePhone = async () => {
    if (!phoneChanged) return
    setSaving(true)
    try {
      await updateProfile(user.id, { phone })
      await refreshProfile()
      showToast('Phone number updated')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-display font-bold">Profile</h1>

      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 text-2xl">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
              {profile?.job_title && (
                <p className="text-sm flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile.job_title}
                </p>
              )}
              {profile?.department && (
                <p className="text-sm flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile.department}
                </p>
              )}
              <div className="flex items-center gap-3 pt-2">
                <Badge className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {profile?.role}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Joined {formatDate(profile?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <ClipboardList className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-3xl font-bold">{totalRequests}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-amber-500" />
              <p className="text-3xl font-bold text-amber-500">{activeRequests}</p>
              <p className="text-xs text-muted-foreground mt-1">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold text-green-500">{completedRequests}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Phone number</Label>
              <div className="flex gap-2">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="max-w-xs"
                />
                <Button
                  onClick={handleSavePhone}
                  disabled={!phoneChanged || saving}
                  size="sm"
                  className="gap-2"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
