import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Briefcase, Building2, Shield, CalendarDays, MapPin, IdCard, User as UserIcon } from 'lucide-react'
import { useProfile } from '@/hooks/use-profiles'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { UserEquipmentPanel } from '@/components/common/UserEquipmentPanel'
import { ActivityTimeline } from '@/components/common/ActivityTimeline'
import { UserFmbPanel } from '@/components/common/UserFmbPanel'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Notion-style property row: small uppercase label on the left, value on the right
function Prop({ icon: Icon, label, value, accent  }: any) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <div className="flex items-center gap-1.5 w-44 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </div>
        <span className="text-sm text-muted-foreground/50 italic">Empty</span>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="flex items-center gap-1.5 w-44 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70 pt-0.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      {accent ? (
        <Badge variant="outline" className="text-[11px]">{value}</Badge>
      ) : (
        <span className="text-sm text-foreground break-all flex-1">{value}</span>
      )}
    </div>
  )
}

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
    <div className="space-y-5">
      <AdminPageHeader title={fullName} description="User profile, equipment, shared mailboxes and request history" />

      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')} className="gap-1.5 text-xs -mt-2 w-fit">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to users
      </Button>

      {/* Notion-style identity header */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-start gap-5 mb-5">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              firstName={profile.first_name}
              lastName={profile.last_name}
              email={profile.email}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-display font-bold mb-1">{fullName}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="capitalize text-[10px]">
                  <Shield className="h-3 w-3 mr-1" />{profile.role || 'user'}
                </Badge>
                {profile.is_active === false && (
                  <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                    Disabled
                  </Badge>
                )}
                {profile.business_unit && (
                  <Badge variant="outline" className="text-[10px]">
                    <Building2 className="h-3 w-3 mr-1" />{profile.business_unit}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Properties — like Notion's left rail */}
          <div className="divide-y divide-border/40">
            <Prop icon={Building2} label="Business Unit" value={profile.business_unit} />
            <Prop icon={UserIcon} label="Profile" value={profile.profile_type} accent />
            <Prop icon={Mail} label="Mail" value={profile.email} />
            <Prop icon={IdCard} label="Signature Title" value={profile.signature_title || profile.job_title} />
            <Prop icon={Briefcase} label="Job Title" value={profile.job_title} />
            <Prop icon={Phone} label="Phone" value={profile.phone} />
            <Prop icon={MapPin} label="Country" value={profile.country_based} />
            <Prop icon={CalendarDays} label="Date In" value={fmtDate(profile.start_date)} />
            <Prop icon={CalendarDays} label="Date Out" value={fmtDate(profile.leaving_date)} />
            <Prop icon={CalendarDays} label="Birthday" value={fmtDate(profile.birthday)} />
            <Prop icon={CalendarDays} label="Joined VO Hub" value={fmtDate(profile.created_at)} />
          </div>
        </CardContent>
      </Card>

      <UserFmbPanel user={profile} />
      <UserEquipmentPanel userId={userId} />
      {userId && <ActivityTimeline userId={userId} />}
    </div>
  )
}
