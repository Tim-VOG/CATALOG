import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Shield, CalendarDays } from 'lucide-react'
import { useProfile } from '@/hooks/use-profiles'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { UserEquipmentPanel } from '@/components/common/UserEquipmentPanel'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export function AdminUserDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { data: profile, isLoading } = useProfile(userId)

  if (isLoading) return <PageLoading />
  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')} className="gap-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to users
        </Button>
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    )
  }

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email

  return (
    <div className="space-y-6">
      <AdminPageHeader title={fullName} description="User profile, equipment and request history" />

      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')} className="gap-1.5 text-xs -mt-2 w-fit">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to users
      </Button>

      {/* Identity card */}
      <Card variant="elevated">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <UserAvatar user={profile} size="lg" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{fullName}</h2>
                <Badge className="capitalize text-[10px]">
                  <Shield className="h-3 w-3 mr-1" />{profile.role || 'user'}
                </Badge>
                {profile.is_active === false && (
                  <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">Disabled</Badge>
                )}
              </div>
              {profile.email && (
                <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {profile.email}
                </p>
              )}
              {profile.phone && (
                <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {profile.phone}
                </p>
              )}
              {profile.job_title && (
                <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" /> {profile.job_title}
                </p>
              )}
              {(profile.business_unit || profile.department) && (
                <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" /> {profile.business_unit || profile.department}
                </p>
              )}
              {profile.created_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" /> Joined {fmtDate(profile.created_at)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <UserEquipmentPanel userId={userId} />
    </div>
  )
}
