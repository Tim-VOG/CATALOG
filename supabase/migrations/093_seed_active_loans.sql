-- =============================================================
-- Migration 093 — Mark QR codes that are physically loaned out.
--
-- Snapshot of the Excel "Prêts résumé" + "Events ongoing" tabs as
-- of 2026-06-11. Anything still in someone's hands today is flipped
-- to status='assigned' so the catalog stops offering them and the
-- /admin/qr-codes page shows who holds them.
--
-- We don't create matching loan_request rows — per spec the user
-- asked to "marquer les QR codes 'assigned' uniquement". Returns
-- get handled by the normal unassign flow from /admin/qr-codes.
--
-- Past loans (Jacopo Dec 2025, Martin Dec 2025, Luca Dec 2025,
-- Zoi May 2026, Giulia Mar 2026, Giada Mar 2026, Zineb Feb 2026)
-- are NOT seeded — they returned before this snapshot.
-- =============================================================

BEGIN;

UPDATE public.qr_codes
SET status            = 'assigned',
    assigned_to_name  = v.assigned_to_name,
    assigned_to_email = v.assigned_to_email,
    assigned_at       = v.assigned_at::timestamptz
FROM (VALUES
  -- iPhone 13 #1 / #4 — NE26 NATO Edge event 2026 (Deniz / Alix)
  ('VO-IPHONE13-001', 'Deniz Ozcelikel / Alix de Montjoye', 'denizozcelikel@vo-europe.eu', '2025-11-27 09:00:00'),
  ('VO-IPHONE13-004', 'Deniz Ozcelikel / Alix de Montjoye', 'denizozcelikel@vo-europe.eu', '2025-11-27 09:00:00'),

  -- Routeurs 1 / 2 / 3 fixed — Olivier Vernimmen (no end date in
  -- the source; flagged "Ongoing" in 'Pr ts résumé').
  ('VO-ROUTEUR4GFIXE-001', 'Olivier Vernimmen', 'overnimmen@vo-event.be', '2025-11-01 09:00:00'),
  ('VO-ROUTEUR4GFIXE-002', 'Olivier Vernimmen', 'overnimmen@vo-event.be', '2025-11-01 09:00:00'),
  ('VO-ROUTEUR4GFIXE-003', 'Olivier Vernimmen', 'overnimmen@vo-event.be', '2025-11-01 09:00:00')
) AS v(code, assigned_to_name, assigned_to_email, assigned_at)
WHERE public.qr_codes.code = v.code;


-- Sanity check.
SELECT
  qc.code,
  qc.status,
  qc.assigned_to_name,
  qc.assigned_at::date AS assigned_on
FROM public.qr_codes qc
WHERE qc.status = 'assigned'
ORDER BY qc.code;

COMMIT;
