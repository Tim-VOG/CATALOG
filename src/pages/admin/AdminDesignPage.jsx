import { useState, useEffect, useRef } from 'react'
import { useAppSettings, useUpdateAppSettings } from '@/hooks/use-settings'
import { uploadLogo } from '@/lib/api/settings'
import { Palette, Upload, X, Save, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoading } from '@/components/common/LoadingSpinner'
import { useUIStore } from '@/stores/ui-store'

export function AdminDesignPage() {
  const { data: settings, isLoading } = useAppSettings()
  const updateSettings = useUpdateAppSettings()
  const showToast = useUIStore((s) => s.showToast)

  const [appName, setAppName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#f97316')
  const [accentColor, setAccentColor] = useState('#06b6d4')
  const [logoUrl, setLogoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name || 'EquipLend')
      setPrimaryColor(settings.primary_color || '#f97316')
      setAccentColor(settings.accent_color || '#06b6d4')
      setLogoUrl(settings.logo_url || '')
    }
  }, [settings])

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
    logoUrl !== (settings.logo_url || '')
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
                placeholder="EquipLend"
              />
              <p className="text-xs text-muted-foreground">Displayed in the header and browser title</p>
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
              <div className="flex items-center gap-3">
                <Button style={{ backgroundColor: primaryColor, color: '#fff' }}>Primary Button</Button>
                <Button variant="outline" style={{ borderColor: primaryColor, color: primaryColor }}>Outline</Button>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Accent Badge
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
