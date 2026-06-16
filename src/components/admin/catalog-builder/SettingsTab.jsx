import { useState } from 'react'
import { motion } from 'motion/react'
import { Palette, Image } from 'lucide-react'
import { CatalogSettingsEditor } from './CatalogSettingsEditor'
import { AssetLibrary } from './AssetLibrary'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { key: 'settings', label: 'Catalog Settings', icon: Palette },
  { key: 'assets', label: 'Asset Library', icon: Image },
]

/**
 * SettingsTab — Catalog page settings + Asset library combined.
 */
export function SettingsTab() {
  const [section, setSection] = useState('settings')

  return (
    <div className="space-y-5">
      {/* Section toggle */}
      <div className="flex gap-1 bg-muted/20 rounded-lg p-0.5 max-w-sm">
        {SECTIONS.map((s) => {
          const active = section === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cn(
                'relative flex items-center gap-1.5 flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              {active && (
                <motion.span
                  layoutId="settings-section-toggle"
                  className="absolute inset-0 bg-background rounded-md shadow-sm border border-border/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {section === 'settings' && <CatalogSettingsEditor />}
      {section === 'assets' && <AssetLibrary />}
    </div>
  )
}
