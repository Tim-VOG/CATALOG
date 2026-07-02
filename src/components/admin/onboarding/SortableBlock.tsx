import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'
import * as Icons from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'

function getIcon(iconName: any) {
  const Icon = Icons[iconName]
  return Icon || Icons.FileText
}

// Color scheme per block type
const BLOCK_COLORS = {
  salutation:      { bg: 'bg-emerald-500/10', border: 'border-l-emerald-500', text: 'text-emerald-500', accent: '#22c55e' },
  email_info:      { bg: 'bg-blue-500/10', border: 'border-l-blue-500', text: 'text-blue-500', accent: '#3b82f6' },
  password:        { bg: 'bg-foreground/5', border: 'border-l-foreground', text: 'text-foreground', accent: '#0a0a0a' },
  building_info:   { bg: 'bg-amber-500/10', border: 'border-l-amber-500', text: 'text-amber-500', accent: '#f59e0b' },
  it_security:     { bg: 'bg-red-500/10', border: 'border-l-red-500', text: 'text-red-500', accent: '#ef4444' },
  email_signature: { bg: 'bg-violet-500/10', border: 'border-l-violet-500', text: 'text-violet-500', accent: '#8b5cf6' },
  sharepoint:      { bg: 'bg-blue-600/10', border: 'border-l-blue-600', text: 'text-blue-600', accent: '#2563eb' },
  teams:           { bg: 'bg-indigo-500/10', border: 'border-l-indigo-500', text: 'text-indigo-500', accent: '#6366f1' },
  wifi:            { bg: 'bg-cyan-500/10', border: 'border-l-cyan-500', text: 'text-cyan-500', accent: '#06b6d4' },
  image_rights:    { bg: 'bg-pink-500/10', border: 'border-l-pink-500', text: 'text-pink-500', accent: '#ec4899' },
  faq_it:          { bg: 'bg-orange-500/10', border: 'border-l-orange-500', text: 'text-orange-500', accent: '#f97316' },
  cta_link:        { bg: 'bg-primary/10', border: 'border-l-primary', text: 'text-primary', accent: '#f97316' },
  closing:         { bg: 'bg-teal-500/10', border: 'border-l-teal-500', text: 'text-teal-500', accent: '#14b8a6' },
  signature_admin: { bg: 'bg-slate-500/10', border: 'border-l-slate-500', text: 'text-slate-600', accent: '#0a2540' },
}

const DEFAULT_COLOR = { bg: 'bg-muted/20', border: 'border-l-muted-foreground', text: 'text-muted-foreground', accent: '#64748b' }

// Blocks that display a section label in the email (all except salutation and closing)
const BLOCKS_WITH_SECTION_LABEL = [
  'email_info', 'password', 'building_info', 'it_security', 'email_signature',
  'sharepoint', 'teams', 'wifi', 'image_rights', 'faq_it', 'cta_link',
]

// Generic section label override — shown for every block that has a visible section header
function SectionLabelOptions({ blockKey, options, update  }: any) {
  if (!BLOCKS_WITH_SECTION_LABEL.includes(blockKey)) return null
  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section Label Override</Label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Label FR</Label>
          <Input
            value={options.section_label_fr || ''}
            onChange={(e: any) => update('section_label_fr', e.target.value)}
            placeholder="Default from template"
            className="text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Label EN</Label>
          <Input
            value={options.section_label_en || ''}
            onChange={(e: any) => update('section_label_en', e.target.value)}
            placeholder="Default from template"
            className="text-sm"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/50">Leave empty to use the default section label</p>
    </div>
  )
}

// Block-specific option fields
function BlockOptions({ blockKey, options, onChange  }: any) {
  const update = (key: any, value: any) => onChange({ ...options, [key]: value })

  // Render specific options + generic section label options
  const sectionLabel = <SectionLabelOptions blockKey={blockKey} options={options} update={update} />

  switch (blockKey) {
    case 'salutation':
      return (
        <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Header Branding</Label>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Header title</Label>
              <Input
                value={options.header_title || ''}
                onChange={(e: any) => update('header_title', e.target.value)}
                placeholder="VO IT HUB"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground/50">Appears at the top of the email (e.g. "VO IT HUB")</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Welcome title FR</Label>
                <Input
                  value={options.welcome_title_fr || ''}
                  onChange={(e: any) => update('welcome_title_fr', e.target.value)}
                  placeholder="Bienvenue {{first_name}} !"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Welcome title EN</Label>
                <Input
                  value={options.welcome_title_en || ''}
                  onChange={(e: any) => update('welcome_title_en', e.target.value)}
                  placeholder="Welcome {{first_name}}!"
                  className="text-sm"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50">Use {"{{first_name}}"}, {"{{last_name}}"}, etc. for dynamic values</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Subtitle FR</Label>
                <Input
                  value={options.header_subtitle_fr || ''}
                  onChange={(e: any) => update('header_subtitle_fr', e.target.value)}
                  placeholder="Votre guide d'int&eacute;gration chez VO Group"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Subtitle EN</Label>
                <Input
                  value={options.header_subtitle_en || ''}
                  onChange={(e: any) => update('header_subtitle_en', e.target.value)}
                  placeholder="Your onboarding guide at VO Group"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Accent color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={options.accent_color || '#f97316'}
                  onChange={(e: any) => update('accent_color', e.target.value)}
                  className="h-8 w-12 rounded border border-border cursor-pointer"
                />
                <Input
                  value={options.accent_color || ''}
                  onChange={(e: any) => update('accent_color', e.target.value)}
                  placeholder="#f97316"
                  className="text-sm flex-1 font-mono"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/50">Used for the header stripe, title accents, and footer branding</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Footer text FR</Label>
                <Input
                  value={options.footer_text_fr || ''}
                  onChange={(e: any) => update('footer_text_fr', e.target.value)}
                  placeholder="Plateforme IT interne"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Footer text EN</Label>
                <Input
                  value={options.footer_text_en || ''}
                  onChange={(e: any) => update('footer_text_en', e.target.value)}
                  placeholder="Internal IT Platform"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )

    case 'closing':
      return (
        <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Footer Branding</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Auto-send notice FR</Label>
              <Input
                value={options.auto_notice_fr || ''}
                onChange={(e: any) => update('auto_notice_fr', e.target.value)}
                placeholder="Cet email a &eacute;t&eacute; envoy&eacute; automatiquement"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Auto-send notice EN</Label>
              <Input
                value={options.auto_notice_en || ''}
                onChange={(e: any) => update('auto_notice_en', e.target.value)}
                placeholder="This email was sent automatically"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      )

    case 'password':
      return (
        <>
          <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1Password Link</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Secure share URL</Label>
                <Input
                  value={options.url || ''}
                  onChange={(e: any) => update('url', e.target.value)}
                  placeholder="https://start.1password.com/..."
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Paste the 1Password sharing link unlocked by the recipient's personal e-mail.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label FR</Label>
                  <Input
                    value={options.label_fr || ''}
                    onChange={(e: any) => update('label_fr', e.target.value)}
                    placeholder="Récupérer mon mot de passe"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label EN</Label>
                  <Input
                    value={options.label_en || ''}
                    onChange={(e: any) => update('label_en', e.target.value)}
                    placeholder="Retrieve my password"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          {sectionLabel}
        </>
      )

    case 'cta_link':
      return (
        <>
          <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Button Settings</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Button URL</Label>
                <Input
                  value={options.url || ''}
                  onChange={(e: any) => update('url', e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label FR</Label>
                  <Input
                    value={options.label_fr || ''}
                    onChange={(e: any) => update('label_fr', e.target.value)}
                    placeholder="Acceder"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label EN</Label>
                  <Input
                    value={options.label_en || ''}
                    onChange={(e: any) => update('label_en', e.target.value)}
                    placeholder="Access"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          {sectionLabel}
        </>
      )

    case 'sharepoint':
    case 'teams':
      return (
        <>
          <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link Settings</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Link URL</Label>
                <Input
                  value={options.url || ''}
                  onChange={(e: any) => update('url', e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Button label FR</Label>
                  <Input
                    value={options.label_fr || ''}
                    onChange={(e: any) => update('label_fr', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Button label EN</Label>
                  <Input
                    value={options.label_en || ''}
                    onChange={(e: any) => update('label_en', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          {sectionLabel}
        </>
      )

    case 'wifi':
      return (
        <>
          <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Network Settings</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Network name</Label>
                <Input
                  value={options.network_name || ''}
                  onChange={(e: any) => update('network_name', e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Guest network</Label>
                <Input
                  value={options.guest_network || ''}
                  onChange={(e: any) => update('guest_network', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          {sectionLabel}
        </>
      )

    case 'building_info':
      return (
        <>
          <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Building Details</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Building address</Label>
                <Input
                  value={options.building_address || ''}
                  onChange={(e: any) => update('building_address', e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reception phone</Label>
                <Input
                  value={options.reception_phone || ''}
                  onChange={(e: any) => update('reception_phone', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
          {sectionLabel}
        </>
      )

    case 'image_rights':
    case 'faq_it':
      return (
        <>
          <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-muted-foreground/20">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Button Link</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">URL</Label>
                <Input
                  value={options.url || ''}
                  onChange={(e: any) => update('url', e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label FR</Label>
                  <Input
                    value={options.label_fr || ''}
                    onChange={(e: any) => update('label_fr', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Label EN</Label>
                  <Input
                    value={options.label_en || ''}
                    onChange={(e: any) => update('label_en', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          {sectionLabel}
        </>
      )

    default:
      // For blocks with no specific options, still show section label override if applicable
      return sectionLabel
  }
}

// Truncate content for preview
function ContentPreview({ content  }: any) {
  if (!content) return null
  const preview = content.replace(/\n+/g, ' ').trim()
  const truncated = preview.length > 100 ? preview.slice(0, 100) + '...' : preview
  return (
    <p className="text-[11px] text-muted-foreground/70 line-clamp-1 mt-0.5 pl-0.5">
      {truncated}
    </p>
  )
}

export function SortableBlock({ block, blockTemplate, language, onToggle, onContentChange, onOptionChange  }: any) {
  const [expanded, setExpanded] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.block_key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  }

  const colors = (BLOCK_COLORS as Record<string, any>)[block.block_key] || DEFAULT_COLOR
  const BlockIcon = getIcon(blockTemplate?.icon)
  const label = language === 'fr' ? blockTemplate?.label_fr : blockTemplate?.label_en
  const content = language === 'fr' ? block.content_fr : block.content_en
  const contentKey = language === 'fr' ? 'content_fr' : 'content_en'

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn(
        'transition-all duration-200 border-l-[3px] overflow-hidden',
        colors.border,
        !block.enabled && 'opacity-40 grayscale',
        isDragging && 'shadow-xl ring-2 ring-primary/30 scale-[1.02]',
        !isDragging && block.enabled && 'hover:shadow-md',
      )}>
        <CardContent className="p-0">
          {/* Header row */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            {/* Drag handle */}
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* Icon badge */}
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', colors.bg)}>
              <BlockIcon className={cn('h-4 w-4', colors.text)} />
            </div>

            {/* Label + preview */}
            <button
              type="button"
              className="flex-1 min-w-0 text-left group"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{label}</span>
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
                </motion.div>
              </div>
              {!expanded && <ContentPreview content={content} />}
            </button>

            {/* Language badge */}
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] uppercase shrink-0 font-bold px-1.5 py-0',
                language === 'fr' ? 'border-blue-500/30 text-blue-400' : 'border-emerald-500/30 text-emerald-400'
              )}
            >
              {language}
            </Badge>

            {/* Enable/disable switch */}
            <div className="flex items-center gap-1.5 shrink-0">
              {block.enabled ? (
                <Eye className="h-3 w-3 text-muted-foreground/40" />
              ) : (
                <EyeOff className="h-3 w-3 text-muted-foreground/30" />
              )}
              <Switch
                checked={block.enabled}
                onCheckedChange={onToggle}
              />
            </div>
          </div>

          {/* Expanded editor */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-border/50">
                  {/* Content section */}
                  <div className="pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Content ({language.toUpperCase()})
                      </Label>
                      <span className="text-[10px] text-muted-foreground/50">
                        {(content || '').length} chars
                      </span>
                    </div>
                    <Textarea
                      value={content || ''}
                      onChange={(e: any) => onContentChange(contentKey, e.target.value)}
                      rows={6}
                      className="text-sm font-mono bg-muted/20 border-muted-foreground/10 focus:border-primary/40"
                      placeholder="Email block content..."
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['first_name', 'last_name', 'email', 'start_date', 'team', 'department'].map((v: any) => (
                        <button
                          key={v}
                          type="button"
                          className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 hover:bg-primary/20 transition-colors cursor-pointer font-mono"
                          onClick={() => {
                            const textarea = document.activeElement
                            if (textarea?.tagName === 'TEXTAREA') {
                              const pos = (textarea as any).selectionStart
                              const val = content || ''
                              const newVal = val.slice(0, pos) + `{{${v}}}` + val.slice(pos)
                              onContentChange(contentKey, newVal)
                            }
                          }}
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options section */}
                  <BlockOptions
                    blockKey={block.block_key}
                    options={block.options || {}}
                    onChange={onOptionChange}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}
