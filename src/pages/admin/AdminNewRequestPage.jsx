import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useProducts } from '@/hooks/use-products'
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans'
import { useLocations } from '@/hooks/use-locations'
import { useActiveFormFields } from '@/hooks/use-form-fields'
import { useCreateLoanRequest } from '@/hooks/use-loan-requests'
import { useAppSettings } from '@/hooks/use-settings'
import { useUIStore } from '@/stores/ui-store'
import { sendEmail } from '@/lib/api/send-email'
import { wrapEmailHtml, generateDetailsCard, generateItemsHtml, escapeHtml } from '@/lib/email-html'
import { getNotificationRecipients } from '@/lib/api/notification-recipients'
import { getEmailTemplateByKey } from '@/lib/api/email-templates'
import { generateStatusEmailDraft } from '@/lib/email-draft'
import {
  ArrowLeft, ArrowRight, Check, Send, Plus, X as XIcon, Mail,
  Search, Package, Minus, Settings2, Trash2, CalendarRange,
} from 'lucide-react'
import { DynamicField } from '@/components/admin/DynamicField'
import { ProductConfigModal } from '@/components/catalog/ProductConfigModal'
import { UserSearchSelect } from '@/components/admin/UserSearchSelect'
import { UserAvatar } from '@/components/common/UserAvatar'
import { CompactDateBar } from '@/components/catalog/CompactDateBar'
import { BlurImage } from '@/components/common/BlurImage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

const STEPS = ['User & Equipment', 'Project Details', 'Review & Submit']

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function AdminNewRequestPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: products = [] } = useProducts()
  const { data: subscriptionPlans = [] } = useSubscriptionPlans()
  const { data: locations = [] } = useLocations()
  const { data: activeFields = [] } = useActiveFormFields()
  const { data: settings } = useAppSettings()
  const createRequest = useCreateLoanRequest()
  const showToast = useUIStore((s) => s.showToast)

  // State
  const [step, setStep] = useState(0)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fieldValues, setFieldValues] = useState({ priority: 'normal' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [ccEmails, setCcEmails] = useState([])
  const [autoApprove, setAutoApprove] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [configProduct, setConfigProduct] = useState(null)

  // ---- Helpers ----

  const setFieldValue = (key, val) => {
    setFieldValues((prev) => ({ ...prev, [key]: val }))
  }

  const addProduct = (product, quantity = 1, options = {}) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity, options } : i
        )
      }
      return [...prev, { product, quantity, options }]
    })
  }

  const updateItemQuantity = (productId, delta) => {
    setSelectedItems((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    )
  }

  const removeItem = (productId) => {
    setSelectedItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const handleConfigConfirm = (product, options) => {
    addProduct(product, 1, options)
    setConfigProduct(null)
  }

  const needsConfig = (product) =>
    product.has_subscription || product.has_apps

  // ---- Validation ----

  const validateStep0 = () => {
    if (!selectedUser) {
      showToast('Please select a user', 'error')
      return false
    }
    if (selectedItems.length === 0) {
      showToast('Please add at least one product', 'error')
      return false
    }
    if (!startDate || !endDate) {
      showToast('Please set pickup and return dates', 'error')
      return false
    }
    if (new Date(endDate) <= new Date(startDate)) {
      showToast('Return date must be after pickup date', 'error')
      return false
    }
    return true
  }

  const validateStep1 = () => {
    const errors = {}
    activeFields.forEach((field) => {
      const val = fieldValues[field.field_key]
      if (field.is_required) {
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.field_key] = `${field.label} is required`
        }
      }
      if (field.field_type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[field.field_key] = 'Please enter a valid email'
      }
    })
    ccEmails.forEach((email, i) => {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors[`cc_email_${i}`] = 'Invalid email address'
      }
    })
    if (fieldValues.project_name && fieldValues.project_name.length < 3) {
      errors.project_name = 'Project name must be at least 3 characters'
    }
    if (fieldValues.project_description && fieldValues.project_description.length < 10) {
      errors.project_description = 'Please provide a brief description (min 10 characters)'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ---- System field renderer (same logic as CheckoutPage) ----

  const renderSystemField = (field) => {
    const key = field.field_key
    const error = fieldErrors[key]

    if (key === 'location_id') {
      return (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={key}>{field.label} {field.is_required && '*'}</Label>
          <Select id={key} value={fieldValues[key] || ''} onChange={(e) => setFieldValue(key, e.target.value)}>
            <option value="">Select location...</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </Select>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {fieldValues.location_id && locations.find((l) => l.id === fieldValues.location_id)?.name?.includes('Remote') && (
            <div className="space-y-1 mt-2">
              <Label htmlFor="location_other">Shipping Address</Label>
              <Textarea
                id="location_other"
                value={fieldValues.location_other || ''}
                onChange={(e) => setFieldValue('location_other', e.target.value)}
                placeholder="Full delivery address..."
                rows={2}
              />
            </div>
          )}
        </div>
      )
    }

    if (key === 'priority') {
      return (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={key}>{field.label}</Label>
          <Select id={key} value={fieldValues[key] || 'normal'} onChange={(e) => setFieldValue(key, e.target.value)}>
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
      )
    }

    if (field.field_type === 'textarea') {
      return (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={key}>{field.label} {field.is_required && '*'}</Label>
          <Textarea
            id={key}
            value={fieldValues[key] || ''}
            onChange={(e) => setFieldValue(key, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
          />
          {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )
    }

    return (
      <div key={field.id} className="space-y-1">
        <Label htmlFor={key}>{field.label} {field.is_required && '*'}</Label>
        <Input
          id={key}
          value={fieldValues[key] || ''}
          onChange={(e) => setFieldValue(key, e.target.value)}
          placeholder={field.placeholder || ''}
        />
        {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  const renderField = (field) => {
    if (field.is_system) return renderSystemField(field)
    return (
      <DynamicField
        key={field.id}
        field={field}
        value={fieldValues[field.field_key]}
        onChange={(val) => setFieldValue(field.field_key, val)}
        error={fieldErrors[field.field_key]}
      />
    )
  }

  // ---- Submit ----

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const onSubmit = async () => {
    const systemKeys = activeFields.filter((f) => f.is_system).map((f) => f.field_key)
    const validCcEmails = ccEmails.map((e) => e.trim()).filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    const customFields = {}
    Object.entries(fieldValues).forEach(([k, v]) => {
      if (!systemKeys.includes(k) && !['terms_accepted', 'responsibility_accepted', 'location_other'].includes(k)) {
        customFields[k] = v
      }
    })
    if (validCcEmails.length > 0) {
      customFields.cc_emails = validCcEmails
    }

    try {
      const req = await createRequest.mutateAsync({
        request: {
          user_id: selectedUser.id,
          created_by: user.id,
          project_name: fieldValues.project_name || '',
          project_description: fieldValues.project_description || '',
          location_id: null,
          location_other: null,
          justification: fieldValues.justification || null,
          priority: fieldValues.priority || 'normal',
          pickup_date: startDate,
          return_date: endDate,
          terms_accepted: true,
          responsibility_accepted: true,
          custom_fields: customFields,
          status: autoApprove ? 'ready' : 'pending',
        },
        items: selectedItems,
      })

      showToast('Request created successfully!')

      // Send emails (fire & forget)
      const appName = settings?.app_name || 'VO Gear Hub'
      const logoUrl = settings?.logo_url || ''
      const tagline = settings?.email_tagline || ''
      const logoHeight = settings?.email_logo_height || 0
      const requesterName = `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email
      const selectedLoc = locations.find((l) => l.id === fieldValues.location_id)

      const itemData = selectedItems.map((i) => ({
        product_name: i.product.name,
        product_image: i.product.image_url,
        quantity: i.quantity,
        product_includes: i.product.includes || [],
      }))

      // 1) Order confirmation to user
      getEmailTemplateByKey('order_confirmation')
        .then(async (template) => {
          if (!template || !template.is_active) return
          const requestData = {
            user_first_name: selectedUser.first_name || '',
            user_last_name: selectedUser.last_name || '',
            user_email: selectedUser.email,
            project_name: fieldValues.project_name || '',
            project_description: fieldValues.project_description || '',
            pickup_date: startDate,
            return_date: endDate,
            location_name: selectedLoc?.name || '',
            custom_fields: customFields,
          }
          const draft = generateStatusEmailDraft({ template, request: requestData, items: itemData, appName, logoUrl, tagline, logoHeight })
          if (draft.to) {
            await sendEmail({ to: draft.to, cc: validCcEmails.length > 0 ? validCcEmails : undefined, subject: draft.subject, body: draft.body, isHtml: draft.isHtml })
          }
        })
        .catch(() => {})

      // 2) Admin notification
      const detailsCard = generateDetailsCard({
        project_name: fieldValues.project_name || '',
        pickup_date: formatDate(startDate),
        return_date: formatDate(endDate),
      })
      const adminItemsHtml = generateItemsHtml(itemData)
      const adminBody = wrapEmailHtml(
        `New equipment request created by admin on behalf of <strong style="color:#f1f5f9;">${escapeHtml(requesterName)}</strong>.\n\n` +
        detailsCard + '\n\n' +
        adminItemsHtml,
        { appName, logoUrl, tagline, logoHeight }
      )

      getNotificationRecipients()
        .then(async (recipients) => {
          const adminEmails = (recipients || [])
            .filter((r) => r.is_active && r.notify_on_new_request)
            .map((r) => r.email)
          if (adminEmails.length === 0) return
          await sendEmail({
            to: adminEmails,
            subject: `[${appName}] New request: ${fieldValues.project_name || 'Equipment request'} — for ${requesterName} (admin)`,
            body: adminBody,
            isHtml: true,
          })
        })
        .catch(() => {})

      navigate('/admin/requests')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // ---- Filtered products ----

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.category_name || '').toLowerCase().includes(q)
  })

  const selectedLocation = locations.find((l) => l.id === fieldValues.location_id)

  // ---- Render ----

  return (
    <div className="space-y-6">
      <AdminPageHeader title="New Request" description="Create an equipment reservation on behalf of a user" />

      {/* Stepper */}
      <div className="flex items-center gap-4">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-sm font-medium', i <= step ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-12 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* ===== STEP 0: User & Equipment ===== */}
      {step === 0 && (
        <div className="space-y-4">
          {/* User selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select User</CardTitle>
            </CardHeader>
            <CardContent>
              <UserSearchSelect value={selectedUser} onChange={setSelectedUser} />
            </CardContent>
          </Card>

          {/* Dates */}
          <CompactDateBar
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start || '')
              setEndDate(end || '')
            }}
          />

          {/* Product selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Add Equipment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9"
                />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y rounded-xl border bg-muted/10">
                {filteredProducts.map((product) => {
                  const inCart = selectedItems.find((i) => i.product.id === product.id)
                  return (
                    <div key={product.id} className={cn(
                      'flex items-center gap-3 px-3 py-2.5 transition-colors',
                      inCart ? 'bg-primary/5' : 'hover:bg-muted/30'
                    )}>
                      <div className="h-11 w-11 rounded-lg shrink-0 overflow-hidden">
                        <BlurImage
                          src={product.image_url || 'https://via.placeholder.com/44'}
                          alt={product.name}
                          containerClassName="h-11 w-11"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-[11px] text-muted-foreground">{product.category_name} · Stock: {product.total_stock}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {inCart ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className=""
                              onClick={() => updateItemQuantity(product.id, -1)}
                              aria-label={`Decrease ${product.name} quantity`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{inCart.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className=""
                              onClick={() => updateItemQuantity(product.id, 1)}
                              aria-label={`Increase ${product.name} quantity`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            {needsConfig(product) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 ml-1"
                                onClick={() => setConfigProduct(product)}
                                title="Configure options"
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              if (needsConfig(product)) {
                                setConfigProduct(product)
                              } else {
                                addProduct(product)
                              }
                            }}
                          >
                            <Plus className="h-3 w-3" /> Add
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredProducts.length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">No products found</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected items summary */}
          {selectedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Selected Items ({selectedItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {selectedItems.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="h-10 w-10 rounded bg-muted shrink-0 overflow-hidden">
                      {item.product.image_url && (
                        <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      {Object.keys(item.options || {}).filter((k) => {
                        const v = item.options[k]
                        return v && (!Array.isArray(v) || v.length > 0)
                      }).length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          Options: {Object.entries(item.options)
                            .filter(([, v]) => v && (!Array.isArray(v) || v.length > 0))
                            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-medium">&times; {item.quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.product.id)}
                      aria-label={`Remove ${item.product.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                if (validateStep0()) setStep(1)
              }}
            >
              Next: Project Details <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 1: Project Details ===== */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeFields.map((field) => renderField(field))}

            {/* CC Email Recipients */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  CC Recipients
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 text-xs"
                  onClick={() => setCcEmails((prev) => [...prev, ''])}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Add email addresses that should also receive notifications.</p>
              {ccEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      const updated = [...ccEmails]
                      updated[i] = e.target.value
                      setCcEmails(updated)
                      if (fieldErrors[`cc_email_${i}`]) {
                        setFieldErrors((prev) => { const next = { ...prev }; delete next[`cc_email_${i}`]; return next })
                      }
                    }}
                    placeholder="colleague@company.com"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setCcEmails((prev) => prev.filter((_, j) => j !== i))
                      setFieldErrors((prev) => { const next = { ...prev }; delete next[`cc_email_${i}`]; return next })
                    }}
                    aria-label="Remove CC email"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                  {fieldErrors[`cc_email_${i}`] && (
                    <p className="text-xs text-destructive shrink-0">{fieldErrors[`cc_email_${i}`]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={() => {
                  if (validateStep1()) setStep(2)
                }}
              >
                Review <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== STEP 2: Review & Submit ===== */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Request summary */}
          <Card>
            <CardHeader>
              <CardTitle>Request Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Requester</span>
                  <div className="flex items-center gap-2 mt-1">
                    <UserAvatar
                      avatarUrl={selectedUser?.avatar_url}
                      firstName={selectedUser?.first_name}
                      lastName={selectedUser?.last_name}
                      email={selectedUser?.email}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium">{selectedUser?.first_name} {selectedUser?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Loan Period</span>
                  <p className="font-medium">{formatDate(startDate)} &rarr; {formatDate(endDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Project</span>
                  <p className="font-medium">{fieldValues.project_name || '—'}</p>
                </div>
                {selectedLocation && (
                  <div>
                    <span className="text-muted-foreground">Location</span>
                    <p className="font-medium">{selectedLocation.name}</p>
                  </div>
                )}
              </div>
              {fieldValues.project_description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Description</span>
                  <p>{fieldValues.project_description}</p>
                </div>
              )}
              {activeFields.filter((f) => !f.is_system && fieldValues[f.field_key]).map((field) => (
                <div key={field.id} className="text-sm">
                  <span className="text-muted-foreground">{field.label}</span>
                  <p>{Array.isArray(fieldValues[field.field_key]) ? fieldValues[field.field_key].join(', ') : String(fieldValues[field.field_key])}</p>
                </div>
              ))}
              {ccEmails.filter((e) => e.trim()).length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">CC Recipients</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ccEmails.filter((e) => e.trim()).map((email, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">{email}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items ({selectedItems.length})</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {selectedItems.map((item) => (
                <div key={item.product.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                    {item.product.image_url && (
                      <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.category_name}</p>
                  </div>
                  <span className="text-sm font-medium">&times; {item.quantity}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Auto-approve & submit */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={autoApprove} onCheckedChange={setAutoApprove} />
                <div>
                  <span className="text-sm font-medium">Skip to Ready</span>
                  <p className="text-xs text-amber-500">This will skip the processing steps and immediately mark the request as ready</p>
                </div>
              </label>

              <div className="flex justify-between">
                <Button type="button" variant="outline" className="gap-2" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Edit Details
                </Button>
                <Button
                  className="gap-2"
                  disabled={createRequest.isPending}
                  onClick={onSubmit}
                >
                  <Send className="h-4 w-4" />
                  {createRequest.isPending ? 'Creating...' : 'Create Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ProductConfigModal */}
      {configProduct && (
        <ProductConfigModal
          product={configProduct}
          subscriptionPlans={subscriptionPlans}
          onConfirm={(options) => handleConfigConfirm(configProduct, options)}
          onClose={() => setConfigProduct(null)}
        />
      )}
    </div>
  )
}
