import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useAppSettings } from '@/hooks/use-settings'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'

export function LoginPage() {
  const { user, signInWithMicrosoft } = useAuth()
  const { data: settings } = useAppSettings()
  const appName = settings?.app_name || 'VO Gear Hub'
  const logoUrl = settings?.logo_url

  if (user) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-12 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2 text-primary">
                <Package className="h-10 w-10" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-display">{appName}</CardTitle>
          <CardDescription className="text-base mt-1">
            Book. Borrow. Return.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2 pb-8 space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Log in to access the equipment lending platform
          </p>
          <Button
            className="w-full gap-2 h-11 text-base"
            onClick={() => signInWithMicrosoft?.()}
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Sign in with Microsoft
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
