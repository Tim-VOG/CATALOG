import { useEffect } from 'react'
import { useAppSettings } from './use-settings'

/**
 * Applies dynamic theme from app_settings:
 *  - data-theme attribute ("dark" | "light") on <html>
 *  - --color-primary / --color-accent CSS custom properties
 *
 * Call once in the root layout to make the theme reactive.
 */
export function useTheme() {
  const { data: settings } = useAppSettings()

  useEffect(() => {
    if (!settings) return
    const root = document.documentElement

    // Apply theme mode (dark / light)
    const mode = settings.theme_mode || 'dark'
    root.setAttribute('data-theme', mode)

    // Apply dynamic colors
    if (settings.primary_color) {
      root.style.setProperty('--color-primary', settings.primary_color)
      root.style.setProperty('--color-ring', settings.primary_color)
    }
    if (settings.accent_color) {
      root.style.setProperty('--color-accent', settings.accent_color)
    }
  }, [settings?.primary_color, settings?.accent_color, settings?.theme_mode])

  return settings
}
