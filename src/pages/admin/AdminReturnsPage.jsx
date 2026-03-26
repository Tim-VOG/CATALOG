import { useState, useCallback } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useLoans, useReturnLoan } from '@/hooks/use-loans'
import { AlertTriangle, Clock, Check, User, RotateCcw, QrCode, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/common/EmptyState'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { QRScanner } from '@/components/scan/QRScanner'
import { useQRCodeByCode } from '@/hooks/use-qr-codes'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

const getDaysUntil = (d) => {
  return differenceInCalendarDays(parseISO(d), new Date())
}

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export function AdminReturnsPage() {
  const { data: loans = [], isLoading } = useLoans()
  const returnLoan = useReturnLoan()
  const showToast = useUIStore((s) => s.showToast)
  const [selected, setSelected] = useState(null)
  const [condition, setCondition] = useState('good')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')

  // QR scan state
  const [showScanner, setShowScanner] = useState(false)
  const [scannedCode, setScannedCode] = useState(null)
  const { data: qrData } = useQRCodeByCode(scannedCode)

  const today = new Date().toISOString().split('T')[0]
  const active = loans.filter((l) => l.status === 'active').sort((a, b) => new Date(a.return_date) - new Date(b.return_date))
  const overdue = active.filter((l) => l.return_date < today)
  const dueSoon = active.filter((l) => { const d = getDaysUntil(l.return_date); return d >= 0 && d <= 3 })
  const upcoming = active.filter((l) => getDaysUntil(l.return_date) > 3)

  // Filter by search term
  const filterLoans = (list) => {
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter((l) =>
      l.product_name?.toLowerCase().includes(q) ||
      l.borrower_name?.toLowerCase().includes(q) ||
      l.borrower_email?.toLowerCase().includes(q)
    )
  }

  // When QR is scanned, find the matching active loan and auto-open return dialog
  const handleQRScan = useCallback((code) => {
    setScannedCode(code)
    setShowScanner(false)
  }, [])

  // Auto-match scanned QR to active loan
  if (qrData && scannedCode) {
    const matchingLoan = active.find((l) => l.product_id === qrData.product_id)
    if (matchingLoan && (!selected || selected.id !== matchingLoan.id)) {
      setSelected(matchingLoan)
      setCondition('good')
      setNotes('')
      setScannedCode(null) // Reset to prevent loop
    } else if (!matchingLoan && scannedCode) {
      showToast('No active loan found for this item', 'error')
      setScannedCode(null)
    }
  }

  const handleReturn = async () => {
    try {
      await returnLoan.mutateAsync({ id: selected.id, condition, notes })
      showToast('Return processed')
      setSelected(null)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const openReturn = (loan) => {
    setSelected(loan)
    setCondition('good')
    setNotes('')
  }

  if (isLoading) return <PageLoading />

  const renderLoan = (loan, status) => {
    const days = getDaysUntil(loan.return_date)
    return (
      <Card key={loan.id} className={cn(status === 'overdue' && 'border-destructive/50')}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold">{loan.product_name} &times; {loan.quantity}</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" /> {loan.borrower_name}
              </div>
              <div className="text-sm">
                Due: {formatDate(loan.return_date)} &mdash;{' '}
                <span className={cn(
                  'font-medium',
                  status === 'overdue' ? 'text-destructive' : status === 'due-soon' ? 'text-warning' : 'text-muted-foreground'
                )}>
                  {status === 'overdue' ? `${Math.abs(days)} days overdue` : status === 'due-soon' ? `Due in ${days} days` : `${days} days left`}
                </span>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => openReturn(loan)}>
              <RotateCcw className="h-4 w-4" /> Process Return
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Returns" description={`${active.length} active loans`}>
        <Button
          onClick={() => setShowScanner(!showScanner)}
          variant={showScanner ? 'secondary' : 'default'}
          size="sm"
          className="gap-2"
        >
          {showScanner ? <X className="h-3.5 w-3.5" /> : <QrCode className="h-3.5 w-3.5" />}
          {showScanner ? 'Close Scanner' : 'Scan Return'}
        </Button>
      </AdminPageHeader>

      {/* QR Scanner for quick returns */}
      {showScanner && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="text-center mb-3">
            <h3 className="font-display font-semibold text-sm">Quick Return: Scan Equipment QR Code</h3>
            <p className="text-xs text-muted-foreground">Scan the QR code on the equipment to instantly find the loan and process the return</p>
          </div>
          <QRScanner onScan={handleQRScan} scanning={showScanner} />
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{overdue.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{dueSoon.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Active</CardTitle>
            <Check className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-success">{active.length}</div></CardContent>
        </Card>
      </div>

      {/* Search bar */}
      {active.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product or borrower..."
            className="pl-10"
          />
        </div>
      )}

      {filterLoans(overdue).length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-destructive font-semibold"><AlertTriangle className="h-5 w-5" /> Overdue</h2>
          {filterLoans(overdue).map((l) => renderLoan(l, 'overdue'))}
        </div>
      )}

      {filterLoans(dueSoon).length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-warning font-semibold"><Clock className="h-5 w-5" /> Due Soon</h2>
          {filterLoans(dueSoon).map((l) => renderLoan(l, 'due-soon'))}
        </div>
      )}

      {filterLoans(upcoming).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-muted-foreground">All Active</h2>
          {filterLoans(upcoming).map((l) => renderLoan(l, 'active'))}
        </div>
      )}

      {active.length === 0 && <EmptyState icon={Check} title="No active loans" description="No equipment is currently on loan" />}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Return</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selected.product_name} &times; {selected.quantity}</p>
                <p className="text-sm text-muted-foreground">Borrowed by: {selected.borrower_name}</p>
              </div>
              <div className="space-y-1">
                <Label>Condition</Label>
                <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="good">Good</option>
                  <option value="minor">Minor issues</option>
                  <option value="damaged">Damaged</option>
                  <option value="lost">Lost</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button variant="success" onClick={handleReturn}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
