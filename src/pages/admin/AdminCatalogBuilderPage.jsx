import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Package, FolderTree, SlidersHorizontal, Palette, Image } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { ProductsTab } from '@/components/admin/catalog-builder/ProductsTab'
import { CategoriesTab } from '@/components/admin/catalog-builder/CategoriesTab'
import { OptionsTab } from '@/components/admin/catalog-builder/OptionsTab'
import { CatalogSettingsEditor } from '@/components/admin/catalog-builder/CatalogSettingsEditor'
import { AssetLibrary } from '@/components/admin/catalog-builder/AssetLibrary'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'products', label: 'Products', icon: Package, description: 'Create, edit, and customize product cards with visual settings' },
  { key: 'categories', label: 'Categories', icon: FolderTree, description: 'Organize products into categories' },
  { key: 'options', label: 'Options & Plans', icon: SlidersHorizontal, description: 'Manage accessories, software, and subscription plans' },
  { key: 'settings', label: 'Settings', icon: Palette, description: 'Configure hero section, grid layout, and display options' },
  { key: 'assets', label: 'Assets', icon: Image, description: 'Browse Apple device icons and upload custom images' },
]

export function AdminCatalogBuilderPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = TABS.find(t => t.key === searchParams.get('tab'))?.key || 'products'
  const [activeTab, setActiveTab] = useState(initialTab)

  const handleTabChange = (key) => {
    setActiveTab(key)
    setSearchParams({ tab: key }, { replace: true })
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <AdminPageHeader
        title="Catalog Manager"
        description="Products, categories, options, visual editor, and catalog settings — all in one place"
      />

      {/* Sticky tab navigation */}
      <div className="sticky top-0 z-30 -mx-6 lg:-mx-10 px-6 lg:px-10 pt-4 pb-3 bg-background/95 backdrop-blur-md border-b border-border/20">
        <div className="flex gap-1 bg-muted/30 rounded-xl p-1 border border-border/30">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'relative flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="catalog-manager-tab"
                    className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/40"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab description */}
        <p className="text-[11px] text-muted-foreground mt-2 px-1">
          {TABS.find((t) => t.key === activeTab)?.description}
        </p>
      </div>

      {/* Tab content */}
      <div className="pt-5 min-h-[500px]">
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'options' && <OptionsTab />}
        {activeTab === 'settings' && <CatalogSettingsEditor />}
        {activeTab === 'assets' && <AssetLibrary />}
      </div>
    </div>
  )
}
