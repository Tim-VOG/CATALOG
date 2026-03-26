import { useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowDownToLine, ArrowUpFromLine, Package, Layers, AlertTriangle,
  CheckCircle2, XCircle, Calendar, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { addDays, format } from 'date-fns'

const QUICK_DURATIONS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
]

export function ScanActionCard({ qrData, onAction, loading, result }) {
  const [step, setStep] = useState('choose') // 'choose' | 'loan-period'
  const [returnDate, setReturnDate] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(null)

  if (result) {
    return <ScanResult result={result} />
  }

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const handleTakeClick = () => {
    setStep('loan-period')
    // Default to 1 week
    const defaultDate = format(addDays(today, 7), 'yyyy-MM-dd')
    setReturnDate(defaultDate)
    setSelectedDuration(7)
  }

  const handleQuickDuration = (days) => {
    setSelectedDuration(days)
    setReturnDate(format(addDays(today, days), 'yyyy-MM-dd'))
  }

  const handleDateChange = (e) => {
    setReturnDate(e.target.value)
    setSelectedDuration(null) // Clear quick selection when manually choosing
  }

  const handleConfirmTake = () => {
    if (!returnDate) return
    onAction('take', { returnDate })
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

      {/* Step 1: Choose action */}
      {step === 'choose' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleTakeClick}
                disabled={loading || qrData.product_stock <= 0}
                className={cn(
                  'w-full h-24 flex-col gap-2 rounded-2xl text-base font-semibold',
                  'bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
                  'text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30',
                  'disabled:opacity-50 disabled:shadow-none'
                )}
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
        </div>
      )}

      {/* Step 2: Loan period (Take only) */}
      {step === 'loan-period' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <Label className="text-sm font-semibold mb-0">Loan Period</Label>
            </div>

            {/* Quick duration buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_DURATIONS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => handleQuickDuration(days)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    selectedDuration === days
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date picker */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Return by</label>
              <input
                type="date"
                value={returnDate}
                min={todayStr}
                onChange={handleDateChange}
                className={cn(
                  'w-full h-10 px-3 text-sm rounded-lg',
                  'bg-muted/40 border border-border/50',
                  'focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10'
                )}
              />
            </div>

            {returnDate && (
              <p className="text-xs text-muted-foreground mt-2">
                Equipment due back on <strong className="text-foreground">{format(new Date(returnDate + 'T12:00:00'), 'MMMM d, yyyy')}</strong>
              </p>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('choose')}
              className="gap-2"
            >
              Back
            </Button>
            <Button
              onClick={handleConfirmTake}
              disabled={!returnDate || loading}
              loading={loading}
              className={cn(
                'gap-2',
                'bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
                'text-white shadow-lg shadow-orange-500/20'
              )}
            >
              Confirm Take
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
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

            {isTake ? (
              <>
                <h3 className="text-xl font-display font-bold mb-1">Item Taken</h3>
                <p className="text-muted-foreground mb-4">
                  {result.product_name}
                  {result.kit_name && ` (${result.kit_name})`}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm mb-3">
                  <div className="text-center">
                    <div className="text-muted-foreground">Before</div>
                    <div className="text-lg font-bold">{result.stock_before}</div>
                  </div>
                  <div className="text-2xl font-bold text-destructive">-1</div>
                  <div className="text-center">
                    <div className="text-muted-foreground">After</div>
                    <div className="text-lg font-bold">{result.stock_after}</div>
                  </div>
                </div>
                {result.return_date && (
                  <p className="text-xs text-muted-foreground border-t border-border/30 pt-3 mt-3">
                    Please return by <strong className="text-foreground">{format(new Date(result.return_date + 'T12:00:00'), 'MMMM d, yyyy')}</strong>
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-xl font-display font-bold mb-2">Thank you!</h3>
                <p className="text-muted-foreground mb-4">
                  The equipment has been successfully returned.
                </p>
                <p className="text-sm font-medium">
                  {result.product_name}
                  {result.kit_name && ` (${result.kit_name})`}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm mt-3">
                  <div className="text-center">
                    <div className="text-muted-foreground">Before</div>
                    <div className="text-lg font-bold">{result.stock_before}</div>
                  </div>
                  <div className="text-2xl font-bold text-success">+1</div>
                  <div className="text-center">
                    <div className="text-muted-foreground">After</div>
                    <div className="text-lg font-bold">{result.stock_after}</div>
                  </div>
                </div>
              </>
            )}
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
