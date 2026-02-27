-- Migration 020: Onboarding email hub tables

-- 1. Recipients table
CREATE TABLE IF NOT EXISTS onboarding_recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    team VARCHAR(255) DEFAULT '',
    department VARCHAR(255) DEFAULT '',
    start_date DATE,
    language VARCHAR(2) NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
    custom_links JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_onboarding_recipients_updated_at
    BEFORE UPDATE ON onboarding_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Block templates (12 types, seeded below)
CREATE TABLE IF NOT EXISTS onboarding_block_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    block_key VARCHAR(100) UNIQUE NOT NULL,
    label_fr VARCHAR(255) NOT NULL,
    label_en VARCHAR(255) NOT NULL,
    default_content_fr TEXT NOT NULL DEFAULT '',
    default_content_en TEXT NOT NULL DEFAULT '',
    default_options JSONB DEFAULT '{}',
    icon VARCHAR(50) DEFAULT 'FileText',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Onboarding emails
CREATE TABLE IF NOT EXISTS onboarding_emails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_id UUID REFERENCES onboarding_recipients(id) ON DELETE SET NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    language VARCHAR(2) NOT NULL DEFAULT 'fr',
    subject VARCHAR(500) NOT NULL DEFAULT '',
    blocks_config JSONB NOT NULL DEFAULT '[]',
    rendered_html TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_onboarding_emails_updated_at
    BEFORE UPDATE ON onboarding_emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: admin-only for all 3 tables
ALTER TABLE onboarding_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_block_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage onboarding recipients" ON onboarding_recipients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can view block templates" ON onboarding_block_templates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage block templates" ON onboarding_block_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage onboarding emails" ON onboarding_emails
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed the 12 block types
INSERT INTO onboarding_block_templates (block_key, label_fr, label_en, default_content_fr, default_content_en, default_options, icon, sort_order) VALUES
(
    'salutation',
    'Salutation',
    'Greeting',
    'Bonjour {{first_name}},

Bienvenue chez VO Group ! Nous sommes ravis de vous accueillir dans notre equipe. Votre premier jour est prevu le {{start_date}}.

Voici les informations essentielles pour bien demarrer.',
    'Hello {{first_name}},

Welcome to VO Group! We are delighted to welcome you to our team. Your first day is scheduled for {{start_date}}.

Here is the essential information to get you started.',
    '{}',
    'Hand',
    1
),
(
    'email_info',
    'Informations email',
    'Email Information',
    'Votre adresse email professionnelle est : {{email}}

Vous pouvez acceder a votre boite mail via Outlook ou sur https://outlook.office.com. Votre mot de passe temporaire vous sera communique separement par le service IT.',
    'Your professional email address is: {{email}}

You can access your mailbox via Outlook or at https://outlook.office.com. Your temporary password will be communicated separately by the IT department.',
    '{}',
    'Mail',
    2
),
(
    'building_info',
    'Informations batiment',
    'Building Information',
    'Notre bureau est situe au VO Group. A votre arrivee, presentez-vous a la reception. Votre badge d''acces sera pret et vous sera remis le premier jour.

Horaires d''ouverture du batiment : 7h30 - 19h00.',
    'Our office is located at VO Group. Upon arrival, please check in at the reception desk. Your access badge will be ready and handed to you on your first day.

Building opening hours: 7:30 AM - 7:00 PM.',
    '{"building_address": "", "reception_phone": ""}',
    'Building2',
    3
),
(
    'it_security',
    'Securite IT',
    'IT Security',
    'Quelques regles importantes de securite informatique :

- Ne partagez jamais vos identifiants de connexion
- Verrouillez votre poste lorsque vous vous absentez (Windows + L)
- Signalez tout email suspect au service IT
- Utilisez uniquement les logiciels approuves par l''entreprise
- Activez l''authentification multi-facteurs (MFA) sur tous vos comptes',
    'A few important IT security rules:

- Never share your login credentials
- Lock your workstation when you step away (Windows + L)
- Report any suspicious emails to the IT department
- Only use company-approved software
- Enable multi-factor authentication (MFA) on all your accounts',
    '{}',
    'Shield',
    4
),
(
    'email_signature',
    'Signature email',
    'Email Signature',
    'Votre signature email a ete configuree automatiquement. Verifiez qu''elle contient les informations correctes :

Nom : {{first_name}} {{last_name}}
Equipe : {{team}}
Departement : {{department}}

Si des modifications sont necessaires, contactez le service IT.',
    'Your email signature has been automatically configured. Please verify that it contains the correct information:

Name: {{first_name}} {{last_name}}
Team: {{team}}
Department: {{department}}

If any changes are needed, contact the IT department.',
    '{}',
    'PenTool',
    5
),
(
    'sharepoint',
    'SharePoint',
    'SharePoint',
    'Vous avez acces a notre espace SharePoint ou vous trouverez :

- Les documents partages de votre equipe
- Les procedures internes
- Les templates de documents officiels

Accedez a SharePoint via le lien ci-dessous.',
    'You have access to our SharePoint space where you will find:

- Shared documents for your team
- Internal procedures
- Official document templates

Access SharePoint via the link below.',
    '{"url": "https://vogroup.sharepoint.com", "label_fr": "Ouvrir SharePoint", "label_en": "Open SharePoint"}',
    'FolderOpen',
    6
),
(
    'teams',
    'Microsoft Teams',
    'Microsoft Teams',
    'Microsoft Teams est notre outil principal de communication. Vous avez ete ajoute aux canaux de votre equipe ({{team}}).

Telechargez l''application Teams sur votre poste et votre telephone pour rester connecte.',
    'Microsoft Teams is our main communication tool. You have been added to your team channels ({{team}}).

Download the Teams application on your computer and phone to stay connected.',
    '{"url": "https://teams.microsoft.com", "label_fr": "Ouvrir Teams", "label_en": "Open Teams"}',
    'MessageSquare',
    7
),
(
    'wifi',
    'WiFi',
    'WiFi',
    'Pour vous connecter au reseau WiFi de l''entreprise :

Reseau : VO-Corporate
Le mot de passe vous sera communique par le service IT a votre arrivee.

Pour les visiteurs, utilisez le reseau VO-Guest.',
    'To connect to the company WiFi network:

Network: VO-Corporate
The password will be provided by the IT department upon your arrival.

For visitors, use the VO-Guest network.',
    '{"network_name": "VO-Corporate", "guest_network": "VO-Guest"}',
    'Wifi',
    8
),
(
    'image_rights',
    'Droit a l''image',
    'Image Rights',
    'Dans le cadre de la communication interne et externe, nous pourrions etre amenes a utiliser votre image (photos, videos). Un formulaire de consentement vous sera present le premier jour.

Vous etes libre d''accepter ou de refuser, cela n''affectera en rien votre travail.',
    'For internal and external communications, we may use your image (photos, videos). A consent form will be presented to you on your first day.

You are free to accept or decline — this will not affect your work in any way.',
    '{}',
    'Camera',
    9
),
(
    'faq_it',
    'FAQ IT',
    'IT FAQ',
    'Questions frequentes :

Q: Comment reinitialiser mon mot de passe ?
R: Rendez-vous sur https://passwordreset.microsoftonline.com

Q: Mon ecran ne s''allume pas, que faire ?
R: Verifiez les branchements et contactez le support IT.

Q: Comment installer une imprimante ?
R: Suivez le guide disponible sur SharePoint > IT > Imprimantes.

Pour toute autre question, contactez le support IT.',
    'Frequently asked questions:

Q: How do I reset my password?
A: Go to https://passwordreset.microsoftonline.com

Q: My screen won''t turn on, what should I do?
A: Check the connections and contact IT support.

Q: How do I install a printer?
A: Follow the guide available on SharePoint > IT > Printers.

For any other questions, contact IT support.',
    '{"support_email": "it-support@vo-group.be"}',
    'HelpCircle',
    10
),
(
    'cta_link',
    'Lien CTA',
    'CTA Link',
    'Cliquez sur le bouton ci-dessous pour acceder a la ressource.',
    'Click the button below to access the resource.',
    '{"url": "https://", "label_fr": "Acceder", "label_en": "Access"}',
    'ExternalLink',
    11
),
(
    'closing',
    'Conclusion',
    'Closing',
    'Nous avons hate de travailler avec vous ! Si vous avez des questions avant votre premier jour, n''hesitez pas a nous contacter.

A tres bientot,
L''equipe VO Group',
    'We look forward to working with you! If you have any questions before your first day, please don''t hesitate to reach out.

See you soon,
The VO Group Team',
    '{}',
    'CheckCircle',
    12
);
