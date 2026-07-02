import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CheckCircle2, Home, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function RequestSentPage() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center min-h-[70vh] relative overflow-hidden">
      <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
      <motion.div
        className="absolute top-[20%] left-[15%] w-[300px] h-[300px] rounded-full bg-primary/8 blur-[80px] pointer-events-none"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center text-center gap-6 relative z-10 px-6"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
        >
          <CheckCircle2 className="h-24 w-24 text-emerald-500" strokeWidth={1.5} />
        </motion.div>

        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{t('requestSent.title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-sm">{t('requestSent.message')}</p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/">
            <Button variant="gradient" className="gap-2">
              <Home className="h-4 w-4" />
              {t('requestSent.backToHub')}
            </Button>
          </Link>
          <Link to="/my-requests">
            <Button variant="ghost" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('requestSent.myRequests')}
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
