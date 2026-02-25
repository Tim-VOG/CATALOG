import { useEffect } from 'react'
import { useAppSettings } from './use-settings'

/**
 * Applies dynamic theme colors from app_settings to CSS custom properties.
 * Call once in the root layout to make the theme reactive.
 */
export function useTheme() {
  const { data: settings } = useAppSettings()

  useEffect(() => {
    if (!settings) return
    const root = document.documentElement

    if (settings.primary_color) {
      root.style.setProperty('--color-primary-dynamic', settings.primary_color)
    }
    if (settings.accent_color) {
      root.style.setProperty('--color-accent-dynamic', settings.accent_color)
    }
  }, [settings?.primary_color, settings?.accent_color])

  return settings
}
