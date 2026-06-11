-- Trim the default welcome email to what an IT admin actually wants every
-- new hire to see + add a 'VO Hub' block so the new joiner is pointed at
-- the internal portal from day one.
--
-- Adds a default_enabled flag (was previously implicit-true on the table)
-- so we can ship blocks that exist but stay off by default — the admin
-- can still toggle them on per composition.

ALTER TABLE onboarding_block_templates
  ADD COLUMN IF NOT EXISTS default_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Lean defaults: only the blocks that matter to almost every new hire.
UPDATE onboarding_block_templates SET default_enabled = TRUE
WHERE block_key IN (
  'salutation', 'email_info', 'password',
  'building_info', 'teams', 'wifi',
  'closing', 'signature_admin'
);

-- Optional/situational — kept in the bank but off by default.
UPDATE onboarding_block_templates SET default_enabled = FALSE
WHERE block_key IN (
  'it_security', 'email_signature', 'sharepoint',
  'image_rights', 'faq_it', 'cta_link'
);

-- Insert the new VO Hub invitation block (idempotent on block_key).
INSERT INTO onboarding_block_templates (
  block_key, label_fr, label_en,
  default_content_fr, default_content_en,
  default_options, default_enabled, icon, sort_order
) VALUES (
  'vo_hub',
  'Le VO Hub',
  'The VO Hub',
  E'Ta porte d''entrée pour toutes les demandes IT : équipement, accès, mailbox fonctionnelles, suivi de tes demandes — tout passe par le hub.\n\nConnecte-toi avec ton compte Microsoft VO (**{{email}}**) — pas besoin de créer un compte.',
  E'Your one-stop entry for every IT request: equipment, access, functional mailboxes, request tracking — it all goes through the hub.\n\nSign in with your VO Microsoft account (**{{email}}**) — no need to create one.',
  jsonb_build_object(
    'url', 'https://catalog-mu-sage.vercel.app/',
    'label_fr', 'Ouvrir le VO Hub',
    'label_en', 'Open the VO Hub'
  ),
  TRUE,
  'Sparkles',
  35  -- between Microsoft Teams (8 → 80 after we re-spread) and WiFi (9 → 90)
)
ON CONFLICT (block_key) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  label_en = EXCLUDED.label_en,
  default_content_fr = EXCLUDED.default_content_fr,
  default_content_en = EXCLUDED.default_content_en,
  default_options = EXCLUDED.default_options,
  default_enabled = EXCLUDED.default_enabled,
  icon = EXCLUDED.icon;

-- Re-spread sort_order so the new block sits between Teams and WiFi.
UPDATE onboarding_block_templates SET sort_order = CASE block_key
  WHEN 'salutation'       THEN 10
  WHEN 'email_info'       THEN 20
  WHEN 'password'         THEN 30
  WHEN 'building_info'    THEN 40
  WHEN 'it_security'      THEN 50
  WHEN 'email_signature'  THEN 60
  WHEN 'sharepoint'       THEN 70
  WHEN 'teams'            THEN 80
  WHEN 'vo_hub'           THEN 85
  WHEN 'wifi'             THEN 90
  WHEN 'image_rights'     THEN 100
  WHEN 'faq_it'           THEN 110
  WHEN 'cta_link'         THEN 120
  WHEN 'closing'          THEN 130
  WHEN 'signature_admin'  THEN 140
  ELSE sort_order
END;

NOTIFY pgrst, 'reload schema';
