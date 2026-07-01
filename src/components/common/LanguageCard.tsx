import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { updateProfile } from '@/lib/api/profiles'
import { cn } from '@/lib/utils'

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

/**
 * Language switcher. Flips i18next immediately (persisted to
 * localStorage by the detector) and best-effort saves the choice to
 * the user's profile so it follows them across devices.
 */
export function LanguageCard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const current = i18n.language?.startsWith('en') ? 'en' : 'fr'

  const pick = (code: string) => {
    i18n.changeLanguage(code)
    if (user?.id) {
      updateProfile(user.id, { language: code } as any).catch(() => { /* silent */ })
    }
  }

  return (
    <Card>
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Languages className="h-4 w-4" /> {t('profile.language')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="flex gap-2">
          {LANGS.map((l: any) => (
            <Button
              key={l.code}
              variant={current === l.code ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => pick(l.code)}
              className={cn('gap-2', current === l.code && 'ring-1 ring-primary/30')}
            >
              <span>{l.flag}</span> {l.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
