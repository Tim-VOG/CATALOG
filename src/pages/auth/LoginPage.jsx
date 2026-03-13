import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '@/lib/auth'
import { useAppSettings } from '@/hooks/use-settings'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'

const MicrosoftIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 21 21">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
)

export function LoginPage() {
  const { user, signInWithMicrosoft } = useAuth()
  const { data: settings } = useAppSettings()

  // ── Force light mode on login page ──
  useEffect(() => {
    const root = document.documentElement
    const prevTheme = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')

    const lightVars = {
      '--color-background': '#f8fafc',
      '--color-foreground': '#0f172a',
      '--color-card': '#ffffff',
      '--color-card-foreground': '#0f172a',
      '--color-popover': '#ffffff',
      '--color-popover-foreground': '#0f172a',
      '--color-secondary': '#f1f5f9',
      '--color-secondary-foreground': '#0f172a',
      '--color-muted': '#f1f5f9',
      '--color-muted-foreground': '#64748b',
      '--color-border': '#e2e8f0',
      '--color-input': '#e2e8f0',
    }
    for (const [prop, value] of Object.entries(lightVars)) {
      root.style.setProperty(prop, value)
    }

    return () => {
      if (prevTheme) root.setAttribute('data-theme', prevTheme)
    }
  }, [])

  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url_light || settings?.logo_url

  if (user) return <Navigate to="/" replace />

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-background overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

      {/* Animated gradient blobs */}
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/12 blur-[120px]"
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/12 blur-[100px]"
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 50, -30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-violet-500/8 blur-[80px]"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating geometric decorations */}
      <motion.div
        className="absolute top-[15%] right-[15%] w-16 h-16 border border-primary/15 rounded-xl pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[12%] w-10 h-10 border border-accent/15 rounded-full pointer-events-none"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Card with glass effect and entry animation */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card variant="glass" tilt className="backdrop-saturate-150 overflow-hidden">
          {/* Gradient top accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <CardHeader className="text-center pb-2">
            <motion.div
              className="flex justify-center mb-5"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="h-14 w-auto object-contain" />
              ) : (
                <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 text-primary shadow-glow-primary">
                  <Package className="h-8 w-8" />
                </div>
              )}
            </motion.div>

            <CardTitle className="text-3xl font-display text-gradient-primary">
              {appName}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                Book. Borrow. Return.
              </motion.span>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 pb-8 space-y-5">
            <motion.p
              className="text-center text-sm text-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              Sign in with your Microsoft account to access the equipment lending platform
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <Button
                variant="gradient"
                className="w-full gap-3 h-12 text-base font-medium rounded-xl"
                onClick={() => signInWithMicrosoft?.()}
              >
                <MicrosoftIcon />
                Sign in with Microsoft
              </Button>
            </motion.div>

            <motion.p
              className="text-center text-xs text-muted-foreground/60 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              Works with existing and new Microsoft accounts
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
