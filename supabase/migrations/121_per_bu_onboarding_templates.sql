-- Per-business-unit onboarding welcome templates.
-- Until now onboarding_block_templates held ONE global set (VO Group).
-- We add a business_unit column ('' = the default/VO Group set that every
-- BU inherits from) and key uniqueness on (business_unit, block_key), so
-- each business unit can have its own editable copy of the welcome blocks.

ALTER TABLE onboarding_block_templates
  ADD COLUMN IF NOT EXISTS business_unit text NOT NULL DEFAULT '';

-- Drop the old single-column unique on block_key (name is the Postgres
-- default for a UNIQUE column constraint) and replace with a composite one.
ALTER TABLE onboarding_block_templates
  DROP CONSTRAINT IF EXISTS onboarding_block_templates_block_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_block_templates_bu_key
  ON onboarding_block_templates (business_unit, block_key);

-- A per-BU row inherits its label/icon from the default set, so these no
-- longer need to be supplied on every insert.
ALTER TABLE onboarding_block_templates ALTER COLUMN label_fr DROP NOT NULL;
ALTER TABLE onboarding_block_templates ALTER COLUMN label_en DROP NOT NULL;
