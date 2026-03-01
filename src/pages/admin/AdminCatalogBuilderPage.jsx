import { useState } from 'react'
import { motion } from 'motion/react'
import { Palette, Package, Image } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ProductVisualEditor } from '@/components/admin/catalog-builder/ProductVisualEditor'
import { CatalogSettingsEditor } from '@/components/admin/catalog-builder/CatalogSettingsEditor'
import { AssetLibrary } from '@/components/admin/catalog-builder/AssetLibrary'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'products', label: 'Product Cards', icon: Package, description: 'Customize each product\'s icon, colors, and badge' },
  { key: 'settings', label: 'Catalog Settings', icon: Palette, description: 'Hero section, grid layout, and display options' },
  { key: 'assets', label: 'Asset Library', icon: Image, description: 'Browse Apple device icons and upload custom images' },
]

export function AdminCatalogBuilderPage() {
  const [activeTab, setActiveTab] = useState('products')

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Catalog Builder"
        description="Visual editor for your product catalog — customize icons, colors, gradients, and more"
      />

      {/* Tab navigation */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 border border-border/30">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative flex items-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="catalog-builder-tab"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab description */}
      <p className="text-xs text-muted-foreground px-1">
        {TABS.find((t) => t.key === activeTab)?.description}
      </p>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'products' && <ProductVisualEditor />}
        {activeTab === 'settings' && <CatalogSettingsEditor />}
        {activeTab === 'assets' && <AssetLibrary />}
      </div>
    </div>
  )
}
