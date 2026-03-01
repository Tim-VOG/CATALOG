import { createElement } from 'react'
import { motion } from 'motion/react'
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Headphones,
  Camera,
  Mic,
  Printer,
  Wifi,
  HardDrive,
  Keyboard,
  Mouse,
  Tv,
  Speaker,
  Watch,
  Gamepad2,
  Cpu,
  Router,
  Usb,
  Cable,
  Package,
  Projector,
  MonitorSmartphone,
  ScanLine,
  Dock,
} from 'lucide-react'
import { icons as lucideIcons } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APPLE_DEVICE_ICONS } from '@/lib/apple-device-icons'

/**
 * Gradient presets for each icon — gives each device a distinctive look.
 * Exported so other components (ColorPickerPopover, etc.) can reuse them.
 */
export const GRADIENTS = {
  laptop:      { from: 'from-blue-500/20',   to: 'to-cyan-400/10',    icon: 'text-blue-400',    glow: 'shadow-blue-500/10',    cardBg: 'from-blue-500/[0.07] to-cyan-400/[0.03]' },
  phone:       { from: 'from-violet-500/20',  to: 'to-fuchsia-400/10', icon: 'text-violet-400',  glow: 'shadow-violet-500/10',  cardBg: 'from-violet-500/[0.07] to-fuchsia-400/[0.03]' },
  tablet:      { from: 'from-indigo-500/20',  to: 'to-blue-400/10',    icon: 'text-indigo-400',  glow: 'shadow-indigo-500/10',  cardBg: 'from-indigo-500/[0.07] to-blue-400/[0.03]' },
  monitor:     { from: 'from-emerald-500/20', to: 'to-teal-400/10',    icon: 'text-emerald-400', glow: 'shadow-emerald-500/10', cardBg: 'from-emerald-500/[0.07] to-teal-400/[0.03]' },
  headphones:  { from: 'from-purple-500/20',  to: 'to-pink-400/10',    icon: 'text-purple-400',  glow: 'shadow-purple-500/10',  cardBg: 'from-purple-500/[0.07] to-pink-400/[0.03]' },
  camera:      { from: 'from-rose-500/20',    to: 'to-orange-400/10',  icon: 'text-rose-400',    glow: 'shadow-rose-500/10',    cardBg: 'from-rose-500/[0.07] to-orange-400/[0.03]' },
  mic:         { from: 'from-amber-500/20',   to: 'to-yellow-400/10',  icon: 'text-amber-400',   glow: 'shadow-amber-500/10',   cardBg: 'from-amber-500/[0.07] to-yellow-400/[0.03]' },
  printer:     { from: 'from-slate-500/20',   to: 'to-gray-400/10',    icon: 'text-slate-400',   glow: 'shadow-slate-500/10',   cardBg: 'from-slate-500/[0.07] to-gray-400/[0.03]' },
  keyboard:    { from: 'from-zinc-500/20',    to: 'to-neutral-400/10', icon: 'text-zinc-400',    glow: 'shadow-zinc-500/10',    cardBg: 'from-zinc-500/[0.07] to-neutral-400/[0.03]' },
  mouse:       { from: 'from-sky-500/20',     to: 'to-blue-400/10',    icon: 'text-sky-400',     glow: 'shadow-sky-500/10',     cardBg: 'from-sky-500/[0.07] to-blue-400/[0.03]' },
  speaker:     { from: 'from-orange-500/20',  to: 'to-red-400/10',     icon: 'text-orange-400',  glow: 'shadow-orange-500/10',  cardBg: 'from-orange-500/[0.07] to-red-400/[0.03]' },
  tv:          { from: 'from-cyan-500/20',    to: 'to-teal-400/10',    icon: 'text-cyan-400',    glow: 'shadow-cyan-500/10',    cardBg: 'from-cyan-500/[0.07] to-teal-400/[0.03]' },
  network:     { from: 'from-green-500/20',   to: 'to-emerald-400/10', icon: 'text-green-400',   glow: 'shadow-green-500/10',   cardBg: 'from-green-500/[0.07] to-emerald-400/[0.03]' },
  storage:     { from: 'from-teal-500/20',    to: 'to-cyan-400/10',    icon: 'text-teal-400',    glow: 'shadow-teal-500/10',    cardBg: 'from-teal-500/[0.07] to-cyan-400/[0.03]' },
  projector:   { from: 'from-pink-500/20',    to: 'to-rose-400/10',    icon: 'text-pink-400',    glow: 'shadow-pink-500/10',    cardBg: 'from-pink-500/[0.07] to-rose-400/[0.03]' },
  accessory:   { from: 'from-primary/20',     to: 'to-accent/10',      icon: 'text-primary',     glow: 'shadow-primary/10',     cardBg: 'from-primary/[0.07] to-accent/[0.03]' },
  default:     { from: 'from-primary/20',     to: 'to-accent/10',      icon: 'text-primary',     glow: 'shadow-primary/10',     cardBg: 'from-primary/[0.07] to-accent/[0.03]' },
}

/**
 * Convert a kebab-case icon name to PascalCase for lucide-react lookup.
 * E.g., "hard-drive" → "HardDrive"
 */
function toPascalCase(str) {
  return str.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())
}

/**
 * Resolve a lucide icon component from an icon name string.
 * Supports both kebab-case ("hard-drive") and PascalCase ("HardDrive").
 */
function resolveLucideIcon(iconName) {
  if (!iconName) return null
  // Try direct PascalCase lookup
  if (lucideIcons[iconName]) return lucideIcons[iconName]
  // Try converting from kebab-case
  const pascal = toPascalCase(iconName)
  return lucideIcons[pascal] || null
}

/**
 * Match a product name + category to the right icon and gradient.
 * Uses fuzzy keyword matching.
 */
function resolveDevice(name = '', category = '', subType = '') {
  const text = `${name} ${category} ${subType}`.toLowerCase()

  // Order matters — more specific matches first
  if (/macbook|laptop|notebook|thinkpad|surface\s*(pro|laptop|book)|dell\s*(xps|latitude|inspiron)|hp\s*(elite|probook|pavilion|envy)|lenovo/.test(text))
    return { Icon: Laptop, gradient: GRADIENTS.laptop, key: 'laptop' }

  if (/iphone|smartphone|galaxy|pixel|android|phone|mobile|oneplus/.test(text))
    return { Icon: Smartphone, gradient: GRADIENTS.phone, key: 'phone' }

  if (/ipad|tablet|surface\s*go|galaxy\s*tab/.test(text))
    return { Icon: Tablet, gradient: GRADIENTS.tablet, key: 'tablet' }

  if (/imac|thunderbolt\s*display|studio\s*display|monitor|display|screen/.test(text))
    return { Icon: Monitor, gradient: GRADIENTS.monitor, key: 'monitor' }

  if (/headphone|headset|earphone|earbud|airpod|earpod|beats/.test(text))
    return { Icon: Headphones, gradient: GRADIENTS.headphones, key: 'headphones' }

  if (/camera|webcam|gopro|dslr|mirrorless|canon|nikon|sony\s*(a7|zv|fx)/.test(text))
    return { Icon: Camera, gradient: GRADIENTS.camera, key: 'camera' }

  if (/micro(phone)?|mic\b|rode|shure|blue\s*yeti|audio\s*interface/.test(text))
    return { Icon: Mic, gradient: GRADIENTS.mic, key: 'mic' }

  if (/printer|scanner|scan|copier|mfp|multifunction/.test(text))
    return { Icon: Printer, gradient: GRADIENTS.printer, key: 'printer' }

  if (/projector|beamer|epson|benq|optoma/.test(text))
    return { Icon: Projector, gradient: GRADIENTS.projector, key: 'projector' }

  if (/keyboard|keychron|mechanical\s*kb/.test(text))
    return { Icon: Keyboard, gradient: GRADIENTS.keyboard, key: 'keyboard' }

  if (/mouse|trackpad|trackball|logitech\s*(mx|g)/.test(text))
    return { Icon: Mouse, gradient: GRADIENTS.mouse, key: 'mouse' }

  if (/speaker|soundbar|bose|sonos|jbl|marshall/.test(text))
    return { Icon: Speaker, gradient: GRADIENTS.speaker, key: 'speaker' }

  if (/television|tv\b|apple\s*tv|chromecast|streaming/.test(text))
    return { Icon: Tv, gradient: GRADIENTS.tv, key: 'tv' }

  if (/watch|smartwatch|apple\s*watch|wearable/.test(text))
    return { Icon: Watch, gradient: GRADIENTS.phone, key: 'watch' }

  if (/router|access\s*point|switch|network|ethernet|wifi\s*(adapter|dongle)/.test(text))
    return { Icon: Router, gradient: GRADIENTS.network, key: 'network' }

  if (/hard\s*drive|ssd|nas|storage|usb\s*(drive|stick)|flash\s*drive|external\s*drive/.test(text))
    return { Icon: HardDrive, gradient: GRADIENTS.storage, key: 'storage' }

  if (/dock|docking|hub|usb-c\s*hub|thunderbolt\s*(dock|hub)/.test(text))
    return { Icon: Dock || Cable, gradient: GRADIENTS.accessory, key: 'dock' }

  if (/cable|adapter|charger|dongle|converter/.test(text))
    return { Icon: Cable, gradient: GRADIENTS.accessory, key: 'cable' }

  if (/game|controller|console|playstation|xbox|nintendo/.test(text))
    return { Icon: Gamepad2, gradient: GRADIENTS.speaker, key: 'game' }

  if (/cpu|processor|server|raspberry|mini\s*pc|mac\s*mini|mac\s*studio|mac\s*pro/.test(text))
    return { Icon: Cpu, gradient: GRADIENTS.storage, key: 'cpu' }

  // Fallback by category name alone
  if (/communication/.test(text))
    return { Icon: MonitorSmartphone, gradient: GRADIENTS.phone, key: 'communication' }

  if (/audio|video|av\b/.test(text))
    return { Icon: Headphones, gradient: GRADIENTS.headphones, key: 'av' }

  if (/accessori?e?s?|peripheral/.test(text))
    return { Icon: Usb, gradient: GRADIENTS.accessory, key: 'accessory' }

  // Default
  return { Icon: Package, gradient: GRADIENTS.default, key: 'default' }
}

/**
 * DeviceIcon — renders a beautiful gradient-backed icon for a device.
 *
 * @param {string} name - Product name
 * @param {string} category - Category name
 * @param {string} subType - Sub-type
 * @param {'sm' | 'md' | 'lg' | 'xl'} size - Icon size
 * @param {boolean} animated - Enable hover animation
 * @param {string} className - Additional classes
 * @param {object} displaySettings - Custom display overrides from DB { icon_name, icon_color, gradient_from, gradient_to, custom_image_url, icon_size }
 */
export function DeviceIcon({
  name = '',
  category = '',
  subType = '',
  size = 'md',
  animated = true,
  className,
  displaySettings,
}) {
  const ds = displaySettings || {}
  const { Icon: AutoIcon, gradient: autoGradient, key } = resolveDevice(name, category, subType)

  // Override size from display settings
  const effectiveSize = ds.icon_size || size

  // Resolve icon: custom icon_name > auto-detected
  let IconComponent = AutoIcon
  let isAppleSvg = false
  let appleSvgContent = null

  if (ds.icon_name) {
    // Check if it's an Apple device icon key
    if (APPLE_DEVICE_ICONS[ds.icon_name]) {
      isAppleSvg = true
      appleSvgContent = APPLE_DEVICE_ICONS[ds.icon_name].svg
    } else {
      // Try lucide-react icon
      const resolved = resolveLucideIcon(ds.icon_name)
      if (resolved) IconComponent = resolved
    }
  }

  // Custom image overrides everything
  const hasCustomImage = !!ds.custom_image_url

  // Build gradient — use custom colors if provided, else auto
  const hasCustomGradient = ds.gradient_from || ds.gradient_to
  const gradient = autoGradient

  // Inline styles for custom colors (Tailwind JIT can't handle runtime hex values)
  const customIconStyle = ds.icon_color ? { color: ds.icon_color } : {}
  const customGradientStyle = hasCustomGradient
    ? {
        background: `linear-gradient(to bottom right, ${ds.gradient_from || 'transparent'}, ${ds.gradient_to || 'transparent'})`,
      }
    : {}
  const customCardBgStyle = ds.card_bg ? { background: ds.card_bg } : {}
  const customGlowStyle = hasCustomGradient
    ? {
        background: `linear-gradient(to bottom right, ${ds.gradient_from || 'transparent'}66, ${ds.gradient_to || 'transparent'}33)`,
      }
    : {}

  const sizeMap = {
    sm: { container: 'h-10 w-10', icon: 'h-5 w-5', ring: 'h-12 w-12', imgSize: 32 },
    md: { container: 'h-16 w-16', icon: 'h-7 w-7', ring: 'h-20 w-20', imgSize: 48 },
    lg: { container: 'h-24 w-24', icon: 'h-10 w-10', ring: 'h-28 w-28', imgSize: 64 },
    xl: { container: 'h-32 w-32', icon: 'h-14 w-14', ring: 'h-36 w-36', imgSize: 80 },
  }

  const s = sizeMap[effectiveSize] || sizeMap.md

  const Wrapper = animated ? motion.div : 'div'
  const wrapperProps = animated
    ? {
        whileHover: { scale: 1.08, rotate: -3 },
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      }
    : {}

  return (
    <Wrapper
      className={cn('relative inline-flex items-center justify-center', className)}
      {...wrapperProps}
    >
      {/* Outer glow ring */}
      <div
        className={cn(
          'absolute rounded-full opacity-40 blur-md',
          !hasCustomGradient && 'bg-gradient-to-br',
          !hasCustomGradient && gradient.from,
          !hasCustomGradient && gradient.to,
          s.ring
        )}
        style={hasCustomGradient ? customGlowStyle : undefined}
      />

      {/* Main circle */}
      <div
        className={cn(
          'relative rounded-2xl flex items-center justify-center',
          'border border-white/[0.08] backdrop-blur-sm',
          !hasCustomGradient && 'bg-gradient-to-br',
          !hasCustomGradient && `shadow-lg ${gradient.glow}`,
          !hasCustomGradient && gradient.from,
          !hasCustomGradient && gradient.to,
          s.container,
        )}
        style={hasCustomGradient ? { ...customGradientStyle, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' } : undefined}
      >
        {/* Inner shine */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

        {/* Render: custom image > apple SVG > lucide icon */}
        {hasCustomImage ? (
          <img
            src={ds.custom_image_url}
            alt=""
            className={cn('relative object-contain', s.icon)}
            style={{ width: s.imgSize, height: s.imgSize }}
          />
        ) : isAppleSvg ? (
          <div
            className={cn('relative', s.icon, !ds.icon_color && gradient.icon)}
            style={customIconStyle}
            dangerouslySetInnerHTML={{ __html: appleSvgContent }}
          />
        ) : (
          <IconComponent
            className={cn('relative', !ds.icon_color && gradient.icon, s.icon)}
            style={customIconStyle}
            strokeWidth={1.5}
          />
        )}
      </div>
    </Wrapper>
  )
}

/**
 * DeviceIconInline — smaller inline version for lists, tables, etc.
 */
export function DeviceIconInline({ name = '', category = '', subType = '', className, displaySettings }) {
  const ds = displaySettings || {}
  const { Icon: AutoIcon, gradient } = resolveDevice(name, category, subType)

  let IconComponent = AutoIcon
  let isAppleSvg = false
  let appleSvgContent = null

  if (ds.icon_name) {
    if (APPLE_DEVICE_ICONS[ds.icon_name]) {
      isAppleSvg = true
      appleSvgContent = APPLE_DEVICE_ICONS[ds.icon_name].svg
    } else {
      const resolved = resolveLucideIcon(ds.icon_name)
      if (resolved) IconComponent = resolved
    }
  }

  const hasCustomImage = !!ds.custom_image_url
  const hasCustomGradient = ds.gradient_from || ds.gradient_to
  const customIconStyle = ds.icon_color ? { color: ds.icon_color } : {}
  const customGradientStyle = hasCustomGradient
    ? { background: `linear-gradient(to bottom right, ${ds.gradient_from || 'transparent'}, ${ds.gradient_to || 'transparent'})` }
    : {}

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded-lg',
        !hasCustomGradient && 'bg-gradient-to-br',
        !hasCustomGradient && gradient.from,
        !hasCustomGradient && gradient.to,
        'border border-white/[0.06]',
        className,
      )}
      style={hasCustomGradient ? customGradientStyle : undefined}
    >
      {hasCustomImage ? (
        <img src={ds.custom_image_url} alt="" className="h-4 w-4 object-contain" />
      ) : isAppleSvg ? (
        <div
          className={cn('h-4 w-4', !ds.icon_color && gradient.icon)}
          style={customIconStyle}
          dangerouslySetInnerHTML={{ __html: appleSvgContent }}
        />
      ) : (
        <IconComponent
          className={cn('h-4 w-4', !ds.icon_color && gradient.icon)}
          style={customIconStyle}
          strokeWidth={1.5}
        />
      )}
    </span>
  )
}

// Re-export for external use
DeviceIcon.resolve = resolveDevice
DeviceIcon.resolveLucideIcon = resolveLucideIcon
