import { useState, useEffect, useRef } from 'react'
import { useAppSettings, useUpdateAppSettings } from '@/hooks/use-settings'
import { uploadLogo } from '@/lib/api/settings'
import { Palette, Upload, X, Save, Image, Mail, Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

export function AdminDesignPage() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSettings = useUpdateAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  const [appName, setAppName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#f97316')
  const [accentColor, setAccentColor] = useState('#06b6d4')
  const [logoUrl, setLogoUrl] = useState('')
  const [emailTagline, setEmailTagline] = useState('')
  const [emailLogoHeight, setEmailLogoHeight] = useState('')
  const [themeMode, setThemeMode] = useState('dark')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name || 'VO Gear Hub')
      setPrimaryColor(settings.primary_color || '#f97316')
      setAccentColor(settings.accent_color || '#06b6d4')
      setLogoUrl(settings.logo_url || '')
      setEmailTagline(settings.email_tagline || '')
      setEmailLogoHeight(settings.email_logo_height ? String(settings.email_logo_height) : '')
      setThemeMode(settings.theme_mode || 'dark')
    }
  }, [settings])

  // Live-preview: apply theme mode as user toggles
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
  }, [themeMode])

  // Live-preview: apply colors as user picks them
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', primaryColor)
    root.style.setProperty('--color-ring', primaryColor)
  }, [primaryColor])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accentColor)
  }, [accentColor])

  const handleLogoUpload = async (file) => {
    if (!file) return
    if (!['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('Please upload a PNG, SVG, JPEG or WebP image', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', 'error')
      return
    }

    setUploading(true)
    try {
      const url = await uploadLogo(file)
      setLogoUrl(url)
      showToast('Logo uploaded')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleLogoUpload(file)
  }

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        app_name: appName,
        primary_color: primaryColor,
        accent_color: accentColor,
        logo_url: logoUrl || null,
        email_tagline: emailTagline || null,
        email_logo_height: emailLogoHeight ? parseInt(emailLogoHeight, 10) : null,
        theme_mode: themeMode,
      })
      showToast('Design settings saved')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const hasChanges = settings && (
    appName !== (settings.app_name || '') ||
    primaryColor !== (settings.primary_color || '') ||
    accentColor !== (settings.accent_color || '') ||
    logoUrl !== (settings.logo_url || '') ||
    emailTagline !== (settings.email_tagline || '') ||
    emailLogoHeight !== (settings.email_logo_height ? String(settings.email_logo_height) : '') ||
    themeMode !== (settings.theme_mode || 'dark')
  )

  if (isLoading) return <PageLoading />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Design & Branding</h1>
          <p className="text-muted-foreground mt-1">Customize the look and feel of your platform</p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* ── Theme Mode Toggle ────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="h-4 w-4" /> Theme Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {/* Dark mode card */}
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
              <span className={cn(
                'text-sm font-semibold',
                themeMode === 'dark' ? 'text-primary' : 'text-muted-foreground'
              )}>
                Dark
              </span>
              {/* Mini preview */}
              <div className="w-full rounded-lg overflow-hidden border border-border/50">
                <div className="h-3 bg-[#0f1419]" />
                <div className="flex gap-0.5 p-1 bg-[#1e2a3a]">
                  <div className="h-2 flex-1 rounded-sm bg-[#334155]" />
                  <div className="h-2 w-6 rounded-sm" style={{ backgroundColor: primaryColor }} />
                </div>
                <div className="p-1 bg-[#0f1419] space-y-0.5">
                  <div className="h-1.5 w-3/4 rounded-sm bg-[#242f3d]" />
                  <div className="h-1.5 w-1/2 rounded-sm bg-[#242f3d]" />
                </div>
              </div>
            </button>

            {/* Light mode card */}
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
              <span className={cn(
                'text-sm font-semibold',
                themeMode === 'light' ? 'text-primary' : 'text-muted-foreground'
              )}>
                Light
              </span>
              {/* Mini preview */}
              <div className="w-full rounded-lg overflow-hidden border border-border/50">
                <div className="h-3 bg-[#f8fafc]" />
                <div className="flex gap-0.5 p-1 bg-[#ffffff]">
                  <div className="h-2 flex-1 rounded-sm bg-[#e2e8f0]" />
                  <div className="h-2 w-6 rounded-sm" style={{ backgroundColor: primaryColor }} />
                </div>
                <div className="p-1 bg-[#f8fafc] space-y-0.5">
                  <div className="h-1.5 w-3/4 rounded-sm bg-[#e2e8f0]" />
                  <div className="h-1.5 w-1/2 rounded-sm bg-[#e2e8f0]" />
                </div>
              </div>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Switch between dark and light mode. This applies to all users.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" /> Logo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoUrl ? (
              <div className="relative inline-block">
                <div className="h-20 w-auto max-w-[200px] bg-muted rounded-lg p-2 flex items-center justify-center">
                  <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                  onClick={() => setLogoUrl('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, SVG, JPEG or WebP, max 2MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              onChange={(e) => handleLogoUpload(e.target.files[0])}
            />
          </CardContent>
        </Card>

        {/* App Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> General
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
          </CardContent>
        </Card>

        {/* Email Branding */}
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

        {/* Colors */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Colors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-28 font-mono text-sm"
                    maxLength={7}
                  />
                  <div className="flex-1 flex gap-2">
                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: primaryColor }} />
                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: primaryColor, opacity: 0.6 }} />
                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: primaryColor, opacity: 0.3 }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Used for buttons, links, and main accents</p>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-14 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-28 font-mono text-sm"
                    maxLength={7}
                  />
                  <div className="flex-1 flex gap-2">
                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: accentColor }} />
                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: accentColor, opacity: 0.6 }} />
                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: accentColor, opacity: 0.3 }} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Used for secondary highlights and badges</p>
              </div>
            </div>

            {/* Live Preview */}
            <div className="mt-6 p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground mb-3">Preview</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button style={{ backgroundColor: primaryColor, color: '#fff' }}>Primary Button</Button>
                <Button variant="outline" style={{ borderColor: primaryColor, color: primaryColor }}>Outline</Button>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Accent Badge
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Primary Badge
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
