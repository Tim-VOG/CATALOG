-- ============================================
-- MIGRATION 057: Onboarding email — real VO Group content
-- Replace generic block defaults with the authentic
-- Tim Leskens onboarding email content; add `password`
-- and `signature_admin` blocks.
-- ============================================

-- Wipe existing block defaults so reseed is clean
DELETE FROM onboarding_block_templates;

INSERT INTO onboarding_block_templates (block_key, label_fr, label_en, default_content_fr, default_content_en, default_options, icon, sort_order) VALUES

-- 1. Salutation
(
  'salutation', 'Salutation', 'Greeting',
  E'Hey {{first_name}} 👋\n\nBienvenue dans l''équipe ! Voici tout ce qu''il te faut pour démarrer chez VO Group.',
  E'Hey {{first_name}} 👋\n\nWelcome to the team! Here''s everything you need to get started at VO Group.',
  '{}'::jsonb,
  'Hand', 1
),

-- 2. Email Info
(
  'email_info', 'Ton adresse e-mail', 'Your email address',
  E'**{{email}}**\n\nMicrosoft 365 · Business Premium (Outlook, Teams, Word, Excel… la totale !)',
  E'**{{email}}**\n\nMicrosoft 365 · Business Premium (Outlook, Teams, Word, Excel… the full pack!)',
  '{}'::jsonb,
  'Mail', 2
),

-- 3. Password (NEW)
(
  'password', 'Ton mot de passe', 'Your password',
  E'Il t''attend sur un lien sécurisé ! Clique ci-dessous et utilise ton adresse **{{personal_email}}** pour le déverrouiller.',
  E'It''s waiting for you on a secure link! Click below and use your address **{{personal_email}}** to unlock it.',
  '{"url":"","label_fr":"Récupérer mon mot de passe","label_en":"Retrieve my password"}'::jsonb,
  'KeyRound', 3
),

-- 4. Building Info
(
  'building_info', 'Jacqmotte Rules 🏢', 'Jacqmotte Rules 🏢',
  E'Le petit guide de survie au bureau !\n\nNotre bureau est situé **Rue Haute 139/16 — 1000 Brussels**. À ton arrivée, présente-toi à la réception : ton badge d''accès sera prêt et te sera remis le premier jour.\n\nHoraires d''ouverture du bâtiment : **7h30 – 19h00**.',
  E'Your little office survival guide!\n\nOur office is at **Rue Haute 139/16 — 1000 Brussels**. On arrival, check in at the reception desk: your access badge will be ready and handed to you on day one.\n\nBuilding hours: **7:30 AM – 7:00 PM**.',
  '{}'::jsonb,
  'Building2', 4
),

-- 5. IT Security
(
  'it_security', 'Sécurité IT', 'IT Security',
  E'Petit check-up avant de commencer : lance un scan antivirus complet sur ton ordi et envoie-moi une capture d''écran du résultat. Rien de compliqué, juste histoire de s''assurer que tout est clean !\n\n⚠️ Fais ça chez toi sur ton WiFi perso, pas sur le réseau du bureau 😊',
  E'Quick check-up before we get started: run a full antivirus scan on your computer and send me a screenshot of the result. Nothing complicated — just to make sure everything is clean!\n\n⚠️ Do this from home on your personal WiFi, not on the office network 😊',
  '{}'::jsonb,
  'Shield', 5
),

-- 6. Email Signature
(
  'email_signature', 'Signature mail', 'Email signature',
  E'Bonne nouvelle : ta signature Outlook est déjà configurée automatiquement. Une chose de moins à faire !',
  E'Good news: your Outlook signature is already set up automatically. One less thing to worry about!',
  '{}'::jsonb,
  'PenTool', 6
),

-- 7. SharePoint
(
  'sharepoint', 'SharePoint', 'SharePoint',
  E'Les dossiers et fichiers dont tu auras besoin te seront partagés par mail. Keep an eye on your inbox !',
  E'The folders and files you need will be shared with you by email. Keep an eye on your inbox!',
  '{"url":"https://vogroup.sharepoint.com","label_fr":"Ouvrir SharePoint","label_en":"Open SharePoint"}'::jsonb,
  'FolderOpen', 7
),

-- 8. Teams
(
  'teams', 'Microsoft Teams', 'Microsoft Teams',
  E'Teams est notre outil principal pour discuter au quotidien. Tu as été ajouté aux canaux de ton équipe ({{team}}).\n\nTélécharge l''app sur ton ordi et ton tel — comme ça tu rates rien !',
  E'Teams is our main day-to-day chat tool. You''ve been added to your team''s channels ({{team}}).\n\nDownload the app on your computer and phone — that way you won''t miss a thing!',
  '{"url":"https://teams.microsoft.com","label_fr":"Ouvrir Teams","label_en":"Open Teams"}'::jsonb,
  'MessageSquare', 8
),

-- 9. WiFi (two-column hardcoded codes)
(
  'wifi', 'WiFi — Les codes magiques', 'WiFi — The magic codes',
  E'', E'',
  '{"computer_network":"VO – Jacqmotte","computer_password":"Stalle2Jacq#2024","phone_network":"VO Smart","phone_password":"Jacq#139"}'::jsonb,
  'Wifi', 9
),

-- 10. Image Rights
(
  'image_rights', 'Droit à l''image', 'Image rights',
  E'Chez VO, on respecte ta vie privée. Ce petit formulaire nous permet de savoir si tu es OK (ou pas) pour apparaître sur nos photos et communications. C''est obligatoire, mais ça prend 30 secondes !\n\nTu changes d''avis plus tard ? Envoie un mail à {{it_contact_email}}.',
  E'At VO we respect your privacy. This short form lets us know whether you''re OK (or not) with appearing in our photos and communications. It''s required, but it only takes 30 seconds!\n\nChange your mind later? Just email {{it_contact_email}}.',
  '{"url":"","label_fr":"Remplir le formulaire","label_en":"Fill in the form"}'::jsonb,
  'Camera', 10
),

-- 11. FAQ IT
(
  'faq_it', 'FAQ IT', 'IT FAQ',
  E'💡 Pro tip : j''ai compilé une FAQ qui répond à 90% des soucis IT du quotidien (imprimantes capricieuses, VPN qui fait des siennes…).',
  E'💡 Pro tip: I''ve put together a FAQ that solves 90% of daily IT issues (moody printers, VPN drama…).',
  '{"url":"","label_fr":"Voir la FAQ IT","label_en":"See the IT FAQ"}'::jsonb,
  'HelpCircle', 11
),

-- 12. CTA Link (generic, disabled by default)
(
  'cta_link', 'Lien CTA', 'CTA Link',
  E'Clique sur le bouton ci-dessous pour accéder à la ressource.',
  E'Click the button below to access the resource.',
  '{"url":"https://","label_fr":"Accéder","label_en":"Access"}'::jsonb,
  'ExternalLink', 12
),

-- 13. Closing
(
  'closing', 'Conclusion', 'Closing',
  E'Voilà, tu as toutes les clés en main ! 🔑\n\nJe suis au bureau quasi tous les jours, donc si tu as la moindre question ou un truc qui coince, passe me voir ou envoie-moi un message. Pas de question bête, promis !\n\nÀ demain,',
  E'That''s it, you''ve got everything you need! 🔑\n\nI''m at the office almost every day, so if you have any questions or run into anything, come by or drop me a message. No question is a silly question — promise!\n\nSee you soon,',
  '{}'::jsonb,
  'CheckCircle', 13
),

-- 14. Signature admin (NEW — pulled from sender profile at render time)
(
  'signature_admin', 'Signature expéditeur', 'Sender signature',
  E'', E'',
  '{}'::jsonb,
  'Signature', 14
);
