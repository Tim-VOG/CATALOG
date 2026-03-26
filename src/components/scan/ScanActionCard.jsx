import { motion } from 'motion/react'
import { ArrowDownToLine, ArrowUpFromLine, Package, Layers, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ScanActionCard({ qrData, onAction, loading, result }) {
  if (result) {
    return <ScanResult result={result} />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm mx-auto space-y-4"
    >
      {/* Product info */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          {qrData.product_image ? (
            <img
              src={qrData.product_image}
              alt={qrData.product_name}
              className="w-16 h-16 rounded-xl object-cover bg-muted"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-lg truncate">{qrData.product_name}</h3>
            {qrData.kit_name && (
              <div className="flex items-center gap-1.5 text-sm text-accent">
                <Layers className="h-3.5 w-3.5" />
                <span>Kit: {qrData.kit_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              {qrData.category_name && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${qrData.category_color}20`, color: qrData.category_color }}
                >
                  {qrData.category_name}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                Stock: <span className="font-semibold text-foreground">{qrData.product_stock}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => onAction('take')}
            disabled={loading || qrData.product_stock <= 0}
            className={cn(
              'w-full h-24 flex-col gap-2 rounded-2xl text-base font-semibold',
              'bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
              'text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30',
              'disabled:opacity-50 disabled:shadow-none'
            )}
            loading={loading}
          >
            <ArrowUpFromLine className="h-7 w-7" />
            Take
          </Button>
          {qrData.product_stock <= 0 && (
            <p className="text-xs text-destructive text-center mt-1.5 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Out of stock
            </p>
          )}
        </motion.div>

        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => onAction('deposit')}
            disabled={loading}
            className={cn(
              'w-full h-24 flex-col gap-2 rounded-2xl text-base font-semibold',
              'bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
              'text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30',
            )}
            loading={loading}
          >
            <ArrowDownToLine className="h-7 w-7" />
            Deposit
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}

function ScanResult({ result }) {
  const isSuccess = result.success
  const isTake = result.action === 'take'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
      className="w-full max-w-sm mx-auto"
    >
      <Card className={cn(
        'p-6 text-center border-2',
        isSuccess
          ? 'border-success/30 bg-success/5'
          : 'border-destructive/30 bg-destructive/5'
      )}>
        {isSuccess ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            >
              <CheckCircle2 className="h-16 w-16 mx-auto text-success mb-4" />
            </motion.div>
            <h3 className="text-xl font-display font-bold mb-1">
              {isTake ? 'Item Taken' : 'Item Deposited'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {result.product_name}
              {result.kit_name && ` (${result.kit_name})`}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-muted-foreground">Before</div>
                <div className="text-lg font-bold">{result.stock_before}</div>
              </div>
              <div className={cn(
                'text-2xl font-bold',
                isTake ? 'text-destructive' : 'text-success'
              )}>
                {isTake ? '-1' : '+1'}
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">After</div>
                <div className="text-lg font-bold">{result.stock_after}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h3 className="text-xl font-display font-bold mb-1">Error</h3>
            <p className="text-muted-foreground">{result.error}</p>
          </>
        )}
      </Card>
    </motion.div>
  )
}
