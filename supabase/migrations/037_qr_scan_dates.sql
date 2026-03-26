-- ================================================================
-- QR SCAN: Add pickup/return date tracking
-- Migration: 037_qr_scan_dates.sql
-- ================================================================

-- Add date columns to scan logs
ALTER TABLE qr_scan_logs ADD COLUMN IF NOT EXISTS pickup_date DATE;
ALTER TABLE qr_scan_logs ADD COLUMN IF NOT EXISTS expected_return_date DATE;
ALTER TABLE qr_scan_logs ADD COLUMN IF NOT EXISTS actual_return_date DATE;

-- Update the process_qr_scan function to accept dates
CREATE OR REPLACE FUNCTION process_qr_scan(
    p_qr_code VARCHAR,
    p_action VARCHAR,
    p_user_id UUID,
    p_user_email VARCHAR DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_pickup_date DATE DEFAULT NULL,
    p_expected_return_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_qr_record RECORD;
    v_stock_before INTEGER;
    v_stock_after INTEGER;
    v_kit_items RECORD;
    v_log_id UUID;
BEGIN
    -- Find the QR code
    SELECT qc.*, p.name AS product_name, p.total_stock, p.image_url,
           k.name AS kit_name, k.reference AS kit_reference
    INTO v_qr_record
    FROM qr_codes qc
    JOIN products p ON qc.product_id = p.id
    LEFT JOIN qr_kits k ON qc.kit_id = k.id
    WHERE qc.code = p_qr_code AND qc.is_active = TRUE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'QR code not found or inactive');
    END IF;

    v_stock_before := v_qr_record.total_stock;

    IF p_action = 'take' AND v_stock_before <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Out of stock',
            'product_name', v_qr_record.product_name, 'current_stock', v_stock_before);
    END IF;

    IF p_action = 'take' THEN
        v_stock_after := v_stock_before - 1;
    ELSIF p_action = 'deposit' THEN
        v_stock_after := v_stock_before + 1;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid action');
    END IF;

    -- Update product stock
    UPDATE products SET total_stock = v_stock_after WHERE id = v_qr_record.product_id;

    -- Kit stock sync
    IF v_qr_record.kit_id IS NOT NULL THEN
        FOR v_kit_items IN
            SELECT product_id, quantity FROM qr_kit_items
            WHERE kit_id = v_qr_record.kit_id AND product_id != v_qr_record.product_id
        LOOP
            IF p_action = 'take' THEN
                UPDATE products SET total_stock = GREATEST(total_stock - v_kit_items.quantity, 0)
                WHERE id = v_kit_items.product_id;
            ELSE
                UPDATE products SET total_stock = total_stock + v_kit_items.quantity
                WHERE id = v_kit_items.product_id;
            END IF;
        END LOOP;
    END IF;

    -- Create scan log with dates
    INSERT INTO qr_scan_logs (
        qr_code_id, qr_code, product_id, kit_id,
        user_id, user_email, user_name,
        action, quantity_changed, stock_before, stock_after, notes,
        pickup_date, expected_return_date,
        actual_return_date
    ) VALUES (
        v_qr_record.id, p_qr_code, v_qr_record.product_id, v_qr_record.kit_id,
        p_user_id, p_user_email, p_user_name,
        p_action, 1, v_stock_before, v_stock_after, p_notes,
        CASE WHEN p_action = 'take' THEN COALESCE(p_pickup_date, CURRENT_DATE) ELSE NULL END,
        CASE WHEN p_action = 'take' THEN p_expected_return_date ELSE NULL END,
        CASE WHEN p_action = 'deposit' THEN CURRENT_DATE ELSE NULL END
    ) RETURNING id INTO v_log_id;

    RETURN json_build_object(
        'success', true,
        'log_id', v_log_id,
        'product_name', v_qr_record.product_name,
        'product_image', v_qr_record.image_url,
        'kit_name', v_qr_record.kit_name,
        'action', p_action,
        'stock_before', v_stock_before,
        'stock_after', v_stock_after
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update view to include dates
CREATE OR REPLACE VIEW qr_scan_logs_with_details AS
SELECT
    sl.id, sl.qr_code, sl.action, sl.quantity_changed,
    sl.stock_before, sl.stock_after, sl.notes, sl.created_at,
    sl.user_email, sl.user_name, sl.product_id, sl.kit_id,
    sl.qr_code_id, sl.user_id,
    sl.pickup_date, sl.expected_return_date, sl.actual_return_date,
    p.name AS product_name, p.image_url AS product_image,
    c.name AS category_name, c.color AS category_color,
    k.name AS kit_name
FROM qr_scan_logs sl
LEFT JOIN products p ON sl.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN qr_kits k ON sl.kit_id = k.id
ORDER BY sl.created_at DESC;
