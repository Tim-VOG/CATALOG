import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, Upload, Trash2, X, Image, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCatalogAssets, useCreateCatalogAsset, useDeleteCatalogAsset, uploadCatalogAsset } from '@/hooks/use-catalog'
import { useUIStore } from '@/stores/ui-store'
import { APPLE_DEVICE_ICONS, getAppleDeviceIconList } from '@/lib/apple-device-icons'
import { cn } from '@/lib/utils'

/**
 * AssetLibrary — Browse built-in Apple SVGs + upload custom images.
 * Assets can be used in product display_settings.
 */
export function AssetLibrary() {
  const { data: dbAssets = [], isLoading } = useCatalogAssets()
  const createAsset = useCreateCatalogAsset()
  const deleteAsset = useDeleteCatalogAsset()
  const showToast = useUIStore((s) => s.showToast)

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('builtin') // 'builtin' | 'uploaded'
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const appleIcons = useMemo(() => getAppleDeviceIconList(), [])

  // Filter assets
  const filteredBuiltin = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return appleIcons
    return appleIcons.filter(
      (a) => a.name.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q))
    )
  }, [appleIcons, search])

  const filteredUploaded = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return dbAssets
    return dbAssets.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.tags || []).some((t) => t.includes(q))
    )
  }, [dbAssets, search])

  // Handle file upload
  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) {
      showToast('Invalid file type. Use PNG, JPG, SVG, or WebP.', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too large. Max 5MB.', 'error')
      return
    }

    setUploading(true)
    try {
      const url = await uploadCatalogAsset(file)
      await createAsset.mutateAsync({
        name: file.name.replace(/\.[^.]+$/, ''),
        category: file.type === 'image/svg+xml' ? 'svg' : 'image',
        asset_type: 'uploaded',
        url,
        tags: [],
      })
      showToast('Asset uploaded')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteAsset.mutateAsync(id)
      showToast('Asset deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3 w-3" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
        {[
          { key: 'builtin', label: `Apple Devices (${appleIcons.length})` },
          { key: 'uploaded', label: `Uploaded (${dbAssets.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 text-xs font-medium py-1.5 rounded-md transition-all',
              tab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'builtin' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredBuiltin.map((icon) => (
            <Card key={icon.key} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex flex-col items-center gap-2">
                <div
                  className="h-10 w-10 text-muted-foreground group-hover:text-foreground transition-colors"
                  dangerouslySetInnerHTML={{ __html: icon.svg }}
                />
                <div className="text-center">
                  <p className="text-[11px] font-medium truncate w-full">{icon.name}</p>
                  <p className="text-[9px] text-muted-foreground">{icon.category}</p>
                </div>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {icon.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[8px] text-muted-foreground/60 bg-muted/40 rounded px-1 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-[9px] font-mono text-primary/60 select-all">{icon.key}</p>
              </CardContent>
            </Card>
          ))}
          {filteredBuiltin.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-xs text-muted-foreground">No matching Apple device icons</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredUploaded.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Image className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No uploaded assets yet</p>
              <p className="text-xs text-muted-foreground/60">
                Upload PNG, JPG, SVG, or WebP images to use as product icons
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Upload your first asset
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredUploaded.map((asset) => (
                <Card key={asset.id} className="group hover:shadow-md transition-shadow relative">
                  <CardContent className="p-3 flex flex-col items-center gap-2">
                    {asset.url ? (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="h-10 w-10 object-contain"
                      />
                    ) : asset.svg_content ? (
                      <div
                        className="h-10 w-10 text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: asset.svg_content }}
                      />
                    ) : (
                      <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                        <Image className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-[11px] font-medium truncate w-full text-center">{asset.name}</p>
                    {asset.url && (
                      <p className="text-[8px] text-muted-foreground/40 font-mono truncate w-full text-center select-all">
                        {asset.url.split('/').pop()}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Usage instructions */}
      <div className="text-[10px] text-muted-foreground/60 bg-muted/20 rounded-lg p-3 space-y-1">
        <p className="font-medium text-muted-foreground">How to use assets:</p>
        <p>1. For <strong>Apple SVG icons</strong>: Copy the key (e.g., <code className="font-mono text-primary/60">macbook-pro</code>) and paste it in the Icon field of the Product Visual Editor.</p>
        <p>2. For <strong>uploaded images</strong>: Copy the image URL and paste it in the Custom Image URL field of the Product Visual Editor.</p>
      </div>
    </div>
  )
}
