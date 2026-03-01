-- Catalog Visual Builder — Database migration
-- Adds display_settings & specs to products, catalog_settings to app_settings, catalog_assets table

-- 1. Product display settings (icon, colors, gradients, badge, custom image)
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_settings JSONB DEFAULT '{}';

-- 2. Product specs (array of { label, value, icon? })
ALTER TABLE products ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '[]';

-- 3. Catalog assets library (built-in SVGs + uploaded images)
CREATE TABLE IF NOT EXISTS catalog_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'icon',
  asset_type TEXT NOT NULL DEFAULT 'builtin',
  url TEXT,
  svg_content TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on catalog_assets
ALTER TABLE catalog_assets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read catalog assets
CREATE POLICY "Authenticated users can read catalog assets"
  ON catalog_assets FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage catalog assets (insert, update, delete)
CREATE POLICY "Admins can manage catalog assets"
  ON catalog_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Catalog settings on app_settings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS catalog_settings JSONB DEFAULT '{}';

-- Note: The products_with_category view uses p.* so display_settings and specs
-- will be automatically included without view changes.
