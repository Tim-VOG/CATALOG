-- Link each QR code to the request it was assigned through, so we can
-- hydrate the admin equipment request screen with the QR codes already
-- in flight on page load — instead of having to rely on a local React
-- state that vanishes the moment the admin reloads.
--
--   qr_codes.loan_request_id      → the loan_request the code currently
--                                   serves (NULL while available).
--   qr_codes.loan_request_item_id → the specific loan_request_items row
--                                   (= product slot) it occupies, so two
--                                   slots of the same product stay
--                                   independent.
-- Both are nullable and ON DELETE SET NULL — removing a request keeps
-- the QR codes around, just frees them.

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS loan_request_id UUID REFERENCES loan_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loan_request_item_id UUID REFERENCES loan_request_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_loan_request_id
  ON qr_codes(loan_request_id) WHERE loan_request_id IS NOT NULL;

-- Refresh the qr_codes_with_details view so the front-end gets the new
-- columns straight away.
DROP VIEW IF EXISTS qr_codes_with_details CASCADE;
CREATE VIEW qr_codes_with_details AS
SELECT
    qr.*,
    p.name AS product_name,
    p.image_url AS product_image,
    p.total_stock AS product_stock,
    c.name AS category_name,
    c.color AS category_color
FROM qr_codes qr
LEFT JOIN products p ON qr.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id;

NOTIFY pgrst, 'reload schema';
