-- ============================================
-- MIGRATION 066: IT inventory — editable spreadsheet
-- One row per asset (laptop / desktop / etc.) with the financial
-- columns needed to compute residual value, amortisation, deductible.
-- ============================================

CREATE TABLE IF NOT EXISTS it_inventory_items (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            VARCHAR(255) NOT NULL DEFAULT '',
  company         VARCHAR(255) DEFAULT '',
  device_type     VARCHAR(50)  DEFAULT '',    -- 'Mac' | 'PC' | other
  owner           VARCHAR(255) DEFAULT '',    -- "PROPRI" column
  ram             VARCHAR(50)  DEFAULT '',
  serial_number   VARCHAR(255) DEFAULT '',
  labo_care       VARCHAR(255) DEFAULT '',
  leasing_start   DATE,
  leasing_end     DATE,
  warranty_end    DATE,
  access_notes    TEXT          DEFAULT '',
  purchase_price  NUMERIC(12,2) DEFAULT 0,
  residual_value  NUMERIC(12,2) DEFAULT 0,
  deductible_pct  NUMERIC(5,2)  DEFAULT 15,    -- "% de franchise"
  notes           TEXT          DEFAULT '',
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_it_inventory_company ON it_inventory_items(company);
CREATE INDEX IF NOT EXISTS idx_it_inventory_device_type ON it_inventory_items(device_type);

CREATE TRIGGER update_it_inventory_items_updated_at
  BEFORE UPDATE ON it_inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE it_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage IT inventory" ON it_inventory_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
