import { useEffect, useCallback, useSyncExternalStore } from 'react'
import { useAppSettings } from './use-settings'

const THEME_OVERRIDE_KEY = 'vo-theme-override'

/**
 * Subscribe to localStorage changes for the theme override.
 * This lets us share theme toggle state across components reactively.
 */
const themeOverrideStore = {
  get: () => {
    try { return localStorage.getItem(THEME_OVERRIDE_KEY) } catch { return null }
  },
  set: (value) => {
    try {
      if (value) localStorage.setItem(THEME_OVERRIDE_KEY, value)
      else localStorage.removeItem(THEME_OVERRIDE_KEY)
    } catch { /* noop */ }
    window.dispatchEvent(new Event('theme-override-change'))
  },
  subscribe: (cb) => {
    window.addEventListener('theme-override-change', cb)
    window.addEventListener('storage', cb)
    return () => {
      window.removeEventListener('theme-override-change', cb)
      window.removeEventListener('storage', cb)
    }
  },
}

/**
 * Returns the active theme mode — user override first, then DB setting, then 'dark'.
 */
export function useThemeMode() {
  const { data: settings } = useAppSettings()
  const override = useSyncExternalStore(
    themeOverrideStore.subscribe,
    themeOverrideStore.get,
  )
  const dbMode = settings?.theme_mode || 'dark'
  return override || dbMode
}

/**
 * Toggle between dark ↔ light locally (localStorage).
 */
export function useToggleTheme() {
  const mode = useThemeMode()
  return useCallback(() => {
    themeOverrideStore.set(mode === 'dark' ? 'light' : 'dark')
  }, [mode])
}

/**
 * Clear user override, revert to admin-set default.
 */
export function useClearThemeOverride() {
  return useCallback(() => themeOverrideStore.set(null), [])
}

// ── CSS property mapping ──────────────────────────────────

const DARK_DEFAULTS = {
  background: '#0f1419',
  foreground: '#f1f5f9',
  card: '#1e2a3a',
  popover: '#1a2332',
  secondary: '#1a2332',
  muted: '#242f3d',
  muted_fg: '#94a3b8',
  border: '#334155',
}

const LIGHT_DEFAULTS = {
  background: '#f8fafc',
  foreground: '#0f172a',
  card: '#ffffff',
  popover: '#ffffff',
  secondary: '#f1f5f9',
  muted: '#f1f5f9',
  muted_fg: '#64748b',
  border: '#e2e8f0',
}

function applyModeColors(root, settings, mode) {
  const prefix = mode === 'dark' ? 'dark_' : 'light_'
  const defaults = mode === 'dark' ? DARK_DEFAULTS : LIGHT_DEFAULTS

  const get = (key) => settings?.[prefix + key] || defaults[key]

  const bg = get('background')
  const fg = get('foreground')
  const card = get('card')
  const popover = get('popover')
  const secondary = get('secondary')
  const muted = get('muted')
  const mutedFg = get('muted_fg')
  const border = get('border')

  root.style.setProperty('--color-background', bg)
  root.style.setProperty('--color-foreground', fg)
  root.style.setProperty('--color-card', card)
  root.style.setProperty('--color-card-foreground', fg)
  root.style.setProperty('--color-popover', popover)
  root.style.setProperty('--color-popover-foreground', fg)
  root.style.setProperty('--color-secondary', secondary)
  root.style.setProperty('--color-secondary-foreground', fg)
  root.style.setProperty('--color-muted', muted)
  root.style.setProperty('--color-muted-foreground', mutedFg)
  root.style.setProperty('--color-border', border)
  root.style.setProperty('--color-input', border)
}

/**
 * Main theme hook. Call once in AppLayout.
 * Applies data-theme, data-radius, and all CSS custom properties.
 */
export function useTheme() {
  const { data: settings } = useAppSettings()
  const mode = useThemeMode()

  useEffect(() => {
    if (!settings) return
    const root = document.documentElement

    // 1. Theme mode
    root.setAttribute('data-theme', mode)

    // 2. Mode-specific palette
    applyModeColors(root, settings, mode)

    // 3. Shared colors
    if (settings.primary_color) {
      root.style.setProperty('--color-primary', settings.primary_color)
      root.style.setProperty('--color-ring', settings.primary_color)
    }
    if (settings.accent_color) {
      root.style.setProperty('--color-accent', settings.accent_color)
    }
    if (settings.success_color) {
      root.style.setProperty('--color-success', settings.success_color)
    }
    if (settings.warning_color) {
      root.style.setProperty('--color-warning', settings.warning_color)
    }
    if (settings.destructive_color) {
      root.style.setProperty('--color-destructive', settings.destructive_color)
    }

    // 4. Border radius
    root.setAttribute('data-radius', settings.border_radius || 'md')
  }, [settings, mode])

  return settings
}
