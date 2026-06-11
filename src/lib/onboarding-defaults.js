/**
 * Fallback block templates used when the DB table is unavailable
 * (e.g. schema cache not reloaded after migration).
 * These mirror the seed data in 057_onboarding_real_content.sql.
 *
 * Content authored to match the real VO Group onboarding email
 * (warm, casual, FR-first — by Tim Leskens).
 */
export const DEFAULT_BLOCK_TEMPLATES = [
  {
    block_key: 'salutation',
    label_fr: 'Salutation',
    label_en: 'Greeting',
    default_content_fr: `Hey {{first_name}} 👋

Bienvenue dans l'équipe ! Voici tout ce qu'il te faut pour démarrer chez VO Group.`,
    default_content_en: `Hey {{first_name}} 👋

Welcome to the team! Here's everything you need to get started at VO Group.`,
    default_options: {},
    default_enabled: true,
    icon: 'Hand',
    sort_order: 1,
  },
  {
    block_key: 'email_info',
    label_fr: 'Ton adresse e-mail',
    label_en: 'Your email address',
    default_content_fr: `**{{email}}**

Microsoft 365 · Business Premium (Outlook, Teams, Word, Excel… la totale !)`,
    default_content_en: `**{{email}}**

Microsoft 365 · Business Premium (Outlook, Teams, Word, Excel… the full pack!)`,
    default_options: {},
    default_enabled: true,
    icon: 'Mail',
    sort_order: 2,
  },
  {
    block_key: 'password',
    label_fr: 'Ton mot de passe',
    label_en: 'Your password',
    default_content_fr: `Il t'attend sur un lien sécurisé ! Clique ci-dessous et utilise ton adresse **{{personal_email}}** pour le déverrouiller.`,
    default_content_en: `It's waiting for you on a secure link! Click below and use your address **{{personal_email}}** to unlock it.`,
    default_options: { url: '', label_fr: 'Récupérer mon mot de passe', label_en: 'Retrieve my password' },
    default_enabled: true,
    icon: 'KeyRound',
    sort_order: 3,
  },
  {
    block_key: 'building_info',
    label_fr: 'Jacqmotte Rules 🏢',
    label_en: 'Jacqmotte Rules 🏢',
    default_content_fr: `Le petit guide de survie au bureau !

Notre bureau est situé **Rue Haute 139/16 — 1000 Brussels**. À ton arrivée, présente-toi à la réception : ton badge d'accès sera prêt et te sera remis le premier jour.

Horaires d'ouverture du bâtiment : **7h30 – 19h00**.`,
    default_content_en: `Your little office survival guide!

Our office is at **Rue Haute 139/16 — 1000 Brussels**. On arrival, check in at the reception desk: your access badge will be ready and handed to you on day one.

Building hours: **7:30 AM – 7:00 PM**.`,
    default_options: {},
    default_enabled: true,
    icon: 'Building2',
    sort_order: 40,
  },
  {
    block_key: 'it_security',
    label_fr: 'Sécurité IT',
    label_en: 'IT Security',
    default_content_fr: `Petit check-up avant de commencer : lance un scan antivirus complet sur ton ordi et envoie-moi une capture d'écran du résultat. Rien de compliqué, juste histoire de s'assurer que tout est clean !

⚠️ Fais ça chez toi sur ton WiFi perso, pas sur le réseau du bureau 😊`,
    default_content_en: `Quick check-up before we get started: run a full antivirus scan on your computer and send me a screenshot of the result. Nothing complicated — just to make sure everything is clean!

⚠️ Do this from home on your personal WiFi, not on the office network 😊`,
    default_options: {},
    default_enabled: false,
    icon: 'Shield',
    sort_order: 50,
  },
  {
    block_key: 'email_signature',
    label_fr: 'Signature mail',
    label_en: 'Email signature',
    default_content_fr: `Bonne nouvelle : ta signature Outlook est déjà configurée automatiquement. Une chose de moins à faire !`,
    default_content_en: `Good news: your Outlook signature is already set up automatically. One less thing to worry about!`,
    default_options: {},
    default_enabled: false,
    icon: 'PenTool',
    sort_order: 60,
  },
  {
    block_key: 'sharepoint',
    label_fr: 'SharePoint',
    label_en: 'SharePoint',
    default_content_fr: `Les dossiers et fichiers dont tu auras besoin te seront partagés par mail. Keep an eye on your inbox !`,
    default_content_en: `The folders and files you need will be shared with you by email. Keep an eye on your inbox!`,
    default_options: { url: 'https://vogroup.sharepoint.com', label_fr: 'Ouvrir SharePoint', label_en: 'Open SharePoint' },
    default_enabled: false,
    icon: 'FolderOpen',
    sort_order: 70,
  },
  {
    block_key: 'teams',
    label_fr: 'Microsoft Teams',
    label_en: 'Microsoft Teams',
    default_content_fr: `Teams est notre outil principal pour discuter au quotidien. Tu as été ajouté aux canaux de ton équipe ({{team}}).

Télécharge l'app sur ton ordi et ton tel — comme ça tu rates rien !`,
    default_content_en: `Teams is our main day-to-day chat tool. You've been added to your team's channels ({{team}}).

Download the app on your computer and phone — that way you won't miss a thing!`,
    default_options: { url: 'https://teams.microsoft.com', label_fr: 'Ouvrir Teams', label_en: 'Open Teams' },
    default_enabled: true,
    icon: 'MessageSquare',
    sort_order: 80,
  },
  {
    block_key: 'vo_hub',
    label_fr: 'Le VO Hub',
    label_en: 'The VO Hub',
    default_content_fr: `Ta porte d'entrée pour toutes les demandes IT : équipement, accès, mailbox fonctionnelles, suivi de tes demandes — tout passe par le hub.

Connecte-toi avec ton compte Microsoft VO (**{{email}}**) — pas besoin de créer un compte.`,
    default_content_en: `Your one-stop entry for every IT request: equipment, access, functional mailboxes, request tracking — it all goes through the hub.

Sign in with your VO Microsoft account (**{{email}}**) — no need to create one.`,
    default_options: { url: 'https://catalog-mu-sage.vercel.app/', label_fr: 'Ouvrir le VO Hub', label_en: 'Open the VO Hub' },
    default_enabled: true,
    icon: 'Sparkles',
    sort_order: 85,
  },
  {
    block_key: 'wifi',
    label_fr: 'WiFi — Les codes magiques',
    label_en: 'WiFi — The magic codes',
    default_content_fr: ``,
    default_content_en: ``,
    default_options: {
      computer_network: 'VO – Jacqmotte',
      computer_password: 'Stalle2Jacq#2024',
      phone_network: 'VO Smart',
      phone_password: 'Jacq#139',
    },
    default_enabled: true,
    icon: 'Wifi',
    sort_order: 90,
  },
  {
    block_key: 'image_rights',
    label_fr: "Droit à l'image",
    label_en: 'Image rights',
    default_content_fr: `Chez VO, on respecte ta vie privée. Ce petit formulaire nous permet de savoir si tu es OK (ou pas) pour apparaître sur nos photos et communications. C'est obligatoire, mais ça prend 30 secondes !

Tu changes d'avis plus tard ? Envoie un mail à {{it_contact_email}}.`,
    default_content_en: `At VO we respect your privacy. This short form lets us know whether you're OK (or not) with appearing in our photos and communications. It's required, but it only takes 30 seconds!

Change your mind later? Just email {{it_contact_email}}.`,
    default_options: { url: '', label_fr: 'Remplir le formulaire', label_en: 'Fill in the form' },
    default_enabled: false,
    icon: 'Camera',
    sort_order: 100,
  },
  {
    block_key: 'faq_it',
    label_fr: 'FAQ IT',
    label_en: 'IT FAQ',
    default_content_fr: `💡 Pro tip : j'ai compilé une FAQ qui répond à 90% des soucis IT du quotidien (imprimantes capricieuses, VPN qui fait des siennes…).`,
    default_content_en: `💡 Pro tip: I've put together a FAQ that solves 90% of daily IT issues (moody printers, VPN drama…).`,
    default_options: { url: '', label_fr: 'Voir la FAQ IT', label_en: 'See the IT FAQ' },
    default_enabled: false,
    icon: 'HelpCircle',
    sort_order: 110,
  },
  {
    block_key: 'cta_link',
    label_fr: 'Lien CTA',
    label_en: 'CTA Link',
    default_content_fr: 'Clique sur le bouton ci-dessous pour accéder à la ressource.',
    default_content_en: 'Click the button below to access the resource.',
    default_options: { url: 'https://', label_fr: 'Accéder', label_en: 'Access' },
    default_enabled: false,
    icon: 'ExternalLink',
    sort_order: 120,
  },
  {
    block_key: 'closing',
    label_fr: 'Conclusion',
    label_en: 'Closing',
    default_content_fr: `Voilà, tu as toutes les clés en main ! 🔑

Je suis au bureau quasi tous les jours, donc si tu as la moindre question ou un truc qui coince, passe me voir ou envoie-moi un message. Pas de question bête, promis !

À demain,`,
    default_content_en: `That's it, you've got everything you need! 🔑

I'm at the office almost every day, so if you have any questions or run into anything, come by or drop me a message. No question is a silly question — promise!

See you soon,`,
    default_options: {},
    default_enabled: true,
    icon: 'CheckCircle',
    sort_order: 130,
  },
  {
    block_key: 'signature_admin',
    label_fr: 'Signature expéditeur',
    label_en: 'Sender signature',
    default_content_fr: ``,
    default_content_en: ``,
    default_options: {},
    default_enabled: true,
    icon: 'Signature',
    sort_order: 140,
  },
]
