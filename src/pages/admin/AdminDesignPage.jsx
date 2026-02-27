import { useState, useEffect, useRef } from 'react'
import { useAppSettings, useUpdateAppSettings } from '@/hooks/use-settings'
import { uploadLogo } from '@/lib/api/settings'
import {
  Palette, Upload, X, Save, Image, Mail, Sun, Moon, Monitor,
  Circle, Square, RectangleHorizontal, Radius, Type, RotateCcw,
  Home, PenLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/stores/ui-store'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { cn } from '@/lib/utils'

// ── Defaults ──────────────────────────────────────────────

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

const SHARED_DEFAULTS = {
  primary_color: '#f97316',
  accent_color: '#06b6d4',
  success_color: '#10b981',
  warning_color: '#f59e0b',
  destructive_color: '#ef4444',
}

const PALETTE_LABELS = {
  background: { label: 'Background', desc: 'Main page background' },
  foreground: { label: 'Text', desc: 'Primary text color' },
  card: { label: 'Card / Surface', desc: 'Cards, panels, header' },
  popover: { label: 'Popover', desc: 'Dropdowns, tooltips, modals' },
  secondary: { label: 'Secondary', desc: 'Secondary backgrounds' },
  muted: { label: 'Muted', desc: 'Subtle backgrounds (tags, disabled)' },
  muted_fg: { label: 'Muted Text', desc: 'Secondary text, descriptions' },
  border: { label: 'Border', desc: 'Borders, dividers, inputs' },
}

const RADIUS_OPTIONS = [
  { value: 'sm', label: 'Small', preview: '4px' },
  { value: 'md', label: 'Medium', preview: '10px' },
  { value: 'lg', label: 'Large', preview: '14px' },
  { value: 'xl', label: 'X-Large', preview: '18px' },
  { value: 'full', label: 'Full', preview: '9999px' },
]

// ── Color picker row ──────────────────────────────────────

function ColorRow({ label, desc, value, onChange, defaultValue }) {
  const isDefault = !value || value === defaultValue
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value || defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-11 rounded border border-border cursor-pointer bg-transparent shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {isDefault && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">default</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <Input
        value={value || defaultValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 font-mono text-xs"
        maxLength={7}
      />
      {!isDefault && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onChange('')}
          title="Reset to default"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────

export function AdminDesignPage() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSettings = useUpdateAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  // General
  const [appName, setAppName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUrlDark, setLogoUrlDark] = useState('')
  const [logoUrlLight, setLogoUrlLight] = useState('')
  const [headerTagline, setHeaderTagline] = useState('')
  const [emailTagline, setEmailTagline] = useState('')
  const [emailLogoHeight, setEmailLogoHeight] = useState('')

  // Theme mode
  const [themeMode, setThemeMode] = useState('dark')

  // Shared colors
  const [primaryColor, setPrimaryColor] = useState('')
  const [accentColor, setAccentColor] = useState('')
  const [successColor, setSuccessColor] = useState('')
  const [warningColor, setWarningColor] = useState('')
  const [destructiveColor, setDestructiveColor] = useState('')

  // Dark mode palette
  const [darkPalette, setDarkPalette] = useState({ ...DARK_DEFAULTS })

  // Light mode palette
  const [lightPalette, setLightPalette] = useState({ ...LIGHT_DEFAULTS })

  // Border radius
  const [borderRadius, setBorderRadius] = useState('md')

  // File upload
  const [uploading, setUploading] = useState(false)
  const [uploadingDark, setUploadingDark] = useState(false)
  const [uploadingLight, setUploadingLight] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dragOverDark, setDragOverDark] = useState(false)
  const [dragOverLight, setDragOverLight] = useState(false)
  const fileInputRef = useRef(null)
  const darkFileInputRef = useRef(null)
  const lightFileInputRef = useRef(null)

  // Active palette tab in the editor
  const [activePaletteTab, setActivePaletteTab] = useState('dark')

  // Hub page content
  const [hubMainTitle, setHubMainTitle] = useState('')
  const [hubTagline, setHubTagline] = useState('')
  const [hubCatalogTitle, setHubCatalogTitle] = useState('')
  const [hubCatalogDescription, setHubCatalogDescription] = useState('')
  const [hubOnboardingTitle, setHubOnboardingTitle] = useState('')
  const [hubOnboardingDescription, setHubOnboardingDescription] = useState('')
  const [hubMailboxTitle, setHubMailboxTitle] = useState('')
  const [hubMailboxDescription, setHubMailboxDescription] = useState('')
  const [hubItRequestTitle, setHubItRequestTitle] = useState('')
  const [hubItRequestDescription, setHubItRequestDescription] = useState('')

  // ── Hydrate from settings ───────────────────

  useEffect(() => {
    if (!settings) return
    setAppName(settings.app_name || 'VO Gear Hub')
    setLogoUrl(settings.logo_url || '')
    setLogoUrlDark(settings.logo_url_dark || '')
    setLogoUrlLight(settings.logo_url_light || '')
    setHeaderTagline(settings.header_tagline ?? 'Book. Borrow. Return.')
    setEmailTagline(settings.email_tagline || '')
    setEmailLogoHeight(settings.email_logo_height ? String(settings.email_logo_height) : '')
    setThemeMode(settings.theme_mode || 'dark')
    setPrimaryColor(settings.primary_color || '')
    setAccentColor(settings.accent_color || '')
    setSuccessColor(settings.success_color || '')
    setWarningColor(settings.warning_color || '')
    setDestructiveColor(settings.destructive_color || '')
    setBorderRadius(settings.border_radius || 'md')

    // Dark palette
    setDarkPalette({
      background: settings.dark_background || '',
      foreground: settings.dark_foreground || '',
      card: settings.dark_card || '',
      popover: settings.dark_popover || '',
      secondary: settings.dark_secondary || '',
      muted: settings.dark_muted || '',
      muted_fg: settings.dark_muted_fg || '',
      border: settings.dark_border || '',
    })

    // Light palette
    setLightPalette({
      background: settings.light_background || '',
      foreground: settings.light_foreground || '',
      card: settings.light_card || '',
      popover: settings.light_popover || '',
      secondary: settings.light_secondary || '',
      muted: settings.light_muted || '',
      muted_fg: settings.light_muted_fg || '',
      border: settings.light_border || '',
    })

    // Hub page content
    setHubMainTitle(settings.hub_main_title || '')
    setHubTagline(settings.hub_tagline || '')
    setHubCatalogTitle(settings.hub_catalog_title || '')
    setHubCatalogDescription(settings.hub_catalog_description || '')
    setHubOnboardingTitle(settings.hub_onboarding_title || '')
    setHubOnboardingDescription(settings.hub_onboarding_description || '')
    setHubMailboxTitle(settings.hub_mailbox_title || '')
    setHubMailboxDescription(settings.hub_mailbox_description || '')
    setHubItRequestTitle(settings.hub_it_request_title || '')
    setHubItRequestDescription(settings.hub_it_request_description || '')
  }, [settings])

  // ── Live preview: apply theme as admin edits ─────

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.setAttribute('data-radius', borderRadius)
  }, [borderRadius])

  useEffect(() => {
    const root = document.documentElement
    const palette = themeMode === 'dark' ? darkPalette : lightPalette
    const defaults = themeMode === 'dark' ? DARK_DEFAULTS : LIGHT_DEFAULTS

    root.style.setProperty('--color-background', palette.background || defaults.background)
    root.style.setProperty('--color-foreground', palette.foreground || defaults.foreground)
    root.style.setProperty('--color-card', palette.card || defaults.card)
    root.style.setProperty('--color-card-foreground', palette.foreground || defaults.foreground)
    root.style.setProperty('--color-popover', palette.popover || defaults.popover)
    root.style.setProperty('--color-popover-foreground', palette.foreground || defaults.foreground)
    root.style.setProperty('--color-secondary', palette.secondary || defaults.secondary)
    root.style.setProperty('--color-secondary-foreground', palette.foreground || defaults.foreground)
    root.style.setProperty('--color-muted', palette.muted || defaults.muted)
    root.style.setProperty('--color-muted-foreground', palette.muted_fg || defaults.muted_fg)
    root.style.setProperty('--color-border', palette.border || defaults.border)
    root.style.setProperty('--color-input', palette.border || defaults.border)
  }, [themeMode, darkPalette, lightPalette])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', primaryColor || SHARED_DEFAULTS.primary_color)
    root.style.setProperty('--color-ring', primaryColor || SHARED_DEFAULTS.primary_color)
  }, [primaryColor])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor || SHARED_DEFAULTS.accent_color)
  }, [accentColor])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-success', successColor || SHARED_DEFAULTS.success_color)
  }, [successColor])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-warning', warningColor || SHARED_DEFAULTS.warning_color)
  }, [warningColor])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-destructive', destructiveColor || SHARED_DEFAULTS.destructive_color)
  }, [destructiveColor])

  // ── Handlers ────────────────────────────────

  const handleLogoUpload = async (file, variant = '') => {
    if (!file) return
    if (!['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('Please upload a PNG, SVG, JPEG or WebP image', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', 'error')
      return
    }
    const setLoading = variant === 'dark' ? setUploadingDark : variant === 'light' ? setUploadingLight : setUploading
    setLoading(true)
    try {
      const url = await uploadLogo(file, variant)
      if (variant === 'dark') setLogoUrlDark(url)
      else if (variant === 'light') setLogoUrlLight(url)
      else setLogoUrl(url)
      showToast(`${variant ? variant.charAt(0).toUpperCase() + variant.slice(1) + ' mode l' : 'L'}ogo uploaded`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e, variant = '') => {
    e.preventDefault()
    if (variant === 'dark') setDragOverDark(false)
    else if (variant === 'light') setDragOverLight(false)
    else setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleLogoUpload(file, variant)
  }

  const updateDarkPalette = (key, value) => setDarkPalette((p) => ({ ...p, [key]: value }))
  const updateLightPalette = (key, value) => setLightPalette((p) => ({ ...p, [key]: value }))

  const resetDarkPalette = () => setDarkPalette(Object.fromEntries(Object.keys(DARK_DEFAULTS).map(k => [k, ''])))
  const resetLightPalette = () => setLightPalette(Object.fromEntries(Object.keys(LIGHT_DEFAULTS).map(k => [k, ''])))

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        app_name: appName,
        logo_url: logoUrl || null,
        logo_url_dark: logoUrlDark || null,
        logo_url_light: logoUrlLight || null,
        header_tagline: headerTagline || null,
        email_tagline: emailTagline || null,
        email_logo_height: emailLogoHeight ? parseInt(emailLogoHeight, 10) : null,
        theme_mode: themeMode,
        primary_color: primaryColor || null,
        accent_color: accentColor || null,
        success_color: successColor || null,
        warning_color: warningColor || null,
        destructive_color: destructiveColor || null,
        border_radius: borderRadius,
        // Dark palette
        dark_background: darkPalette.background || null,
        dark_foreground: darkPalette.foreground || null,
        dark_card: darkPalette.card || null,
        dark_popover: darkPalette.popover || null,
        dark_secondary: darkPalette.secondary || null,
        dark_muted: darkPalette.muted || null,
        dark_muted_fg: darkPalette.muted_fg || null,
        dark_border: darkPalette.border || null,
        // Light palette
        light_background: lightPalette.background || null,
        light_foreground: lightPalette.foreground || null,
        light_card: lightPalette.card || null,
        light_popover: lightPalette.popover || null,
        light_secondary: lightPalette.secondary || null,
        light_muted: lightPalette.muted || null,
        light_muted_fg: lightPalette.muted_fg || null,
        light_border: lightPalette.border || null,
        // Hub page content
        hub_main_title: hubMainTitle || null,
        hub_tagline: hubTagline || null,
        hub_catalog_title: hubCatalogTitle || null,
        hub_catalog_description: hubCatalogDescription || null,
        hub_onboarding_title: hubOnboardingTitle || null,
        hub_onboarding_description: hubOnboardingDescription || null,
        hub_mailbox_title: hubMailboxTitle || null,
        hub_mailbox_description: hubMailboxDescription || null,
        hub_it_request_title: hubItRequestTitle || null,
        hub_it_request_description: hubItRequestDescription || null,
      })
      showToast('Design settings saved')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // ── Change detection ────────────────────────

  const str = (v) => v || ''
  const hasChanges = settings && (
    appName !== (settings.app_name || '') ||
    logoUrl !== (settings.logo_url || '') ||
    logoUrlDark !== (settings.logo_url_dark || '') ||
    logoUrlLight !== (settings.logo_url_light || '') ||
    headerTagline !== (settings.header_tagline ?? 'Book. Borrow. Return.') ||
    emailTagline !== (settings.email_tagline || '') ||
    emailLogoHeight !== (settings.email_logo_height ? String(settings.email_logo_height) : '') ||
    themeMode !== (settings.theme_mode || 'dark') ||
    primaryColor !== (settings.primary_color || '') ||
    accentColor !== (settings.accent_color || '') ||
    successColor !== (settings.success_color || '') ||
    warningColor !== (settings.warning_color || '') ||
    destructiveColor !== (settings.destructive_color || '') ||
    borderRadius !== (settings.border_radius || 'md') ||
    // Dark palette
    str(darkPalette.background) !== str(settings.dark_background) ||
    str(darkPalette.foreground) !== str(settings.dark_foreground) ||
    str(darkPalette.card) !== str(settings.dark_card) ||
    str(darkPalette.popover) !== str(settings.dark_popover) ||
    str(darkPalette.secondary) !== str(settings.dark_secondary) ||
    str(darkPalette.muted) !== str(settings.dark_muted) ||
    str(darkPalette.muted_fg) !== str(settings.dark_muted_fg) ||
    str(darkPalette.border) !== str(settings.dark_border) ||
    // Light palette
    str(lightPalette.background) !== str(settings.light_background) ||
    str(lightPalette.foreground) !== str(settings.light_foreground) ||
    str(lightPalette.card) !== str(settings.light_card) ||
    str(lightPalette.popover) !== str(settings.light_popover) ||
    str(lightPalette.secondary) !== str(settings.light_secondary) ||
    str(lightPalette.muted) !== str(settings.light_muted) ||
    str(lightPalette.muted_fg) !== str(settings.light_muted_fg) ||
    str(lightPalette.border) !== str(settings.light_border) ||
    // Hub page content
    hubMainTitle !== (settings.hub_main_title || '') ||
    hubTagline !== (settings.hub_tagline || '') ||
    hubCatalogTitle !== (settings.hub_catalog_title || '') ||
    hubCatalogDescription !== (settings.hub_catalog_description || '') ||
    hubOnboardingTitle !== (settings.hub_onboarding_title || '') ||
    hubOnboardingDescription !== (settings.hub_onboarding_description || '') ||
    hubMailboxTitle !== (settings.hub_mailbox_title || '') ||
    hubMailboxDescription !== (settings.hub_mailbox_description || '') ||
    hubItRequestTitle !== (settings.hub_it_request_title || '') ||
    hubItRequestDescription !== (settings.hub_it_request_description || '')
  )

  if (isLoading) return <PageLoading />

  const activePalette = activePaletteTab === 'dark' ? darkPalette : lightPalette
  const activeDefaults = activePaletteTab === 'dark' ? DARK_DEFAULTS : LIGHT_DEFAULTS
  const updateActivePalette = activePaletteTab === 'dark' ? updateDarkPalette : updateLightPalette

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader title="Design & Branding" description="Customize the look and feel of your platform">
        <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </AdminPageHeader>

      {/* ─── Theme Mode ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4" /> Theme Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {/* Dark card */}
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={cn(
                'relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all cursor-pointer',
                themeMode === 'dark'
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full transition-colors',
                themeMode === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                <Moon className="h-6 w-6" />
              </div>
              <span className={cn('text-sm font-semibold', themeMode === 'dark' ? 'text-primary' : 'text-muted-foreground')}>
                Dark
              </span>
              <div className="w-full rounded-lg overflow-hidden border border-border/50">
                <div className="h-3" style={{ background: darkPalette.background || DARK_DEFAULTS.background }} />
                <div className="flex gap-0.5 p-1" style={{ background: darkPalette.card || DARK_DEFAULTS.card }}>
                  <div className="h-2 flex-1 rounded-sm" style={{ background: darkPalette.border || DARK_DEFAULTS.border }} />
                  <div className="h-2 w-6 rounded-sm" style={{ background: primaryColor || SHARED_DEFAULTS.primary_color }} />
                </div>
                <div className="p-1 space-y-0.5" style={{ background: darkPalette.background || DARK_DEFAULTS.background }}>
                  <div className="h-1.5 w-3/4 rounded-sm" style={{ background: darkPalette.muted || DARK_DEFAULTS.muted }} />
                  <div className="h-1.5 w-1/2 rounded-sm" style={{ background: darkPalette.muted || DARK_DEFAULTS.muted }} />
                </div>
              </div>
            </button>

            {/* Light card */}
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={cn(
                'relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all cursor-pointer',
                themeMode === 'light'
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full transition-colors',
                themeMode === 'light' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                <Sun className="h-6 w-6" />
              </div>
              <span className={cn('text-sm font-semibold', themeMode === 'light' ? 'text-primary' : 'text-muted-foreground')}>
                Light
              </span>
              <div className="w-full rounded-lg overflow-hidden border border-border/50">
                <div className="h-3" style={{ background: lightPalette.background || LIGHT_DEFAULTS.background }} />
                <div className="flex gap-0.5 p-1" style={{ background: lightPalette.card || LIGHT_DEFAULTS.card }}>
                  <div className="h-2 flex-1 rounded-sm" style={{ background: lightPalette.border || LIGHT_DEFAULTS.border }} />
                  <div className="h-2 w-6 rounded-sm" style={{ background: primaryColor || SHARED_DEFAULTS.primary_color }} />
                </div>
                <div className="p-1 space-y-0.5" style={{ background: lightPalette.background || LIGHT_DEFAULTS.background }}>
                  <div className="h-1.5 w-3/4 rounded-sm" style={{ background: lightPalette.muted || LIGHT_DEFAULTS.muted }} />
                  <div className="h-1.5 w-1/2 rounded-sm" style={{ background: lightPalette.muted || LIGHT_DEFAULTS.muted }} />
                </div>
              </div>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Sets the default theme for all users. Users can override via the toggle in the header.
          </p>
        </CardContent>
      </Card>

      {/* ─── Mode-specific Palettes ─────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Mode Palettes
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 text-muted-foreground"
              onClick={activePaletteTab === 'dark' ? resetDarkPalette : resetLightPalette}
            >
              <RotateCcw className="h-3 w-3" />
              Reset {activePaletteTab} to defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab selector */}
          <div className="flex gap-1 mb-5 p-1 bg-muted rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setActivePaletteTab('dark')}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                activePaletteTab === 'dark'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Moon className="h-3.5 w-3.5" /> Dark Palette
            </button>
            <button
              type="button"
              onClick={() => setActivePaletteTab('light')}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                activePaletteTab === 'light'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sun className="h-3.5 w-3.5" /> Light Palette
            </button>
          </div>

          {/* Palette color rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
            {Object.entries(PALETTE_LABELS).map(([key, { label, desc }]) => (
              <ColorRow
                key={`${activePaletteTab}-${key}`}
                label={label}
                desc={desc}
                value={activePalette[key]}
                defaultValue={activeDefaults[key]}
                onChange={(v) => updateActivePalette(key, v)}
              />
            ))}
          </div>

          {/* Palette mini preview */}
          <div className="mt-5 rounded-lg border overflow-hidden">
            <div className="p-3 text-xs font-medium text-muted-foreground border-b">
              {activePaletteTab === 'dark' ? 'Dark' : 'Light'} Mode Preview
            </div>
            <div
              className="p-4 space-y-3"
              style={{
                background: (activePalette.background || activeDefaults.background),
                color: (activePalette.foreground || activeDefaults.foreground),
              }}
            >
              <div
                className="rounded-lg p-3 border"
                style={{
                  background: (activePalette.card || activeDefaults.card),
                  borderColor: (activePalette.border || activeDefaults.border),
                }}
              >
                <div className="font-semibold text-sm mb-1">Card Title</div>
                <div className="text-xs" style={{ color: (activePalette.muted_fg || activeDefaults.muted_fg) }}>
                  This is how muted text appears in cards.
                </div>
              </div>
              <div className="flex gap-2">
                <div
                  className="rounded px-3 py-1.5 text-xs font-medium text-white"
                  style={{ background: primaryColor || SHARED_DEFAULTS.primary_color }}
                >
                  Primary Button
                </div>
                <div
                  className="rounded px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: (activePalette.secondary || activeDefaults.secondary),
                    color: (activePalette.foreground || activeDefaults.foreground),
                  }}
                >
                  Secondary
                </div>
                <div
                  className="rounded px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: (activePalette.muted || activeDefaults.muted),
                    color: (activePalette.muted_fg || activeDefaults.muted_fg),
                  }}
                >
                  Muted
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Shared Colors ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" /> Shared Colors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">These colors apply in both dark and light mode.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
            <ColorRow
              label="Primary"
              desc="Buttons, links, and main accents"
              value={primaryColor}
              defaultValue={SHARED_DEFAULTS.primary_color}
              onChange={setPrimaryColor}
            />
            <ColorRow
              label="Accent"
              desc="Secondary highlights and badges"
              value={accentColor}
              defaultValue={SHARED_DEFAULTS.accent_color}
              onChange={setAccentColor}
            />
            <ColorRow
              label="Success"
              desc="Success states, confirmations"
              value={successColor}
              defaultValue={SHARED_DEFAULTS.success_color}
              onChange={setSuccessColor}
            />
            <ColorRow
              label="Warning"
              desc="Warnings and cautions"
              value={warningColor}
              defaultValue={SHARED_DEFAULTS.warning_color}
              onChange={setWarningColor}
            />
            <ColorRow
              label="Destructive"
              desc="Errors, deletions, danger"
              value={destructiveColor}
              defaultValue={SHARED_DEFAULTS.destructive_color}
              onChange={setDestructiveColor}
            />
          </div>

          {/* Color preview strip */}
          <div className="mt-5 flex gap-2">
            {[
              { label: 'Primary', color: primaryColor || SHARED_DEFAULTS.primary_color },
              { label: 'Accent', color: accentColor || SHARED_DEFAULTS.accent_color },
              { label: 'Success', color: successColor || SHARED_DEFAULTS.success_color },
              { label: 'Warning', color: warningColor || SHARED_DEFAULTS.warning_color },
              { label: 'Destructive', color: destructiveColor || SHARED_DEFAULTS.destructive_color },
            ].map(({ label, color }) => (
              <div key={label} className="flex-1 text-center">
                <div className="h-8 rounded-md mb-1" style={{ background: color }} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── Border Radius ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radius className="h-4 w-4" /> Border Radius
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            {RADIUS_OPTIONS.map(({ value, label, preview }) => (
              <button
                key={value}
                type="button"
                onClick={() => setBorderRadius(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all cursor-pointer min-w-[80px]',
                  borderRadius === value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <div
                  className="w-10 h-10 border-2"
                  style={{
                    borderRadius: preview,
                    borderColor: borderRadius === value
                      ? (primaryColor || SHARED_DEFAULTS.primary_color)
                      : 'var(--color-border)',
                    background: borderRadius === value
                      ? `${primaryColor || SHARED_DEFAULTS.primary_color}20`
                      : 'var(--color-muted)',
                  }}
                />
                <span className={cn(
                  'text-xs font-medium',
                  borderRadius === value ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Controls the roundness of buttons, cards, inputs, and other elements.
          </p>
        </CardContent>
      </Card>

      {/* ─── Logos ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" /> Logos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Upload a specific logo for each theme mode. If only one is set, it will be used for both modes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dark mode logo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Moon className="h-4 w-4 text-muted-foreground" />
                Dark Mode Logo
              </div>
              {logoUrlDark ? (
                <div className="relative inline-block">
                  <div className="h-20 w-auto max-w-[200px] bg-[#0f1419] rounded-lg p-3 flex items-center justify-center">
                    <img src={logoUrlDark} alt="Dark logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => setLogoUrlDark('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    dragOverDark ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  )}
                  onDrop={(e) => handleDrop(e, 'dark')}
                  onDragOver={(e) => { e.preventDefault(); setDragOverDark(true) }}
                  onDragLeave={() => setDragOverDark(false)}
                  onClick={() => darkFileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {uploadingDark ? 'Uploading...' : 'Drop or click to upload'}
                  </p>
                </div>
              )}
              <input
                ref={darkFileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                onChange={(e) => handleLogoUpload(e.target.files[0], 'dark')}
              />
            </div>

            {/* Light mode logo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sun className="h-4 w-4 text-muted-foreground" />
                Light Mode Logo
              </div>
              {logoUrlLight ? (
                <div className="relative inline-block">
                  <div className="h-20 w-auto max-w-[200px] bg-[#f8fafc] rounded-lg p-3 flex items-center justify-center">
                    <img src={logoUrlLight} alt="Light logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => setLogoUrlLight('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    dragOverLight ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  )}
                  onDrop={(e) => handleDrop(e, 'light')}
                  onDragOver={(e) => { e.preventDefault(); setDragOverLight(true) }}
                  onDragLeave={() => setDragOverLight(false)}
                  onClick={() => lightFileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {uploadingLight ? 'Uploading...' : 'Drop or click to upload'}
                  </p>
                </div>
              )}
              <input
                ref={lightFileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                onChange={(e) => handleLogoUpload(e.target.files[0], 'light')}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">PNG, SVG, JPEG or WebP, max 2MB per file</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── General ──────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="h-4 w-4" /> General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Application Name</Label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="VO Gear Hub"
              />
              <p className="text-xs text-muted-foreground">Displayed in the header and browser title</p>
            </div>
            <div className="space-y-1">
              <Label>Header Tagline</Label>
              <Input
                value={headerTagline}
                onChange={(e) => setHeaderTagline(e.target.value)}
                placeholder="Book. Borrow. Return."
              />
              <p className="text-xs text-muted-foreground">Shown below the app name in the header</p>
            </div>
          </CardContent>
        </Card>

        {/* ─── Email Branding ───────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email Branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Label>Email Tagline</Label>
                <Input
                  value={emailTagline}
                  onChange={(e) => setEmailTagline(e.target.value)}
                  placeholder="Equipment Lending Platform"
                />
                <p className="text-xs text-muted-foreground">Shown below the app name in the email header</p>
              </div>
              <div className="space-y-1">
                <Label>Email Logo Height (px)</Label>
                <Input
                  type="number"
                  value={emailLogoHeight}
                  onChange={(e) => setEmailLogoHeight(e.target.value)}
                  placeholder="17"
                  min={10}
                  max={120}
                  className="w-28"
                />
                <p className="text-xs text-muted-foreground">Height of the logo in emails (width scales automatically)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Hub Page Content ─────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4" /> Hub Page Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-muted-foreground">Customize the titles and descriptions displayed on the Hub landing page.</p>

          {/* Main title + tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Hub Title</Label>
              <Input
                value={hubMainTitle}
                onChange={(e) => setHubMainTitle(e.target.value)}
                placeholder="VO Gear Hub"
              />
            </div>
            <div className="space-y-1">
              <Label>Hub Tagline</Label>
              <Input
                value={hubTagline}
                onChange={(e) => setHubTagline(e.target.value)}
                placeholder="Welcome — choose your destination"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-1.5">
              <PenLine className="h-3 w-3" /> Section Cards
            </p>

            <div className="space-y-4">
              {/* Catalog */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" /> Equipment Catalog
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={hubCatalogTitle} onChange={(e) => setHubCatalogTitle(e.target.value)} placeholder="Equipment Catalog" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={hubCatalogDescription} onChange={(e) => setHubCatalogDescription(e.target.value)} placeholder="Browse and reserve equipment..." />
                  </div>
                </div>
              </div>

              {/* Onboarding */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-500" /> Onboarding Hub
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={hubOnboardingTitle} onChange={(e) => setHubOnboardingTitle(e.target.value)} placeholder="Onboarding Hub" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={hubOnboardingDescription} onChange={(e) => setHubOnboardingDescription(e.target.value)} placeholder="Compose and send welcome emails..." />
                  </div>
                </div>
              </div>

              {/* Functional Mailbox */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-violet-500" /> Functional Mailbox
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={hubMailboxTitle} onChange={(e) => setHubMailboxTitle(e.target.value)} placeholder="Functional Mailbox" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={hubMailboxDescription} onChange={(e) => setHubMailboxDescription(e.target.value)} placeholder="Request a new functional mailbox..." />
                  </div>
                </div>
              </div>

              {/* IT Request */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" /> IT Onboarding Request
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={hubItRequestTitle} onChange={(e) => setHubItRequestTitle(e.target.value)} placeholder="IT Onboarding Request" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={hubItRequestDescription} onChange={(e) => setHubItRequestDescription(e.target.value)} placeholder="Submit an IT onboarding request..." />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Full Live Preview ──────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4" /> Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            {/* Simulated header */}
            <div
              className="flex items-center gap-3 px-4 py-2.5 border-b"
              style={{
                background: `${activePaletteTab === themeMode
                  ? (activePalette.card || activeDefaults.card)
                  : (themeMode === 'dark' ? (darkPalette.card || DARK_DEFAULTS.card) : (lightPalette.card || LIGHT_DEFAULTS.card))
                }`,
                borderColor: activePaletteTab === themeMode
                  ? (activePalette.border || activeDefaults.border)
                  : 'var(--color-border)',
              }}
            >
              <div
                className="w-5 h-5 rounded"
                style={{ background: primaryColor || SHARED_DEFAULTS.primary_color }}
              />
              <span className="text-sm font-bold" style={{ color: primaryColor || SHARED_DEFAULTS.primary_color }}>
                {appName || 'VO Gear Hub'}
              </span>
              <div className="ml-auto flex gap-1.5">
                <div className="w-12 h-5 rounded text-[9px] font-medium flex items-center justify-center"
                  style={{
                    background: `${primaryColor || SHARED_DEFAULTS.primary_color}20`,
                    color: primaryColor || SHARED_DEFAULTS.primary_color,
                  }}
                >
                  Catalog
                </div>
                <div className="w-4 h-4 rounded-full" style={{ background: activePalette.muted || activeDefaults.muted }} />
              </div>
            </div>

            {/* Simulated content */}
            <div
              className="p-4 space-y-3"
              style={{
                background: activePalette.background || activeDefaults.background,
                color: activePalette.foreground || activeDefaults.foreground,
              }}
            >
              <div className="text-base font-bold">Equipment Catalog</div>
              <div className="text-xs" style={{ color: activePalette.muted_fg || activeDefaults.muted_fg }}>
                Browse and reserve equipment for your projects
              </div>

              {/* Cards row */}
              <div className="grid grid-cols-3 gap-2">
                {['Laptop Pro', 'Camera Kit', 'Monitor 27"'].map((name, i) => (
                  <div
                    key={name}
                    className="rounded-lg border p-2 space-y-1.5"
                    style={{
                      background: activePalette.card || activeDefaults.card,
                      borderColor: activePalette.border || activeDefaults.border,
                    }}
                  >
                    <div
                      className="h-10 rounded"
                      style={{ background: activePalette.muted || activeDefaults.muted }}
                    />
                    <div className="text-xs font-semibold">{name}</div>
                    <div className="text-[10px]" style={{ color: activePalette.muted_fg || activeDefaults.muted_fg }}>
                      {i === 0 ? '3 available' : i === 1 ? '1 available' : '0 available'}
                    </div>
                    <div className="flex gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded text-white"
                        style={{ background: accentColor || SHARED_DEFAULTS.accent_color }}>
                        {i === 0 ? 'IT' : i === 1 ? 'Video' : 'Display'}
                      </span>
                      <div className="ml-auto">
                        <div
                          className="text-[9px] px-1.5 py-0.5 rounded text-white font-medium"
                          style={{ background: i === 2
                            ? (destructiveColor || SHARED_DEFAULTS.destructive_color)
                            : (primaryColor || SHARED_DEFAULTS.primary_color)
                          }}
                        >
                          {i === 2 ? 'Unavailable' : 'Add'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status badges */}
              <div className="flex gap-2 pt-2">
                <span className="text-[9px] px-2 py-0.5 rounded-full text-white"
                  style={{ background: successColor || SHARED_DEFAULTS.success_color }}>
                  Returned
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full text-white"
                  style={{ background: warningColor || SHARED_DEFAULTS.warning_color }}>
                  Pending
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full text-white"
                  style={{ background: destructiveColor || SHARED_DEFAULTS.destructive_color }}>
                  Overdue
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full text-white"
                  style={{ background: primaryColor || SHARED_DEFAULTS.primary_color }}>
                  Active
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
