import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { format, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useAuth } from '@/lib/auth'
import { useQRCodesAssignedTo } from '@/hooks/use-qr-codes'
import { useCreateEquipmentIssue } from '@/hooks/use-equipment-issues'
import { uploadIssuePhoto } from '@/lib/api/equipment-issues'
import { useUIStore } from '@/stores/ui-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { PickupPointMap } from '@/components/common/PickupPointMap'
import {
  Package, AlertCircle, Mail, ScanLine, Calendar, ArrowRight, Upload, Loader2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SUPPORT_EMAIL = 'it@vo-group.be'

export function MyEquipmentPage() {
  const { user, profile } = useAuth()
  const { data: items = [], isLoading } = useQRCodesAssignedTo(user?.id)

  const now = useMemo(() => new Date(), [])

  const decoratedItems = useMemo(() => {
    return items.map((item: any) => {
      const expected = item.expected_return_date ? new Date(item.expected_return_date + 'T18:00:00') : null
      const daysLeft = expected ? differenceInDays(expected, now) : null
      const isOverdue = expected && expected < now
      const status: 'overdue' | 'soon' | 'ok' | 'open-ended' =
        !expected ? 'open-ended'
        : isOverdue ? 'overdue'
        : daysLeft !== null && daysLeft <= 2 ? 'soon'
        : 'ok'
      return { ...item, expected, daysLeft, status }
    })
  }, [items, now])

  const overdueCount = decoratedItems.filter((i: any) => i.status === 'overdue').length

  if (isLoading) return <PageLoading />

  const firstName = profile?.first_name || 'there'
  const subjectPrefix = encodeURIComponent('[VO Hub] ')
  const fromLine = encodeURIComponent(`Hi IT team,\n\nThis is ${firstName} (${user?.email || ''}).\n\n`)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 pb-12">
      <AdminPageHeader
        title="My equipment"
        section="HUB"
        description={
          decoratedItems.length === 0
            ? "You don't have any equipment checked out right now."
            : `${decoratedItems.length} item${decoratedItems.length > 1 ? 's' : ''} assigned to you${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}.`
        }
      />

      {decoratedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center mb-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Nothing on loan</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              When IT hands you a laptop, phone or other equipment, it shows up here so you can
              track when it's due and ask for help in one click.
            </p>
            <Link to="/catalog" className="mt-4">
              <Button variant="outline" size="sm" className="gap-2">
                Browse the catalog <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {decoratedItems.map((item: any, i: any) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <EquipmentCard item={item} userEmail={user?.email || ''} subjectPrefix={subjectPrefix} fromLine={fromLine} />
            </motion.div>
          ))}
        </div>
      )}

      <PickupPointMap className="mt-6" />

      <Card className="mt-6">
        <CardContent className="p-5">
          <p className="text-sm font-medium">Need something else?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Anything outside what's already on loan goes through the catalog or the IT
            request form. Returns happen at the IT desk — just bring the device.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link to="/catalog"><Button variant="outline" size="sm" className="gap-2"><Package className="h-3.5 w-3.5" /> Catalog</Button></Link>
            <Link to="/it-request"><Button variant="outline" size="sm" className="gap-2"><ScanLine className="h-3.5 w-3.5" /> IT request</Button></Link>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${subjectPrefix}IT%20support&body=${fromLine}`}>
              <Button variant="outline" size="sm" className="gap-2"><Mail className="h-3.5 w-3.5" /> Email IT</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface EquipmentCardProps {
  item: any
  userEmail: string
  subjectPrefix: string
  fromLine: string
}

function EquipmentCard({ item, subjectPrefix, fromLine }: EquipmentCardProps) {
  const { user, profile } = useAuth()
  const showToast = useUIStore((s: any) => s.showToast)
  const createIssue = useCreateEquipmentIssue()
  const [issueOpen, setIssueOpen] = useState(false)
  const [desc, setDesc] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const productLineName = item.product_name || item.label || 'Device'

  const handlePhoto = async (file: File) => {
    setUploading(true)
    try { setPhotoUrl(await uploadIssuePhoto(file)) }
    catch (err: any) { showToast(err?.message || 'Upload failed', 'error') }
    finally { setUploading(false) }
  }

  const submitIssue = async () => {
    if (!desc.trim()) { showToast('Describe the problem first', 'error'); return }
    try {
      await createIssue.mutateAsync({
        qr_code_id: item.id,
        qr_code: item.code,
        product_name: productLineName,
        reported_by: user?.id,
        reporter_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email,
        reporter_email: user?.email,
        description: desc.trim(),
        photo_url: photoUrl || null,
      })
      showToast('Problem reported — IT has been notified', 'success')
      setIssueOpen(false); setDesc(''); setPhotoUrl('')
    } catch (err: any) {
      showToast(err?.message || 'Could not send the report', 'error')
    }
  }

  const dueBadge = {
    overdue:    { label: `${Math.abs(item.daysLeft || 0)} d overdue`, classes: 'bg-rose-500/12 text-rose-500 border-rose-500/30' },
    soon:       { label: item.daysLeft === 0 ? 'due today' : `${item.daysLeft} d left`, classes: 'bg-amber-500/12 text-amber-600 border-amber-500/30' },
    ok:         { label: `${item.daysLeft} d left`, classes: 'bg-emerald-500/12 text-emerald-600 border-emerald-500/30' },
    'open-ended': { label: 'no return date set', classes: 'bg-muted text-muted-foreground border-border' },
  }[item.status as 'overdue' | 'soon' | 'ok' | 'open-ended']

  const productLine = productLineName
  const subject = `${subjectPrefix}${encodeURIComponent(`${productLine} — ${item.code}`)}`
  const returnBody = `${fromLine}${encodeURIComponent(`I'd like to return:\n  · ${productLine}\n  · QR ${item.code}\n\nWhen would suit you?`)}`

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-border/40 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{productLine}</p>
                <p className="text-xs text-muted-foreground/80 truncate">
                  <span className="font-mono">{item.code}</span>
                  {item.category_name ? ` · ${item.category_name}` : ''}
                </p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] shrink-0', dueBadge.classes)}>
                {dueBadge.label}
              </Badge>
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {item.assigned_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Since {format(new Date(item.assigned_at), 'd MMM', { locale: fr })}
                </span>
              )}
              {item.expected && (
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  Due {format(item.expected, 'd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Return%20-%20${subject}&body=${returnBody}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ScanLine className="h-3 w-3" /> Request return
                </Button>
              </a>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setIssueOpen(true)}>
                <AlertCircle className="h-3 w-3" /> Report a problem
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Report a problem → opens an IT ticket */}
      <Dialog open={issueOpen} onOpenChange={(v: boolean) => !v && setIssueOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a problem — {productLineName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{item.code}</span> · IT gets notified right away and can follow up.
            </p>
            <Textarea
              value={desc}
              onChange={(e: any) => setDesc(e.target.value)}
              placeholder="What's wrong? (cracked screen, won't charge, missing charger…)"
              rows={4}
              autoFocus
            />
            {photoUrl ? (
              <div className="relative inline-block">
                <img src={photoUrl} alt="" className="h-24 rounded-lg border border-border/50" />
                <button onClick={() => setPhotoUrl('')} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="cursor-pointer inline-flex">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e: any) => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted transition-colors">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Add a photo (optional)
                </span>
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={submitIssue} disabled={createIssue.isPending || uploading}>Send report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
