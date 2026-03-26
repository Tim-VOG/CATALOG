import { useParams, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useProduct, useProductReservations } from '@/hooks/use-products'
import { useQRCodes } from '@/hooks/use-qr-codes'
import { useAuth } from '@/lib/auth'
import QRCodeLib from 'qrcode'
import {
  ArrowLeft, Check, WifiOff, AlertTriangle,
  QrCode, Package, Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryWrapper } from '@/components/common/QueryWrapper'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { BlurImage } from '@/components/common/BlurImage'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { AvailabilitySummaryCard } from '@/components/catalog/AvailabilitySummaryCard'
import { FadeIn, ScrollFadeIn } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

export function ProductDetailPage() {
  const { productId } = useParams()
  const productQuery = useProduct(productId)
  const { data: reservations = [] } = useProductReservations(productId)
  const { data: qrCodes = [] } = useQRCodes()
  const { isAdmin } = useAuth()

  const product = productQuery.data

  const productQRCodes = qrCodes.filter(qr => qr.product_id === productId)

  const handlePrintQR = async () => {
    if (!productQRCodes.length) return
    const images = await Promise.all(
      productQRCodes.map(async (qr) => {
        const url = await QRCodeLib.toDataURL(qr.code, { width: 200, margin: 1 })
        return { url, label: qr.label || product?.name, code: qr.code }
      })
    )
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>QR - ${product?.name}</title>
      <style>body{font-family:sans-serif;display:flex;flex-wrap:wrap;gap:16px;padding:20px}.card{text-align:center;border:1px solid #ddd;padding:12px;border-radius:8px;width:200px}.card img{width:160px;height:160px}.label{font-weight:700;margin-top:8px;font-size:13px}.code{color:#666;font-size:10px;margin-top:4px;font-family:monospace}@media print{body{gap:8px;padding:10px}.card{break-inside:avoid}}</style></head><body>
      ${images.map(img => `<div class="card"><img src="${img.url}"/><div class="label">${img.label}</div><div class="code">${img.code}</div></div>`).join('')}
    </body></html>`)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  if (productQuery.isLoading || productQuery.isError) {
    return <QueryWrapper query={productQuery} skeleton={<ShowcaseSkeleton />} />
  }
  if (!product) {
    return <div className="text-center py-16 text-muted-foreground">Product not found</div>
  }

  const available = product.total_stock
  const hasWarnings = product.wifi_only || product.printer_info

  const includesList = (product.includes || [])
    .flatMap((item) => item.split(/[;,]/))
    .map((s) => s.trim())
    .filter(Boolean)
  const hasIncludes = includesList.length > 0
  const hasSpecs = product.specs && Object.keys(product.specs).length > 0

  return (
    <div className="relative overflow-hidden">
      {/* Back button */}
      <FadeIn className="max-w-6xl mx-auto px-4">
        <Link to="/catalog">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to catalog
          </Button>
        </Link>
      </FadeIn>

      {/* HERO */}
      <div className="relative mt-4">
        <motion.div
          className="absolute top-[-15%] left-[10%] w-[420px] h-[420px] rounded-full bg-primary/[0.07] blur-[100px] pointer-events-none"
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[5%] right-[5%] w-[350px] h-[350px] rounded-full bg-cyan-500/[0.06] blur-[90px] pointer-events-none"
          animate={{ x: [0, -30, 15, 0], y: [0, 20, -15, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Title + description */}
        <FadeIn delay={0.05} y={16} className="text-center max-w-2xl mx-auto px-4">
          <CategoryBadge
            name={product.category_name}
            color={product.category_color}
            subType={product.sub_type}
            className="mx-auto"
          />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight mt-3 leading-[1.05]">
            {product.name}
          </h1>
          {product.description && (
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mt-3 max-w-lg mx-auto line-clamp-2">
              {product.description}
            </p>
          )}
        </FadeIn>

        {/* Desktop orbital layout */}
        <div className="hidden xl:grid xl:grid-cols-[1fr_auto_1fr] xl:gap-6 xl:items-start max-w-[1200px] mx-auto mt-10 px-4">
          <FadeIn delay={0.2} y={24} className="flex justify-end pt-12">
            {hasIncludes ? (
              <div className="w-full max-w-[260px]">
                <IncludesFloatingCard includes={includesList} />
              </div>
            ) : <div />}
          </FadeIn>

          <FadeIn delay={0.1} y={12} className="flex justify-center">
            <ProductShowcase src={product.image_url} alt={product.name} />
          </FadeIn>

          <FadeIn delay={0.25} y={24} className="pt-6">
            <div className="w-full max-w-[300px]">
              <AvailabilitySummaryCard
                available={available}
                totalStock={product.total_stock}
                reservations={reservations}
              />
            </div>
          </FadeIn>
        </div>

        {/* Mobile / Tablet */}
        <div className="xl:hidden max-w-sm mx-auto mt-8 px-4">
          <FadeIn delay={0.1}>
            <ProductShowcase src={product.image_url} alt={product.name} />
          </FadeIn>
        </div>
      </div>

      {/* QR Scan CTA + Print QR */}
      <FadeIn delay={0.3} y={10} className="flex justify-center gap-3 mt-8 xl:mt-10 px-4">
        <Link to="/scan">
          <Button
            className="rounded-full h-12 sm:h-14 px-8 sm:px-12 text-base sm:text-lg gap-2.5 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
          >
            <QrCode className="h-5 w-5" />
            Scan QR to Take or Return
          </Button>
        </Link>
        {isAdmin && productQRCodes.length > 0 && (
          <Button
            variant="outline"
            className="rounded-full h-12 sm:h-14 px-6 gap-2"
            onClick={handlePrintQR}
          >
            <Printer className="h-4 w-4" />
            Print QR
          </Button>
        )}
      </FadeIn>

      {/* Warnings */}
      {hasWarnings && (
        <FadeIn delay={0.35} className="max-w-md mx-auto mt-6 px-4">
          <div className="space-y-2 bg-warning/10 rounded-xl p-3 border border-warning/20">
            {product.wifi_only && (
              <div className="flex items-center gap-2 text-sm text-warning">
                <WifiOff className="h-4 w-4 shrink-0" /> WiFi only — No cellular
              </div>
            )}
            {product.printer_info && (
              <div className="flex items-center gap-2 text-sm text-warning">
                <AlertTriangle className="h-4 w-4 shrink-0" /> B&W Laser — Print only
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {/* Mobile cards (stacked) */}
      <div className="xl:hidden max-w-md mx-auto mt-8 px-4 space-y-4">
        <ScrollFadeIn>
          <AvailabilitySummaryCard
            available={available}
            totalStock={product.total_stock}
            reservations={reservations}
          />
        </ScrollFadeIn>

        {hasIncludes && (
          <ScrollFadeIn>
            <IncludesFloatingCard includes={includesList} />
          </ScrollFadeIn>
        )}
      </div>

      {/* Specifications */}
      {hasSpecs && (
        <ScrollFadeIn className="max-w-2xl mx-auto mt-10 px-4">
          <Card variant="glass">
            <CardContent className="p-5">
              <h3 className="font-semibold text-base mb-3">Specifications</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1.5 border-b border-border/20 last:border-0">
                    <dt className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="font-medium text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </ScrollFadeIn>
      )}

      <div className="h-12" />
    </div>
  )
}

function ProductShowcase({ src, alt }) {
  return (
    <div className="relative w-full max-w-[420px]">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.10) 0%, hsl(var(--primary) / 0.04) 40%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-[110%] h-[110%] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(var(--accent) / 0.06) 0%, transparent 60%)' }}
      />
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[75%] h-5 bg-foreground/[0.04] rounded-[50%] blur-lg pointer-events-none" />
      <div className="relative group">
        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <BlurImage
            src={src || 'https://via.placeholder.com/600x600?text=No+Image'}
            alt={alt}
            containerClassName="aspect-square rounded-2xl bg-transparent"
            className="object-contain transition-all duration-500"
          />
        </motion.div>
      </div>
    </div>
  )
}

function IncludesFloatingCard({ includes }) {
  return (
    <Card variant="glass" spotlight className="max-w-[280px]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">What's included</h3>
        </div>
        <div className="space-y-1.5">
          {includes.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-success shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ShowcaseSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 space-y-8">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col items-center space-y-3">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-12 w-64" />
        <SkeletonText lines={1} className="max-w-xs" />
      </div>
      <div className="hidden xl:grid xl:grid-cols-[1fr_auto_1fr] gap-6 items-center">
        <div className="flex justify-end"><Skeleton className="h-44 w-[260px] rounded-xl" /></div>
        <Skeleton className="aspect-square w-[420px] rounded-2xl" />
        <Skeleton className="h-72 w-[300px] rounded-xl" />
      </div>
      <div className="xl:hidden flex justify-center">
        <Skeleton className="aspect-square w-full max-w-sm rounded-2xl" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-14 w-52 rounded-full" />
      </div>
    </div>
  )
}
