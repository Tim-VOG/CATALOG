import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyLoanRequests } from '@/hooks/use-loan-requests'
import { useScanLogs } from '@/hooks/use-qr-codes'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { updateProfile } from '@/lib/api/profiles'
import { supabase } from '@/lib/supabase'
import { Mail, Phone, Briefcase, Building2, Shield, CalendarDays, ClipboardList, Clock, CheckCircle2, Save, Camera, Loader2, MessageSquare, Package, AlertTriangle, QrCode, Layers } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { motion } from 'motion/react'
import { AnimatedCounter } from '@/components/ui/motion'
import { useUIStore } from '@/stores/ui-store'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const { data: requests = [] } = useMyLoanRequests(user?.id)
  const { data: allScanLogs = [] } = useScanLogs({ limit: 200 })
  const showToast = useUIStore((s) => s.showToast)

  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  if (loading) return <PageLoading />

  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email

  // Stats
  const totalRequests = requests.length
  const activeRequests = requests.filter((r) => ['pending', 'approved', 'picked_up'].includes(r.status)).length
  const completedRequests = requests.filter((r) => ['returned', 'closed'].includes(r.status)).length

  const phoneChanged = phone !== (profile?.phone || '')

  // My Equipment — active loans from QR scans
  const myEquipment = (() => {
    if (!user?.id) return []
    const myLogs = allScanLogs.filter(l => l.user_id === user.id)
    const takes = myLogs.filter(l => l.action === 'take')
    const deposits = myLogs.filter(l => l.action === 'deposit')
    const productCounts = {}
    for (const t of takes) {
      if (!productCounts[t.product_id]) productCounts[t.product_id] = { takes: 0, deposits: 0, latest: null }
      productCounts[t.product_id].takes++
      if (!productCounts[t.product_id].latest || new Date(t.created_at) > new Date(productCounts[t.product_id].latest.created_at))
        productCounts[t.product_id].latest = t
    }
    for (const d of deposits) {
      if (productCounts[d.product_id]) productCounts[d.product_id].deposits++
    }
    return Object.values(productCounts).filter(pc => pc.takes > pc.deposits).map(pc => pc.latest)
  })()

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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // Reset so same file can be re-selected

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast('Please upload a PNG, JPEG, or WebP image', 'error')
      return
    }

    // Validate size
    if (file.size > MAX_AVATAR_SIZE) {
      showToast('Image must be under 2MB', 'error')
      return
    }

    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await updateProfile(user.id, { avatar_url: data.publicUrl })
      await refreshProfile()
      showToast('Profile photo updated')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">Profile</h1>
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
                aria-label="Change profile photo"
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
                  href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(user.email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#6264A7] hover:underline w-fit"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat on Teams
                </a>
              )}
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="elevated" className="h-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <ClipboardList className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <AnimatedCounter value={totalRequests} className="text-3xl font-bold" />
              <p className="text-xs text-muted-foreground mt-1">Total Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" className="h-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-amber-500" />
              <AnimatedCounter value={activeRequests} className="text-3xl font-bold text-amber-500" />
              <p className="text-xs text-muted-foreground mt-1">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" className="h-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-green-500" />
              <AnimatedCounter value={completedRequests} className="text-3xl font-bold text-green-500" />
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact */}
      <Card>
        <CardHeader className="px-6 pt-6 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
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

      {/* My Equipment */}
      <Card>
        <CardHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" /> My Equipment
            </CardTitle>
            <Link to="/scan">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary">
                <QrCode className="h-3.5 w-3.5" /> Scan to return
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {myEquipment.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No equipment currently checked out.</p>
          ) : (
            <div className="space-y-2">
              {myEquipment.map((loan) => {
                const today = new Date().toISOString().split('T')[0]
                const isOverdue = loan.expected_return_date && loan.expected_return_date < today
                return (
                  <div key={loan.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                    {loan.product_image ? (
                      <img src={loan.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{loan.product_name}</p>
                      {loan.expected_return_date && (
                        <p className="text-[10px] text-muted-foreground">
                          Return by {format(new Date(loan.expected_return_date + 'T12:00:00'), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    {isOverdue && (
                      <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] shrink-0">
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Overdue
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
