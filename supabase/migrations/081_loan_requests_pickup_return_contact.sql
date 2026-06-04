-- Allow the cart flow to capture who physically picks up / returns the gear
-- when that's not the same person as the requester (often an assistant
-- submits on behalf of someone else).

ALTER TABLE loan_requests
  ADD COLUMN IF NOT EXISTS pickup_contact TEXT,
  ADD COLUMN IF NOT EXISTS return_contact TEXT;

NOTIFY pgrst, 'reload schema';
