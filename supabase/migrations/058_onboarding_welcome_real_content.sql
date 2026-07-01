-- ============================================
-- MIGRATION 058: Rewrite onboarding_welcome template
-- Authentic VO Group voice (Tim Leskens style).
-- ============================================

UPDATE email_templates SET
    subject = 'Bienvenue chez VO Group, {{first_name}} 👋',
    body = E'Hey {{first_name}} 👋\n\nBienvenue dans l''équipe ! Voici tout ce qu''il te faut pour démarrer chez VO Group.\n\n**TON ADRESSE E-MAIL**\n{{email}}\nMicrosoft 365 · Business Premium (Outlook, Teams, Word, Excel… la totale !)\n\n**TON MOT DE PASSE**\nIl t''attend sur un lien sécurisé ! Clique ci-dessous et utilise ton adresse **{{personal_email}}** pour le déverrouiller.\n\n{{cta:Récupérer mon mot de passe|{{password_url}}}}\n\n**JACQMOTTE RULES 🏢**\nNotre bureau : **Rue Haute 139/16 — 1000 Brussels**. À ton arrivée, présente-toi à la réception : ton badge sera prêt et te sera remis le premier jour. Horaires : **7h30 – 19h00**.\n\n**SÉCURITÉ IT 🔒**\nPetit check-up avant de commencer : lance un scan antivirus complet sur ton ordi et envoie-moi une capture du résultat. ⚠️ Fais ça chez toi sur ton WiFi perso, pas sur le réseau du bureau 😊\n\n**WIFI — LES CODES MAGIQUES 📶**\n💻 Sur ton ordi : Réseau **VO – Jacqmotte** / MDP `Stalle2Jacq#2024`\n📱 Sur ton smartphone : Réseau **VO Smart** / MDP `Jacq#139`\n\n**DROIT À L''IMAGE 📸**\nChez VO, on respecte ta vie privée. Ce petit formulaire nous permet de savoir si tu es OK pour apparaître sur nos photos. C''est obligatoire, mais ça prend 30 secondes !\n\n{{cta:Remplir le formulaire|{{image_rights_url}}}}\n\n💡 **Pro tip** : j''ai compilé une FAQ qui répond à 90% des soucis IT du quotidien (imprimantes capricieuses, VPN qui fait des siennes…).\n\nVoilà, tu as toutes les clés en main ! 🔑\n\nJe suis au bureau quasi tous les jours, donc si tu as la moindre question ou un truc qui coince, passe me voir ou envoie-moi un message. Pas de question bête, promis !\n\nÀ demain,\nL''équipe {{app_name}}',
    description = 'Single-email welcome (condensed version of the block-based composer)',
    category = 'onboarding',
    is_active = true
WHERE template_key = 'onboarding_welcome';
