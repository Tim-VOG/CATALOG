-- =============================================================
-- Migration 125 — Dutch content for onboarding welcome blocks.
--
-- The welcome email supported FR/EN only. Add default_content_nl and seed
-- Dutch for the default ('') block set so the welcome email is fully
-- trilingual. Uses dollar-quoting to keep the multi-line text readable.
-- =============================================================

BEGIN;

ALTER TABLE onboarding_block_templates
  ADD COLUMN IF NOT EXISTS default_content_nl TEXT NOT NULL DEFAULT '';

-- Only seed rows that don't have Dutch yet, in the default set.
UPDATE onboarding_block_templates SET default_content_nl = $nl$Hey {{first_name}} 👋

Welkom in het team! Hier vind je alles om te starten bij VO Group.$nl$
  WHERE block_key = 'salutation' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$**{{email}}**

Microsoft 365 · Business Premium (Outlook, Teams, Word, Excel… het volledige pakket!)$nl$
  WHERE block_key = 'email_info' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Het staat klaar op een beveiligde link! Klik hieronder en gebruik je adres **{{personal_email}}** om het te ontgrendelen.$nl$
  WHERE block_key = 'password' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Je kleine overlevingsgids voor kantoor!

Ons kantoor bevindt zich in **Rue Haute 139/16 — 1000 Brussel**. Meld je bij aankomst aan bij de receptie: je toegangsbadge ligt klaar en wordt je op dag één overhandigd.

Openingsuren gebouw: **7u30 – 19u00**.$nl$
  WHERE block_key = 'building_info' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Snelle controle voordat we beginnen: voer een volledige antivirusscan uit op je computer en stuur me een screenshot van het resultaat. Niets ingewikkelds — gewoon om zeker te zijn dat alles clean is!

⚠️ Doe dit thuis op je eigen wifi, niet op het kantoornetwerk 😊$nl$
  WHERE block_key = 'it_security' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Goed nieuws: je Outlook-handtekening is al automatisch ingesteld. Weer iets minder om aan te denken!$nl$
  WHERE block_key = 'email_signature' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$De mappen en bestanden die je nodig hebt, worden per e-mail met je gedeeld. Hou je inbox in de gaten!$nl$
  WHERE block_key = 'sharepoint' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Teams is onze belangrijkste tool voor dagelijkse communicatie. Je bent toegevoegd aan de kanalen van je team ({{team}}).

Download de app op je computer en telefoon — zo mis je niets!$nl$
  WHERE block_key = 'teams' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Jouw centrale toegang voor elke IT-aanvraag: materiaal, toegang, functionele mailboxen, opvolging van je aanvragen — alles loopt via de hub.

Meld je aan met je VO Microsoft-account (**{{email}}**) — je hoeft er geen aan te maken.$nl$
  WHERE block_key = 'vo_hub' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Bij VO respecteren we je privacy. Dit korte formulier laat ons weten of je akkoord bent (of niet) om te verschijnen op onze foto's en communicatie. Het is verplicht, maar het duurt maar 30 seconden!

Van gedachten veranderd? Mail gewoon naar {{it_contact_email}}.$nl$
  WHERE block_key = 'image_rights' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$💡 Pro tip: ik heb een FAQ samengesteld die 90% van de dagelijkse IT-problemen oplost (koppige printers, VPN-perikelen…).$nl$
  WHERE block_key = 'faq_it' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Klik op de knop hieronder om de bron te openen.$nl$
  WHERE block_key = 'cta_link' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

UPDATE onboarding_block_templates SET default_content_nl = $nl$Dat is alles, je hebt alles wat je nodig hebt! 🔑

Ik ben bijna elke dag op kantoor, dus als je vragen hebt of ergens tegenaan loopt, kom langs of stuur me een bericht. Geen enkele vraag is te dom — beloofd!

Tot snel,$nl$
  WHERE block_key = 'closing' AND business_unit = '' AND COALESCE(default_content_nl, '') = '';

COMMIT;
