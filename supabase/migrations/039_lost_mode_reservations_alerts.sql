-- ================================================================
-- LOST MODE + RESERVATIONS + STOCK ALERTS
-- Migration: 039_lost_mode_reservations_alerts.sql
-- ================================================================

-- ============================================
-- 1. LOST MODE
-- ============================================

-- Add lost status to scan logs
ALTER TABLE qr_scan_logs
  ADD COLUMN IF NOT EXISTS is_lost BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lost_reported_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lost_resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lost_notes TEXT;

-- ============================================
-- 2. EQUIPMENT RESERVATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS qr_reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    reserved_date DATE NOT NULL,
    pickup_by DATE NOT NULL,  -- must scan pickup by this date or reservation expires
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'picked_up', 'expired', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_reservations_product ON qr_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_qr_reservations_user ON qr_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_reservations_date ON qr_reservations(reserved_date);
CREATE INDEX IF NOT EXISTS idx_qr_reservations_status ON qr_reservations(status);

ALTER TABLE qr_reservations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_reservations' AND policyname='Reservations viewable by authenticated') THEN
    CREATE POLICY "Reservations viewable by authenticated" ON qr_reservations FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_reservations' AND policyname='Users can create reservations') THEN
    CREATE POLICY "Users can create reservations" ON qr_reservations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_reservations' AND policyname='Users can update own reservations') THEN
    CREATE POLICY "Users can update own reservations" ON qr_reservations FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_reservations' AND policyname='Admins can manage all reservations') THEN
    CREATE POLICY "Admins can manage all reservations" ON qr_reservations FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- Auto-expire reservations past pickup_by date
CREATE OR REPLACE FUNCTION expire_old_reservations() RETURNS void AS $$
BEGIN
  UPDATE qr_reservations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND pickup_by < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. STOCK ALERTS / WAITLIST
-- ============================================

CREATE TABLE IF NOT EXISTS qr_waitlist (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, user_id)
);

ALTER TABLE qr_waitlist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_waitlist' AND policyname='Waitlist viewable by authenticated') THEN
    CREATE POLICY "Waitlist viewable by authenticated" ON qr_waitlist FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_waitlist' AND policyname='Users can join waitlist') THEN
    CREATE POLICY "Users can join waitlist" ON qr_waitlist FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_waitlist' AND policyname='Users can leave waitlist') THEN
    CREATE POLICY "Users can leave waitlist" ON qr_waitlist FOR DELETE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='qr_waitlist' AND policyname='Admins manage waitlist') THEN
    CREATE POLICY "Admins manage waitlist" ON qr_waitlist FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- View for reservations with product details
CREATE OR REPLACE VIEW qr_reservations_with_details AS
SELECT r.*, p.name AS product_name, p.image_url AS product_image,
       p.total_stock AS product_stock,
       c.name AS category_name, c.color AS category_color
FROM qr_reservations r
JOIN products p ON r.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY r.reserved_date ASC;
