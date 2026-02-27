import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import * as Icons from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function getIcon(iconName) {
  const Icon = Icons[iconName]
  return Icon || Icons.FileText
}

// Block-specific option fields
function BlockOptions({ blockKey, options, onChange }) {
  const update = (key, value) => onChange({ ...options, [key]: value })

  switch (blockKey) {
    case 'cta_link':
      return (
        <div className="space-y-3 mt-3 pt-3 border-t border-dashed">
          <div className="space-y-1">
            <Label className="text-xs">Button URL</Label>
            <Input
              value={options.url || ''}
              onChange={(e) => update('url', e.target.value)}
              placeholder="https://..."
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Label FR</Label>
              <Input
                value={options.label_fr || ''}
                onChange={(e) => update('label_fr', e.target.value)}
                placeholder="Acceder"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label EN</Label>
              <Input
                value={options.label_en || ''}
                onChange={(e) => update('label_en', e.target.value)}
                placeholder="Access"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      )

    case 'sharepoint':
    case 'teams':
      return (
        <div className="space-y-3 mt-3 pt-3 border-t border-dashed">
          <div className="space-y-1">
            <Label className="text-xs">Link URL</Label>
            <Input
              value={options.url || ''}
              onChange={(e) => update('url', e.target.value)}
              placeholder="https://..."
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Button label FR</Label>
              <Input
                value={options.label_fr || ''}
                onChange={(e) => update('label_fr', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Button label EN</Label>
              <Input
                value={options.label_en || ''}
                onChange={(e) => update('label_en', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      )

    case 'wifi':
      return (
        <div className="space-y-3 mt-3 pt-3 border-t border-dashed">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Network name</Label>
              <Input
                value={options.network_name || ''}
                onChange={(e) => update('network_name', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Guest network</Label>
              <Input
                value={options.guest_network || ''}
                onChange={(e) => update('guest_network', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      )

    case 'building_info':
      return (
        <div className="space-y-3 mt-3 pt-3 border-t border-dashed">
          <div className="space-y-1">
            <Label className="text-xs">Building address</Label>
            <Input
              value={options.building_address || ''}
              onChange={(e) => update('building_address', e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reception phone</Label>
            <Input
              value={options.reception_phone || ''}
              onChange={(e) => update('reception_phone', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      )

    case 'faq_it':
      return (
        <div className="space-y-3 mt-3 pt-3 border-t border-dashed">
          <div className="space-y-1">
            <Label className="text-xs">IT support email</Label>
            <Input
              value={options.support_email || ''}
              onChange={(e) => update('support_email', e.target.value)}
              placeholder="it-support@vo-group.be"
              className="text-sm"
            />
          </div>
        </div>
      )

    default:
      return null
  }
}

export function SortableBlock({ block, blockTemplate, language, onToggle, onContentChange, onOptionChange }) {
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
  }

  const BlockIcon = getIcon(blockTemplate?.icon)
  const label = language === 'fr' ? blockTemplate?.label_fr : blockTemplate?.label_en
  const content = language === 'fr' ? block.content_fr : block.content_en
  const contentKey = language === 'fr' ? 'content_fr' : 'content_en'

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn(
        'transition-all duration-200',
        !block.enabled && 'opacity-50',
        isDragging && 'shadow-lg ring-2 ring-primary/30'
      )}>
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
              onClick={() => setExpanded(!expanded)}
            >
              <BlockIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{label}</span>
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </button>

            <Badge variant="outline" className="text-[9px] uppercase shrink-0">
              {language}
            </Badge>

            <Switch
              checked={block.enabled}
              onCheckedChange={onToggle}
              className="shrink-0"
            />
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="px-4 pb-4 border-t bg-muted/5">
              <div className="pt-3 space-y-1">
                <Label className="text-xs">Content ({language.toUpperCase()})</Label>
                <Textarea
                  value={content || ''}
                  onChange={(e) => onContentChange(contentKey, e.target.value)}
                  rows={6}
                  className="text-sm font-mono"
                  placeholder="Email block content..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}, {'{{start_date}}'}, {'{{team}}'}, {'{{department}}'}
                </p>
              </div>

              <BlockOptions
                blockKey={block.block_key}
                options={block.options || {}}
                onChange={onOptionChange}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
