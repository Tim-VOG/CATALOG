-- Migration 006: App Settings (Design / Branding)

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    logo_url TEXT,
    app_name VARCHAR(100) DEFAULT 'EquipLend',
    primary_color VARCHAR(7) DEFAULT '#f97316',
    accent_color VARCHAR(7) DEFAULT '#06b6d4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed with defaults
INSERT INTO app_settings (app_name, primary_color, accent_color)
VALUES ('EquipLend', '#f97316', '#06b6d4');

-- Trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App settings are viewable by everyone" ON app_settings
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify app settings" ON app_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- NOTE: Storage bucket 'logos' must be created in Supabase Dashboard > Storage
-- with public access enabled, plus these policies:
--
-- CREATE POLICY "Admins can upload logos" ON storage.objects
--     FOR INSERT WITH CHECK (
--         bucket_id = 'logos'
--         AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--     );
--
-- CREATE POLICY "Public logos access" ON storage.objects
--     FOR SELECT USING (bucket_id = 'logos');
