-- =============================================================
-- Migration 092 — Sensitive per-device credentials.
--
-- IMEI, SIM ICCID, PIN, WiFi password, MAC, phone number — all
-- the per-device data the Excel inventory was tracking but that
-- doesn't belong in the public products / qr_codes tables. Linked
-- 1:1 to a qr_codes row so the admin UI can join straight from the
-- equipment list. RLS is admin-only.
--
-- Run after 091 (otherwise the qr_codes referenced below don't
-- exist yet).
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.it_device_credentials (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  qr_code_id        UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,

  -- Identification
  imei              TEXT,        -- iPhones + routers
  mac_address       TEXT,        -- routers only
  serial_number     TEXT,        -- per-device serial when known

  -- Cellular
  sim_iccid         TEXT,        -- the long SIM serial
  sim_pin           TEXT,        -- SIM PIN code
  phone_number      TEXT,        -- voice / data number associated with the SIM
  carrier           TEXT,

  -- WiFi (routers only)
  wifi_ssid         TEXT,
  wifi_password     TEXT,
  router_password   TEXT,        -- the router's admin web UI password

  -- OS
  os_version        TEXT,        -- iOS X.Y, Android Z, …

  -- Free-form
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (qr_code_id)
);

CREATE INDEX IF NOT EXISTS idx_device_credentials_imei ON public.it_device_credentials (imei);
CREATE INDEX IF NOT EXISTS idx_device_credentials_phone_number ON public.it_device_credentials (phone_number);

CREATE TRIGGER trg_it_device_credentials_updated_at
  BEFORE UPDATE ON public.it_device_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── RLS: admin-only, no end-user read ───────────────────────
ALTER TABLE public.it_device_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage device credentials" ON public.it_device_credentials;
CREATE POLICY "Admins can manage device credentials" ON public.it_device_credentials
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ─── Import the Excel sensitive data ─────────────────────────
-- Phones first (one row per QR code we generated in 091). The
-- 'code' join key follows the VO-<SLUG>-NNN convention.

WITH phone_data (code, imei, phone_number, sim_iccid, sim_pin, serial_number, os_version, notes) AS (VALUES
  -- iPhone 8 — two units
  ('VO-IPHONE8-001',         '356395104246966',      '0478 79 45 92', '2100422207458', '7465', NULL,            '16.6', '1 - iPhone 8'),
  ('VO-IPHONE8-002',         '356395104507698',      '0478 79 68 63', '2100422207417', '8750', NULL,            '16.6', '2 - iPhone 8'),

  -- iPhone SE (2020)
  ('VO-IPHONESE2020-001',    '356785117951992',      '0475 60 06 32', '2100411960034', '2514', NULL,            NULL,   '6 - iPhone SE (2020)'),

  -- iPhone 6
  ('VO-IPHONE6-001',         '353025091413161',      '0470 80 38 94', '2100453481584', '6000', NULL,            '12.5.7 — no more updates', '4 - iPhone 6'),

  -- iPhone XR
  ('VO-IPHONEXR-001',        '356456102243585',      '0470 80 38 93', '2100453481600', '9919', NULL,            '17.5.1', '3 - iPhone XR'),

  -- iPhone 13 Pro Max
  ('VO-IPHONE13PROMAX-001',  '356579550794617',      '0476 95 07 65', '2100446707806', '1228', NULL,            '16.6', 'VO - 13-PM - #1'),

  -- iPhone SE (1st gen)
  ('VO-IPHONESE-001',        '359142076745204',       NULL,             NULL,             NULL,   NULL,            '15.7.8', '7 - iPhone SE'),

  -- iPhone 7
  ('VO-IPHONE7-001',          NULL,                  '0470 70 41 73', '2100446707772', '1880', NULL,            '15.7.8', '8 - iPhone 7'),

  -- iPhone 15 Pro Max
  ('VO-IPHONE15PROMAX-001',  '356642158472604',      '0470 80 06 67', '2100453481618', '9432', NULL,            '18',   'VO - 15-PM - #1'),

  -- iPhone 13 fleet (4 units)
  ('VO-IPHONE13-001',         NULL,                  '0470 60 04 87', '2100453481535', '4457', NULL,            NULL,   'VO - 13 - #1 — NE26 (Deniz/Alix)'),
  ('VO-IPHONE13-002',         NULL,                  '0470 60 06 54', '2100453481543', '8272', NULL,            NULL,   'VO - 13 - #2'),
  ('VO-IPHONE13-003',         NULL,                  '0470 60 08 33', '2100479233266', '5117', NULL,            NULL,   'VO - 13 - #3'),
  ('VO-IPHONE13-004',         NULL,                  '0470 60 08 73', '2100479233258', '2111', NULL,            NULL,   'VO - 13 - #4 — NE26 (Deniz/Alix)')
)
INSERT INTO public.it_device_credentials
  (qr_code_id, imei, phone_number, sim_iccid, sim_pin, serial_number, os_version, notes)
SELECT qc.id, p.imei, p.phone_number, p.sim_iccid, p.sim_pin, p.serial_number, p.os_version, p.notes
FROM phone_data p
JOIN public.qr_codes qc ON qc.code = p.code;


-- Routers (fixed + mobile). Routeur 1 / 2 / 3 = fixed (TP-Link),
-- Routeur Mobile - 1 / 2 = mobile pocket units.

WITH router_data (code, imei, mac_address, sim_iccid, sim_pin, phone_number, router_password, wifi_ssid, serial_number, notes) AS (VALUES
  ('VO-ROUTEUR4GFIXE-001',
     '866501041413766', '60-A4-B7-48-18-E9', '2100479233175 / 2100453481550', '9525',
     '0470 60 44 77 / 0470 75 02 76', '99064273', 'TP-LINK_18E9(_5G)', '22152H1004366',
     'Routeur 1 — fixed (Olivier Vernimmen)'),
  ('VO-ROUTEUR4GFIXE-002',
     '866501041786021', '10-27-F5-95-80-2F', '2100479233241 / 2100453481527', '2805',
     '0470 60 45 97 / 0470 70 36 37', '87445633', 'TP-LINK_802F(_5G)', '22172Y0004612',
     'Routeur 2 — fixed (Olivier Vernimmen)'),
  ('VO-ROUTEUR4GFIXE-003',
     '866501041524315', '60-A4-B7-90-ED-80', '2100453481576',                 '8382',
     '0470 80 09 28',                  '15950529', 'TP-LINK_ED80(_5G)', '2215211006101',
     'Routeur 3 — fixed (Olivier Vernimmen)'),
  ('VO-ROUTEUR4GMOBILE-001',
     '861806056426289', NULL,               '2100453481592',                 '8720',
     '0470 80 13 39',                  NULL,       NULL,                '22395F7003157',
     'Routeur Mobile - 1'),
  ('VO-ROUTEUR4GMOBILE-002',
     NULL,              NULL,               '2100479233233',                 '2703',
     '0470 60 23 35',                  '31306022', 'TP-Link_2C7D',       '2246378000744',
     'Routeur Mobile - 2')
)
INSERT INTO public.it_device_credentials
  (qr_code_id, imei, mac_address, sim_iccid, sim_pin, phone_number, router_password, wifi_ssid, serial_number, notes)
SELECT qc.id, r.imei, r.mac_address, r.sim_iccid, r.sim_pin, r.phone_number, r.router_password, r.wifi_ssid, r.serial_number, r.notes
FROM router_data r
JOIN public.qr_codes qc ON qc.code = r.code;


-- iPad Air + iPad Pro serial numbers (no SIM/IMEI, just SN).

WITH ipad_data (code, serial_number, notes) AS (VALUES
  ('VO-IPADAIR-001', 'XFM6X6JN9L', 'iPad Air | 1'),
  ('VO-IPADAIR-002', 'YX7PHCJ2F2', 'iPad Air | 2'),
  ('VO-IPADAIR-003', 'FRQOQNDXOV', 'iPad Air | 3'),
  ('VO-IPADAIR-004', 'Y3DXMQYMX1', 'iPad Air | 4'),
  ('VO-IPADAIR-005', 'NXRT62JJWG', 'iPad Air | 5'),
  ('VO-IPADPRO-001', 'H2TPYJQ65X', 'iPad Pro | 1'),
  ('VO-IPADPRO-002', 'L90VMM6G0G', 'iPad Pro | 2')
)
INSERT INTO public.it_device_credentials (qr_code_id, serial_number, notes)
SELECT qc.id, i.serial_number, i.notes
FROM ipad_data i
JOIN public.qr_codes qc ON qc.code = i.code;


-- Sanity check.
SELECT 'Credentials imported' AS step,
       (SELECT COUNT(*) FROM public.it_device_credentials) AS rows;

COMMIT;
