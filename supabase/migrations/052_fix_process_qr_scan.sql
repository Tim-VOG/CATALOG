-- ============================================
-- MIGRATION 052: Fix process_qr_scan — remove kit references
-- The qr_kits table was dropped but the function still references it
-- ============================================

-- Drop and recreate the function without kit logic
CREATE OR REPLACE FUNCTION process_qr_scan(
    p_qr_code VARCHAR,
    p_action VARCHAR,
    p_user_id UUID DEFAULT NULL,
    p_user_email VARCHAR DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_pickup_date DATE DEFAULT NULL,
    p_expected_return_date DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_qr_record RECORD;
    v_stock_before INTEGER;
    v_stock_after INTEGER;
BEGIN
    -- Find QR code with product info
    SELECT
        qc.id, qc.code, qc.product_id, qc.is_active, qc.status,
        qc.assigned_to, qc.assigned_to_name,
        p.name AS product_name, p.total_stock, p.image_url AS product_image,
        c.name AS category_name, c.color AS category_color
    INTO v_qr_record
    FROM qr_codes qc
    LEFT JOIN products p ON qc.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE qc.code = p_qr_code;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'QR code not found: ' || p_qr_code);
    END IF;

    IF NOT v_qr_record.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'QR code is deactivated');
    END IF;

    v_stock_before := v_qr_record.total_stock;

    -- TAKE: assign to user, stock -1
    IF p_action = 'take' THEN
        IF v_stock_before <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'No stock available for ' || v_qr_record.product_name);
        END IF;

        IF v_qr_record.status = 'assigned' THEN
            RETURN jsonb_build_object('success', false, 'error', 'This device is already assigned to ' || COALESCE(v_qr_record.assigned_to_name, 'someone'));
        END IF;

        v_stock_after := v_stock_before - 1;
        UPDATE products SET total_stock = v_stock_after WHERE id = v_qr_record.product_id;

        -- Mark QR as assigned
        UPDATE qr_codes SET
            status = 'assigned',
            assigned_to = p_user_id,
            assigned_to_name = p_user_name,
            assigned_to_email = p_user_email,
            assigned_at = NOW()
        WHERE id = v_qr_record.id;

    -- DEPOSIT: return device, stock +1
    ELSIF p_action = 'deposit' THEN
        IF v_qr_record.status != 'assigned' THEN
            RETURN jsonb_build_object('success', false, 'error', 'This device is not currently assigned — cannot deposit');
        END IF;

        v_stock_after := v_stock_before + 1;
        UPDATE products SET total_stock = v_stock_after WHERE id = v_qr_record.product_id;

        -- Mark QR as available
        UPDATE qr_codes SET
            status = 'available',
            assigned_to = NULL,
            assigned_to_name = NULL,
            assigned_to_email = NULL,
            assigned_at = NULL
        WHERE id = v_qr_record.id;

        -- Close user_equipment record if exists
        UPDATE user_equipment SET
            status = 'returned',
            actual_return_date = CURRENT_DATE
        WHERE product_id = v_qr_record.product_id
          AND user_id = v_qr_record.assigned_to
          AND status = 'active';

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action: ' || p_action);
    END IF;

    -- Log the scan
    INSERT INTO qr_scan_logs (
        qr_code_id, qr_code, product_id,
        user_id, user_email, user_name,
        action, quantity_changed, stock_before, stock_after,
        notes, pickup_date, expected_return_date
    ) VALUES (
        v_qr_record.id, p_qr_code, v_qr_record.product_id,
        p_user_id, p_user_email, p_user_name,
        p_action, 1, v_stock_before, v_stock_after,
        p_notes, p_pickup_date, p_expected_return_date
    );

    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'product_name', v_qr_record.product_name,
        'product_image', v_qr_record.product_image,
        'category_name', v_qr_record.category_name,
        'stock_before', v_stock_before,
        'stock_after', v_stock_after,
        'qr_code', p_qr_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also recreate scan logs view without kit references
DROP VIEW IF EXISTS qr_scan_logs_with_details CASCADE;
CREATE VIEW qr_scan_logs_with_details AS
SELECT
    sl.*,
    p.name AS product_name,
    p.image_url AS product_image,
    c.name AS category_name,
    c.color AS category_color
FROM qr_scan_logs sl
LEFT JOIN products p ON sl.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;
