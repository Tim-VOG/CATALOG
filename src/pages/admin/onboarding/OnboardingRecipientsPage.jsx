import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useOnboardingRecipients, useCreateRecipient, useUpdateRecipient, useDeleteRecipient } from '@/hooks/use-onboarding'
import { motion } from 'motion/react'
import { UserPlus, Pencil, Trash2, Search, Mail, Users, Globe, Calendar, Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  personal_email: '',
  team: '',
  department: '',
  start_date: '',
  language: 'fr',
  custom_links: [],
}

const TABS = [
  { key: 'recipients', label: 'Recipients', to: '/admin/onboarding' },
  { key: 'compose', label: 'Compose', to: '/admin/onboarding/compose' },
  { key: 'history', label: 'History', to: '/admin/onboarding/history' },
  { key: 'variables', label: 'Variables', to: '/admin/onboarding/variables' },
]

export function OnboardingTabNav() {
  const location = useLocation()

  const getActiveTab = () => {
    if (location.pathname.includes('/compose')) return 'compose'
    if (location.pathname.includes('/history')) return 'history'
    if (location.pathname.includes('/variables')) return 'variables'
    return 'recipients'
  }

  const active = getActiveTab()

  return (
    <div className="flex gap-1 bg-muted/40 rounded-full p-1 border w-fit">
      {TABS.map(({ key, label, to }) => (
        <Link key={key} to={to}>
          <Button
            variant={active === key ? 'default' : 'ghost'}
            size="sm"
            className={cn('h-8 text-xs px-4 rounded-full', active === key && 'shadow-sm')}
          >
            {label}
          </Button>
        </Link>
      ))}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-64 rounded bg-muted/60" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded bg-muted" />
                <div className="h-8 w-8 rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SchemaError() {
  return (
    <Card className="border-amber-500/30">
      <CardContent className="p-6 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Database tables not found</h3>
          <p className="text-sm text-muted-foreground">
            The onboarding tables haven't been created yet. Please run the migration:
          </p>
          <code className="block text-xs bg-muted/50 rounded-lg p-3 text-muted-foreground">
            supabase/migrations/020_onboarding_tables.sql
          </code>
          <p className="text-xs text-muted-foreground">
            After running the migration, go to Supabase Dashboard → Project Settings → API and click <strong>"Reload schema cache"</strong>, then refresh this page.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function OnboardingRecipientsPage() {
  const { data: recipients = [], isLoading, error } = useOnboardingRecipients()
  const createRecipient = useCreateRecipient()
  const updateRecipient = useUpdateRecipient()
  const deleteRecipient = useDeleteRecipient()
  const showToast = useUIStore((s) => s.showToast)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  const isSchemaError = error?.message?.includes('schema cache') || error?.message?.includes('relation') || error?.code === '42P01'

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  const openEdit = (r) => {
    setEditing(r)
    setForm({
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      personal_email: r.personal_email || '',
      team: r.team || '',
      department: r.department || '',
      start_date: r.start_date || '',
      language: r.language || 'fr',
      custom_links: r.custom_links || [],
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        start_date: form.start_date || null,
      }
      if (editing) {
        await updateRecipient.mutateAsync({ id: editing.id, ...payload })
        showToast('Recipient updated')
      } else {
        await createRecipient.mutateAsync(payload)
        showToast('Recipient added')
      }
      setShowForm(false)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this recipient?')) return
    try {
      await deleteRecipient.mutateAsync(id)
      showToast('Recipient deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const filtered = recipients.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.team || '').toLowerCase().includes(q) ||
      (r.department || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">Onboarding</h1>
          <p className="text-muted-foreground mt-1">Manage new hire welcome emails</p>
          <motion.div
            className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ originX: 0 }}
          />
        </div>
        <Button onClick={openCreate} className="gap-2" disabled={!!isSchemaError}>
          <Plus className="h-4 w-4" /> Add Recipient
        </Button>
      </div>

      <OnboardingTabNav />

      {/* Schema error banner */}
      {isSchemaError && <SchemaError />}

      {/* Quick stats */}
      {!isSchemaError && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{recipients.length}</span>
            <span className="text-muted-foreground">recipients</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/30 rounded-full px-4 py-1.5 text-sm">
            <Globe className="h-3.5 w-3.5 text-cyan-500" />
            <span className="font-semibold">{recipients.filter((r) => r.language === 'fr').length}</span>
            <span className="text-muted-foreground">FR</span>
            <span className="text-muted-foreground/50">|</span>
            <span className="font-semibold">{recipients.filter((r) => r.language === 'en').length}</span>
            <span className="text-muted-foreground">EN</span>
          </div>
        </div>
      )}

      {/* Search */}
      {!isSchemaError && (
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipients..."
            className="pl-10 rounded-full"
          />
        </div>
      )}

      {/* Recipients list */}
      {isLoading ? (
        <SkeletonRows />
      ) : isSchemaError ? null : filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No recipients"
          description={search ? 'Try a different search term' : 'Add your first recipient to get started'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:border-primary/20 hover:shadow-card-hover transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {r.first_name[0]}{r.last_name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{r.first_name} {r.last_name}</h3>
                      <Badge variant={r.language === 'fr' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                        {r.language}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {r.email}
                      </span>
                      {r.team && <span>{r.team}</span>}
                      {r.department && <span>{r.department}</span>}
                      {r.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(r.start_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Link to={`/admin/onboarding/compose?recipientId=${r.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Compose email">
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Recipient' : 'Add Recipient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>First name *</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Last name *</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Corporate Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Corporate email" />
            </div>
            <div className="space-y-1">
              <Label>Personal Email</Label>
              <Input type="email" value={form.personal_email} onChange={(e) => setForm({ ...form, personal_email: e.target.value })} placeholder="Personal email (for welcome email)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Team</Label>
                <Input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Start date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Language</Label>
                <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  <option value="fr">French</option>
                  <option value="en">English</option>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.first_name || !form.last_name || !form.email}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
