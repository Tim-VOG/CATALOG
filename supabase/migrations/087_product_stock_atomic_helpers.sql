-- Atomic stock decrement / increment helpers — so two parallel QR
-- assignments (or a quantity-2 single-admin assignment that reads a
-- stale cached product_stock both times) can't silently desync the
-- catalog count.
--
-- The previous JS path did `set total_stock = (cached_value - 1)`
-- which, when the cached_value was the same for both writes (e.g.
-- the user assigned 2 codes in a row from the same page load),
-- decremented by 1 once instead of by 1 twice.

CREATE OR REPLACE FUNCTION decrement_product_stock(p_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_new INTEGER;
BEGIN
  UPDATE products
  SET total_stock = GREATEST(0, COALESCE(total_stock, 0) - 1)
  WHERE id = p_id
  RETURNING total_stock INTO v_new;
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION increment_product_stock(p_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_new INTEGER;
BEGIN
  UPDATE products
  SET total_stock = COALESCE(total_stock, 0) + 1
  WHERE id = p_id
  RETURNING total_stock INTO v_new;
  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_product_stock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_product_stock(UUID) TO authenticated;
