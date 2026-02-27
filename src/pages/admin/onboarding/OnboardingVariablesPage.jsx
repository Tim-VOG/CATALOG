import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useItRequests } from '@/hooks/use-it-requests'
import { createOnboardingRecipient } from '@/lib/api/onboarding'
import { useUIStore } from '@/stores/ui-store'
import { motion } from 'motion/react'
import {
  Variable, ArrowRight, Search, Calendar, UserPlus,
  Braces, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { OnboardingTabNav } from './OnboardingRecipientsPage'

// Mapping from IT request fields → onboarding variables
const VARIABLE_MAPPING = [
  { variable: '{{first_name}}', itField: 'first_name', label: 'First Name' },
  { variable: '{{last_name}}', itField: 'last_name', label: 'Last Name' },
  { variable: '{{email}}', itField: 'generated_email', label: 'Corporate Email (auto-generated)' },
  { variable: '{{personal_email}}', itField: 'personal_email', label: 'Personal Email' },
  { variable: '{{team}}', itField: 'business_unit', label: 'Team / Business Unit' },
  { variable: '{{department}}', itField: 'status', label: 'Department / Status' },
  { variable: '{{start_date}}', itField: 'start_date', label: 'Start Date' },
]

function VariableMappingCard({ itRequest }) {
  return (
    <div className="space-y-2">
      {VARIABLE_MAPPING.map(({ variable, itField, label, note }) => {
        const value = itField ? itRequest[itField] : null
        const hasValue = !!value

        return (
          <div
            key={variable}
            className="flex items-center gap-3 text-sm px-3 py-2 rounded-lg bg-muted/30"
          >
            <code className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">
              {variable}
            </code>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              {hasValue ? (
                <span className="text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  {itField === 'start_date'
                    ? new Date(value).toLocaleDateString('fr-FR')
                    : value}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                  {note || 'Not provided'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/60 shrink-0">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function OnboardingVariablesPage() {
  const { data: itRequests = [], isLoading } = useItRequests()
  const showToast = useUIStore((s) => s.showToast)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [creatingId, setCreatingId] = useState(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return itRequests
    const q = search.toLowerCase()
    return itRequests.filter(
      (r) =>
        r.first_name?.toLowerCase().includes(q) ||
        r.last_name?.toLowerCase().includes(q) ||
        r.business_unit?.toLowerCase().includes(q)
    )
  }, [itRequests, search])

  const handleAutoFill = async (req) => {
    setCreatingId(req.id)
    try {
      const recipient = await createOnboardingRecipient({
        first_name: req.first_name,
        last_name: req.last_name,
        email: req.generated_email || '',
        team: req.business_unit || '',
        department: req.status || '',
        start_date: req.start_date || null,
        language: 'fr',
        personal_email: req.personal_email || '',
      })
      showToast('Recipient created from IT request!')
      navigate(`/admin/onboarding/compose?recipientId=${recipient.id}`)
    } catch (err) {
      showToast(err.message || 'Failed to create recipient', 'error')
    } finally {
      setCreatingId(null)
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-gradient-primary">Onboarding</h1>
          <p className="text-muted-foreground mt-1">Map IT request data to email variables</p>
          <motion.div
            className="mt-3 h-0.5 w-16 rounded-full bg-primary/60"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ originX: 0 }}
          />
        </div>
      </div>

      <OnboardingTabNav />

      {/* Variable legend */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Braces className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Variable Mapping</h3>
              <p className="text-xs text-muted-foreground">
                IT request submissions are mapped to onboarding email variables.
                Click "Auto-fill & Compose" to create a recipient from an IT request and open the email composer with pre-filled data.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_MAPPING.map(({ variable }) => (
                  <code key={variable} className="text-[10px] font-mono bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                    {variable}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search IT requests..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* IT Request cards with variable mapping */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Variable}
          title="No IT requests"
          description={search ? 'Try a different search term' : 'Submit an IT request from the Hub to see variable mappings here'}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <Card key={req.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-5 space-y-4">
                {/* Request header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-amber-500">
                        {req.first_name?.[0]}{req.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{req.first_name} {req.last_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {req.status && <Badge variant="outline" className="text-[10px]">{req.status}</Badge>}
                        {req.business_unit && <Badge variant="secondary" className="text-[10px]">{req.business_unit}</Badge>}
                        {req.start_date && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(req.start_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => handleAutoFill(req)}
                    disabled={creatingId === req.id}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {creatingId === req.id ? 'Creating...' : 'Auto-fill & Compose'}
                  </Button>
                </div>

                {/* Variable mapping */}
                <VariableMappingCard itRequest={req} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
