import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Check, WifiOff, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductConfigModal } from './ProductConfigModal'
import { cn } from '@/lib/utils'

export function ProductCard({ product, loans, cart, onAddToCart, subscriptionPlans, productOptions }) {
  const [showConfig, setShowConfig] = useState(false)

  const activeLoans = loans.filter(
    (l) => l.product_id === product.id && (l.status === 'active' || l.status === 'pending')
  )
  const borrowed = activeLoans.reduce((sum, l) => sum + l.quantity, 0)
  const inCart = cart.find((c) => c.product.id === product.id)?.quantity || 0
  const available = product.total_stock - borrowed - inCart
  const needsConfig = product.has_accessories || product.has_software || product.has_subscription || product.has_apps

  const handleAdd = () => {
    if (needsConfig) setShowConfig(true)
    else onAddToCart(product, 1, {})
  }

  const handleConfirm = (opts) => {
    onAddToCart(product, 1, opts)
    setShowConfig(false)
  }

  return (
    <>
      <Card className="overflow-hidden hover:border-primary/50 transition-colors group">
        <Link to={`/catalog/${product.id}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={product.image_url || 'https://via.placeholder.com/400x250?text=No+Image'}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
            <Badge
              className="absolute top-3 left-3"
              style={{ backgroundColor: product.category_color || '#6b7280' }}
            >
              {product.category_name}
              {product.sub_type && ` - ${product.sub_type}`}
            </Badge>
          </div>
        </Link>

        <CardContent className="p-4 space-y-3">
          <Link to={`/catalog/${product.id}`}>
            <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>

          {product.includes?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.includes.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5">
                  <Check className="h-3 w-3 text-success" />
                  {item}
                </span>
              ))}
            </div>
          )}

          {product.wifi_only && (
            <div className="flex items-center gap-1 text-xs text-warning">
              <WifiOff className="h-3 w-3" /> WiFi only - No 4G/5G
            </div>
          )}

          {product.printer_info && (
            <div className="flex items-center gap-1 text-xs text-warning">
              <AlertTriangle className="h-3 w-3" /> B&W Laser - Print only
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm">
              <span
                className={cn(
                  'font-bold',
                  available > 3 ? 'text-success' : available > 0 ? 'text-warning' : 'text-destructive'
                )}
              >
                {available}
              </span>
              <span className="text-muted-foreground"> / {product.total_stock} available</span>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={available <= 0}>
              <Plus className="h-4 w-4" />
              {needsConfig ? 'Configure' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showConfig && (
        <ProductConfigModal
          product={product}
          subscriptionPlans={subscriptionPlans}
          productOptions={productOptions}
          onConfirm={handleConfirm}
          onClose={() => setShowConfig(false)}
        />
      )}
    </>
  )
}
