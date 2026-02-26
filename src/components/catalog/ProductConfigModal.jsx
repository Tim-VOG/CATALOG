import { useState } from 'react'
import { Check, WifiOff } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export function ProductConfigModal({ product, subscriptionPlans, productOptions = [], onConfirm, onClose }) {
  const [options, setOptions] = useState({
    accessories: [],
    software: [],
    otherSoftware: '',
    subscription: '',
    subscriptionType: 'call',
    apps: '',
  })

  const toggleArray = (field, value) =>
    setOptions((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }))

  const filteredPlans = subscriptionPlans.filter(
    (p) => p.type === options.subscriptionType || p.type === 'both'
  )

  const accessoryOptions = productOptions.filter((o) => o.option_type === 'accessory')
  const softwareOptions = productOptions.filter((o) => o.option_type === 'software')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure: {product.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {product.has_accessories && accessoryOptions.length > 0 && (
            <div className="space-y-3">
              <Label className="font-semibold">Accessories</Label>
              <div className="space-y-2">
                {accessoryOptions.map((acc) => (
                  <label key={acc.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={options.accessories.includes(acc.value)}
                      onCheckedChange={() => toggleArray('accessories', acc.value)}
                    />
                    <span className="text-sm">{acc.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {product.has_software && softwareOptions.length > 0 && (
            <div className="space-y-3">
              <Label className="font-semibold">Software</Label>
              <div className="space-y-2">
                {softwareOptions.map((sw) => (
                  <label key={sw.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={options.software.includes(sw.value)}
                      onCheckedChange={() => toggleArray('software', sw.value)}
                    />
                    <span className="text-sm">{sw.label}</span>
                  </label>
                ))}
              </div>
              {options.software.includes('other') && (
                <Input
                  value={options.otherSoftware}
                  onChange={(e) => setOptions({ ...options, otherSoftware: e.target.value })}
                  placeholder="Specify software..."
                />
              )}
            </div>
          )}

          {product.has_subscription && (
            <div className="space-y-3">
              <Label className="font-semibold">Subscription Plan</Label>
              <div className="flex gap-2">
                {['call', 'data', 'both'].map((type) => (
                  <Button
                    key={type}
                    variant={options.subscriptionType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOptions({ ...options, subscriptionType: type, subscription: '' })}
                  >
                    {type === 'call' ? 'Call only' : type === 'data' ? 'Data only' : 'Call + Data'}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredPlans.map((plan) => (
                  <label key={plan.id} className="flex items-center justify-between cursor-pointer p-2 rounded border hover:bg-muted">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="subscription"
                        checked={options.subscription === plan.id}
                        onChange={() => setOptions({ ...options, subscription: plan.id })}
                        className="accent-primary"
                      />
                      <span className="text-sm">{plan.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{plan.price}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {product.has_apps && (
            <div className="space-y-3">
              <Label className="font-semibold">Apps to Pre-install</Label>
              <Textarea
                value={options.apps}
                onChange={(e) => setOptions({ ...options, apps: e.target.value })}
                placeholder="List apps..."
                rows={2}
              />
            </div>
          )}

          {product.includes?.length > 0 && (
            <div className="space-y-2">
              <Label className="font-semibold">Included</Label>
              <div className="flex flex-wrap gap-2">
                {product.includes.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted rounded px-2 py-1">
                    <Check className="h-3 w-3 text-success" />{item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.wifi_only && (
            <div className="flex items-center gap-2 text-sm text-warning">
              <WifiOff className="h-4 w-4" /> WiFi only - No cellular connectivity
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(options)}>Add to Cart</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
