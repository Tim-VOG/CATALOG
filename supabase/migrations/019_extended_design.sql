-- 019: Extended design customization — per-mode palettes + shared tokens
-- Dark mode palette (nullable = use CSS defaults)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_background VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_foreground VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_card VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_popover VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_secondary VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_muted VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_muted_fg VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS dark_border VARCHAR(10);

-- Light mode palette
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_background VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_foreground VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_card VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_popover VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_secondary VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_muted VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_muted_fg VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS light_border VARCHAR(10);

-- Shared accent colors
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS success_color VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS warning_color VARCHAR(10);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS destructive_color VARCHAR(10);

-- Border radius preset ('sm' | 'md' | 'lg' | 'xl' | 'full')
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS border_radius VARCHAR(10) DEFAULT 'md';

-- Header tagline
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS header_tagline VARCHAR(100) DEFAULT 'Book. Borrow. Return.';
