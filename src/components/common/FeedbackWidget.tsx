import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { MessageSquarePlus, Lightbulb, Bug, MessageCircle, X, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { submitFeedback, type FeedbackKind } from '@/lib/api/feedback'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const KINDS: { value: FeedbackKind; icon: any; labelKey: string }[] = [
  { value: 'idea', icon: Lightbulb, labelKey: 'feedback.kindIdea' },
  { value: 'bug', icon: Bug, labelKey: 'feedback.kindBug' },
  { value: 'other', icon: MessageCircle, labelKey: 'feedback.kindOther' },
]

/**
 * Floating "Feedback" button (bottom-right) → a small dialog where any user
 * can drop an idea / bug / suggestion. Stored in the `feedback` table.
 */
export function FeedbackWidget() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FeedbackKind>('idea')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [errored, setErrored] = useState(false)

  const reset = () => { setMessage(''); setKind('idea'); setSent(false); setErrored(false) }
  const close = () => { setOpen(false); setTimeout(reset, 200) }

  const send = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await submitFeedback({
        kind,
        message: message.trim(),
        page: location.pathname,
        user_id: user?.id || null,
        user_email: user?.email || null,
        user_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null,
      })
      setSent(true)
      setTimeout(close, 1600)
    } catch {
      // Surfaced inline below via a simple state
      setSending(false)
      setErrored(true)
      return
    }
    setSending(false)
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-11 items-center gap-2 rounded-full bg-foreground pl-3.5 pr-4 text-background shadow-lg transition hover:scale-105 active:scale-95 sm:bottom-6"
        aria-label={t('feedback.button')}
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="text-sm font-semibold">{t('feedback.button')}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={close} />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-2xl"
            >
              <button onClick={close} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label={t('feedback.cancel')}>
                <X className="h-4 w-4" />
              </button>

              {sent ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                    <Check className="h-7 w-7 text-emerald-500" />
                  </motion.div>
                  <p className="mt-4 font-medium text-foreground">{t('feedback.sent')}</p>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-display font-bold text-foreground">{t('feedback.title')}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t('feedback.subtitle')}</p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {KINDS.map((k) => {
                      const active = kind === k.value
                      return (
                        <button
                          key={k.value}
                          onClick={() => setKind(k.value)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-medium transition',
                            active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40',
                          )}
                        >
                          <k.icon className="h-4 w-4" />
                          {t(k.labelKey)}
                        </button>
                      )
                    })}
                  </div>

                  <textarea
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); setErrored(false) }}
                    placeholder={t('feedback.placeholder')}
                    rows={4}
                    className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                  {errored && <p className="mt-1.5 text-xs text-destructive">{t('feedback.error')}</p>}

                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="ghost" onClick={close} disabled={sending}>{t('feedback.cancel')}</Button>
                    <Button onClick={send} disabled={sending || !message.trim()} className="gap-2">
                      {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {sending ? t('feedback.sending') : t('feedback.send')}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
