import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, X, Image, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Reusable image upload component with drag & drop.
 *
 * Props:
 *   value         - current image URL
 *   onChange       - callback with new URL (or '' when removed)
 *   bucket        - Supabase storage bucket name (default: 'product-images')
 *   accept        - MIME types (default: 'image/png,image/jpeg,image/webp')
 *   maxSizeMB     - max file size in MB (default: 5)
 *   requiredWidth - minimum width in pixels (optional)
 *   requiredHeight- minimum height in pixels (optional)
 *   className     - additional className
 */
export function ImageUpload({
  value,
  onChange,
  bucket = 'product-images',
  accept = 'image/png,image/jpeg,image/webp',
  maxSizeMB = 5,
  requiredWidth,
  requiredHeight,
  className = '',
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const validateDimensions = (file) =>
    new Promise((resolve) => {
      if (!requiredWidth && !requiredHeight) return resolve(true)
      const img = new window.Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        if (requiredWidth && img.width < requiredWidth) {
          resolve(`Image width must be at least ${requiredWidth}px (got ${img.width}px)`)
          return
        }
        if (requiredHeight && img.height < requiredHeight) {
          resolve(`Image height must be at least ${requiredHeight}px (got ${img.height}px)`)
          return
        }
        resolve(true)
      }
      img.onerror = () => resolve('Could not read image dimensions')
      img.src = URL.createObjectURL(file)
    })

  const handleUpload = async (file) => {
    if (!file) return
    setError('')

    // Type check
    const allowedTypes = accept.split(',').map((t) => t.trim())
    if (!allowedTypes.includes(file.type)) {
      setError(`Accepted formats: ${allowedTypes.map((t) => t.replace('image/', '')).join(', ')}`)
      return
    }

    // Size check
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File must be under ${maxSizeMB}MB`)
      return
    }

    // Dimension check
    const dimResult = await validateDimensions(file)
    if (dimResult !== true) {
      setError(dimResult)
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files[0])
  }

  const handleRemove = () => {
    onChange('')
    setError('')
  }

  const dimensionHint = []
  if (requiredWidth) dimensionHint.push(`min ${requiredWidth}px wide`)
  if (requiredHeight) dimensionHint.push(`min ${requiredHeight}px tall`)

  return (
    <div className={className}>
      {value ? (
        <div className="relative inline-block">
          <div className="h-32 w-48 rounded-lg overflow-hidden bg-muted border">
            <img src={value} alt="Product" className="h-full w-full object-cover" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            Replace image
          </Button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
          </p>
          {dimensionHint.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: {dimensionHint.join(', ')}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => {
          handleUpload(e.target.files[0])
          e.target.value = '' // Reset so same file can be re-selected
        }}
      />
    </div>
  )
}
