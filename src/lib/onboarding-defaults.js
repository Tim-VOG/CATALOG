/**
 * Fallback block templates used when the DB table is unavailable
 * (e.g. schema cache not reloaded after migration).
 * These mirror the seed data in 020_onboarding_tables.sql.
 */
export const DEFAULT_BLOCK_TEMPLATES = [
  {
    block_key: 'salutation',
    label_fr: 'Salutation',
    label_en: 'Greeting',
    default_content_fr: `Bonjour {{first_name}},

Bienvenue chez VO Group ! Nous sommes ravis de vous accueillir dans notre equipe. Votre premier jour est prevu le {{start_date}}.

Voici les informations essentielles pour bien demarrer.`,
    default_content_en: `Hello {{first_name}},

Welcome to VO Group! We are delighted to welcome you to our team. Your first day is scheduled for {{start_date}}.

Here is the essential information to get you started.`,
    default_options: {},
    icon: 'Hand',
    sort_order: 1,
  },
  {
    block_key: 'email_info',
    label_fr: 'Informations email',
    label_en: 'Email Information',
    default_content_fr: `Votre adresse email professionnelle est : {{email}}

Vous pouvez acceder a votre boite mail via Outlook ou sur https://outlook.office.com. Votre mot de passe temporaire vous sera communique separement par le service IT.`,
    default_content_en: `Your professional email address is: {{email}}

You can access your mailbox via Outlook or at https://outlook.office.com. Your temporary password will be communicated separately by the IT department.`,
    default_options: {},
    icon: 'Mail',
    sort_order: 2,
  },
  {
    block_key: 'building_info',
    label_fr: 'Informations batiment',
    label_en: 'Building Information',
    default_content_fr: `Notre bureau est situe au VO Group. A votre arrivee, presentez-vous a la reception. Votre badge d'acces sera pret et vous sera remis le premier jour.

Horaires d'ouverture du batiment : 7h30 - 19h00.`,
    default_content_en: `Our office is located at VO Group. Upon arrival, please check in at the reception desk. Your access badge will be ready and handed to you on your first day.

Building opening hours: 7:30 AM - 7:00 PM.`,
    default_options: { building_address: '', reception_phone: '' },
    icon: 'Building2',
    sort_order: 3,
  },
  {
    block_key: 'it_security',
    label_fr: 'Securite IT',
    label_en: 'IT Security',
    default_content_fr: `Quelques regles importantes de securite informatique :

- Ne partagez jamais vos identifiants de connexion
- Verrouillez votre poste lorsque vous vous absentez (Windows + L)
- Signalez tout email suspect au service IT
- Utilisez uniquement les logiciels approuves par l'entreprise
- Activez l'authentification multi-facteurs (MFA) sur tous vos comptes`,
    default_content_en: `A few important IT security rules:

- Never share your login credentials
- Lock your workstation when you step away (Windows + L)
- Report any suspicious emails to the IT department
- Only use company-approved software
- Enable multi-factor authentication (MFA) on all your accounts`,
    default_options: {},
    icon: 'Shield',
    sort_order: 4,
  },
  {
    block_key: 'email_signature',
    label_fr: 'Signature email',
    label_en: 'Email Signature',
    default_content_fr: `Votre signature email a ete configuree automatiquement. Verifiez qu'elle contient les informations correctes :

Nom : {{first_name}} {{last_name}}
Equipe : {{team}}
Departement : {{department}}

Si des modifications sont necessaires, contactez le service IT.`,
    default_content_en: `Your email signature has been automatically configured. Please verify that it contains the correct information:

Name: {{first_name}} {{last_name}}
Team: {{team}}
Department: {{department}}

If any changes are needed, contact the IT department.`,
    default_options: {},
    icon: 'PenTool',
    sort_order: 5,
  },
  {
    block_key: 'sharepoint',
    label_fr: 'SharePoint',
    label_en: 'SharePoint',
    default_content_fr: `Vous avez acces a notre espace SharePoint ou vous trouverez :

- Les documents partages de votre equipe
- Les procedures internes
- Les templates de documents officiels

Accedez a SharePoint via le lien ci-dessous.`,
    default_content_en: `You have access to our SharePoint space where you will find:

- Shared documents for your team
- Internal procedures
- Official document templates

Access SharePoint via the link below.`,
    default_options: { url: 'https://vogroup.sharepoint.com', label_fr: 'Ouvrir SharePoint', label_en: 'Open SharePoint' },
    icon: 'FolderOpen',
    sort_order: 6,
  },
  {
    block_key: 'teams',
    label_fr: 'Microsoft Teams',
    label_en: 'Microsoft Teams',
    default_content_fr: `Microsoft Teams est notre outil principal de communication. Vous avez ete ajoute aux canaux de votre equipe ({{team}}).

Telechargez l'application Teams sur votre poste et votre telephone pour rester connecte.`,
    default_content_en: `Microsoft Teams is our main communication tool. You have been added to your team channels ({{team}}).

Download the Teams application on your computer and phone to stay connected.`,
    default_options: { url: 'https://teams.microsoft.com', label_fr: 'Ouvrir Teams', label_en: 'Open Teams' },
    icon: 'MessageSquare',
    sort_order: 7,
  },
  {
    block_key: 'wifi',
    label_fr: 'WiFi',
    label_en: 'WiFi',
    default_content_fr: `Pour vous connecter au reseau WiFi de l'entreprise :

Reseau : VO-Corporate
Le mot de passe vous sera communique par le service IT a votre arrivee.

Pour les visiteurs, utilisez le reseau VO-Guest.`,
    default_content_en: `To connect to the company WiFi network:

Network: VO-Corporate
The password will be provided by the IT department upon your arrival.

For visitors, use the VO-Guest network.`,
    default_options: { network_name: 'VO-Corporate', guest_network: 'VO-Guest' },
    icon: 'Wifi',
    sort_order: 8,
  },
  {
    block_key: 'image_rights',
    label_fr: "Droit a l'image",
    label_en: 'Image Rights',
    default_content_fr: `Dans le cadre de la communication interne et externe, nous pourrions etre amenes a utiliser votre image (photos, videos). Un formulaire de consentement vous sera present le premier jour.

Vous etes libre d'accepter ou de refuser, cela n'affectera en rien votre travail.`,
    default_content_en: `For internal and external communications, we may use your image (photos, videos). A consent form will be presented to you on your first day.

You are free to accept or decline — this will not affect your work in any way.`,
    default_options: {},
    icon: 'Camera',
    sort_order: 9,
  },
  {
    block_key: 'faq_it',
    label_fr: 'FAQ IT',
    label_en: 'IT FAQ',
    default_content_fr: `Questions frequentes :

Q: Comment reinitialiser mon mot de passe ?
R: Rendez-vous sur https://passwordreset.microsoftonline.com

Q: Mon ecran ne s'allume pas, que faire ?
R: Verifiez les branchements et contactez le support IT.

Q: Comment installer une imprimante ?
R: Suivez le guide disponible sur SharePoint > IT > Imprimantes.

Pour toute autre question, contactez le support IT.`,
    default_content_en: `Frequently asked questions:

Q: How do I reset my password?
A: Go to https://passwordreset.microsoftonline.com

Q: My screen won't turn on, what should I do?
A: Check the connections and contact IT support.

Q: How do I install a printer?
A: Follow the guide available on SharePoint > IT > Printers.

For any other questions, contact IT support.`,
    default_options: { support_email: 'it-support@vo-group.be' },
    icon: 'HelpCircle',
    sort_order: 10,
  },
  {
    block_key: 'cta_link',
    label_fr: 'Lien CTA',
    label_en: 'CTA Link',
    default_content_fr: "Cliquez sur le bouton ci-dessous pour acceder a la ressource.",
    default_content_en: 'Click the button below to access the resource.',
    default_options: { url: 'https://', label_fr: 'Acceder', label_en: 'Access' },
    icon: 'ExternalLink',
    sort_order: 11,
  },
  {
    block_key: 'closing',
    label_fr: 'Conclusion',
    label_en: 'Closing',
    default_content_fr: `Nous avons hate de travailler avec vous ! Si vous avez des questions avant votre premier jour, n'hesitez pas a nous contacter.

A tres bientot,
L'equipe VO Group`,
    default_content_en: `We look forward to working with you! If you have any questions before your first day, please don't hesitate to reach out.

See you soon,
The VO Group Team`,
    default_options: {},
    icon: 'CheckCircle',
    sort_order: 12,
  },
]
