import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { useMyItRequests } from '@/hooks/use-it-requests'
import { useMyMailboxRequests } from '@/hooks/use-mailbox-requests'
import { Badge } from '@/components/ui/badge'
import { updateProfile } from '@/lib/api/profiles'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { Mail, Phone, Briefcase, Building2, Shield, CalendarDays, ClipboardList, Clock, CheckCircle2, Save, Camera, Loader2, MessageSquare, Sun, Moon, Palette } from 'lucide-react'
import { useThemeMode, useToggleTheme, useClearThemeOverride } from '@/hooks/use-theme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { motion } from 'motion/react'
import { AnimatedCounter } from '@/components/ui/motion'
import { useUIStore } from '@/stores/ui-store'
import { UserEquipmentPanel } from '@/components/common/UserEquipmentPanel'
import { ActivityTimeline } from '@/components/common/ActivityTimeline'
import { PushToggleCard } from '@/components/common/PushToggleCard'
import { LanguageCard } from '@/components/common/LanguageCard'

const formatDate = (d: any) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, profile, loading, refreshProfile } = useAuth()
  const { data: loanReqs = [] } = useMyLoanRequests(user?.id)
  const { data: itReqs = [] } = useMyItRequests(user?.id)
  const { data: mailboxReqs = [] } = useMyMailboxRequests(user?.id)
  const requests = [...loanReqs, ...itReqs, ...mailboxReqs]
  const showToast = useUIStore((s: any) => s.showToast)
  const themeMode = useThemeMode()
  const toggleTheme = useToggleTheme()
  const clearThemeOverride = useClearThemeOverride()

  const [phone, setPhone] = useState(profile?.phone || '')
  const [jobTitle, setJobTitle] = useState<string>(String(profile?.job_title || ''))
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<any>(null)

  if (loading) return <PageLoading />

  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email

  // Stats
  const totalRequests = requests.length
  const activeRequests = requests.filter((r: any) => ['pending', 'in_progress'].includes(r.status)).length
  const completedRequests = requests.filter((r: any) => r.status === 'ready').length

  const phoneChanged = phone !== (profile?.phone || '')
  const jobTitleChanged = jobTitle !== String(profile?.job_title || '')

  const handleSaveContact = async () => {
    if (!phoneChanged && !jobTitleChanged) return
    setSaving(true)
    try {
      await updateProfile(user!.id, { phone, job_title: jobTitle })
      await refreshProfile()
      showToast(t('user.profilePage.phoneUpdated'))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // Reset so same file can be re-selected

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast(t('user.profilePage.invalidImageType'), 'error')
      return
    }

    // Validate size
    if (file.size > MAX_AVATAR_SIZE) {
      showToast(t('user.profilePage.imageTooLarge'), 'error')
      return
    }

    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user!.id}/avatar-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile(user!.id, { avatar_url: data.publicUrl })
      await refreshProfile()
      showToast(t('user.profilePage.photoUpdated'))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">{t('user.profilePage.title')}</h1>
        <motion.div
          className="mt-3 h-1 w-20 rounded-full bg-gradient-to-r from-primary to-accent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ originX: 0 }}
        />
      </div>

      {/* Header card */}
      <Card variant="elevated" className="overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* Avatar with upload overlay */}
            <div className="relative group shrink-0">
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                email={user?.email}
                size="lg"
              />
              <button
                type="button"
                onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label={t('user.profilePage.changePhotoAria')}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
              {user?.email && (
                <a
                  href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent((user?.email || ""))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#6264A7] hover:underline w-fit"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t('user.profilePage.chatOnTeams')}
                </a>
              )}
              {!!profile?.job_title && (
                <p className="text-sm flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  {String(profile.job_title)}
                </p>
              )}
              {!!profile?.department && (
                <p className="text-sm flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {String(profile.department)}
                </p>
              )}
              <div className="flex items-center gap-3 pt-2">
                <Badge className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {profile?.role}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {t('user.profilePage.joined', { date: formatDate(profile?.created_at) })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="h-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <ClipboardList className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <AnimatedCounter value={totalRequests} className="text-3xl font-bold" />
              <p className="text-xs text-muted-foreground mt-1">{t('user.profilePage.totalRequests')}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" className="h-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-amber-500" />
              <AnimatedCounter value={activeRequests} className="text-3xl font-bold text-amber-500" />
              <p className="text-xs text-muted-foreground mt-1">{t('user.profilePage.active')}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" className="h-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-500" />
              <AnimatedCounter value={completedRequests} className="text-3xl font-bold text-green-500" />
              <p className="text-xs text-muted-foreground mt-1">{t('user.profilePage.completed')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My equipment, QR codes, history */}
      {user?.id && <UserEquipmentPanel userId={user!.id} />}

      {/* Full chronological activity feed (requests + pickups/returns) */}
      {user?.id && <ActivityTimeline userId={user!.id} />}

      {/* Appearance */}
      <Card>
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" /> {t('user.profilePage.appearance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  {themeMode === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{t('user.profilePage.theme')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('user.profilePage.currently', { mode: themeMode === 'dark' ? t('user.profilePage.themeDark') : t('user.profilePage.themeLight') })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-1.5">
                  {themeMode === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  {t('user.profilePage.switchTo', { mode: themeMode === 'dark' ? t('user.profilePage.themeLight') : t('user.profilePage.themeDark') })}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearThemeOverride} className="text-xs">
                  {t('user.profilePage.useDefault')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <LanguageCard />

      {/* Push notifications */}
      <PushToggleCard />

      {/* Contact */}
      <Card>
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4" /> {t('user.profilePage.contact')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('user.profilePage.jobTitle')}</Label>
              <Input
                value={jobTitle}
                onChange={(e: any) => setJobTitle(e.target.value)}
                placeholder={t('user.profilePage.jobTitlePlaceholder')}
                className="max-w-xs"
              />
              <p className="text-[11px] text-muted-foreground">{t('user.profilePage.signatureNote')}</p>
            </div>
            <div className="space-y-1">
              <Label>{t('user.profilePage.phoneNumber')}</Label>
              <Input
                value={phone}
                onChange={(e: any) => setPhone(e.target.value)}
                placeholder={t('user.profilePage.phonePlaceholder')}
                className="max-w-xs"
              />
            </div>
            <Button
              onClick={handleSaveContact}
              disabled={(!phoneChanged && !jobTitleChanged) || saving}
              size="sm"
              className="gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              {t('user.profilePage.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
