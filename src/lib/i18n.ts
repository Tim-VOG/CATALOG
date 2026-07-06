import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { adminEn, adminFr, adminNl } from './i18n-admin'
import { genEn, genFr, genNl } from './i18n-admin-generated'
import { userGenEn, userGenFr, userGenNl } from './i18n-user-generated'

// Phase-1 i18n: the high-traffic user-facing surface (nav, hub,
// profile, my-equipment, common actions). Admin strings stay in EN
// for now and get migrated into the `admin` namespace incrementally.
// Add a key here, use it via useTranslation()'s t('key'), done.
const en = {
  common: {
    save: 'Save', cancel: 'Cancel', close: 'Close', delete: 'Delete',
    edit: 'Edit', search: 'Search', loading: 'Loading…', back: 'Back',
    yes: 'Yes', no: 'No', confirm: 'Confirm', send: 'Send',
    available: 'Available', unavailable: 'Unavailable',
  },
  nav: {
    hub: 'Hub', catalog: 'Catalog', cart: 'Cart', profile: 'Profile',
    scan: 'Scan', myRequests: 'My requests', myEquipment: 'My equipment',
    admin: 'Admin', staff: 'Staff', backToHub: 'Back to Hub',
  },
  hub: {
    greetingMorning: 'Good morning', greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening', greetingNight: 'Good night',
    catalogTitle: 'Equipment Catalog',
    catalogDesc: 'Browse and request IT equipment for events or projects.',
    myEquipmentTitle: 'My equipment',
    myEquipmentDesc: "The devices currently in your hands — due dates, returns, problems.",
  },
  profile: {
    title: 'Profile', appearance: 'Appearance', theme: 'Theme',
    notifications: 'Notifications', language: 'Language', contact: 'Contact',
    switchToLight: 'Switch to Light', switchToDark: 'Switch to Dark',
    useDefault: 'Use default',
  },
  equipment: {
    title: 'My equipment', none: 'Nothing on loan',
    requestReturn: 'Request return', reportProblem: 'Report a problem',
    dueIn: '{{count}} d left', overdue: '{{count}} d overdue',
    whereToPickup: 'Where to pick up',
  },
  catalog: {
    inStock: 'In stock', outOfStock: 'Coming soon', backSoon: 'Back soon',
    availableFrom: 'Available from {{date}}', addToCart: 'Add to cart',
  },
  requestSent: {
    title: 'Request sent!',
    message: 'Your request has been sent successfully. You will receive a confirmation email shortly.',
    backToHub: 'Back to Hub',
    myRequests: 'View my requests',
  },
  welcome: {
    skip: 'Skip',
    next: 'Next',
    back: 'Back',
    finish: "Let's go",
    step1Title: 'Welcome to VO Hub, {{name}} 👋',
    step1Body: 'Your one-stop place for IT: request equipment, handle onboardings, offboardings and mailboxes — all in one place.',
    step2Title: 'Choose your language',
    step2Body: 'You can change it anytime from your profile.',
    step3Title: 'Light or dark?',
    step3Body: 'Pick the look that feels right — you can switch whenever you want.',
    themeLight: 'Light',
    themeDark: 'Dark',
    step4Title: "You're all set!",
    step4Body: 'Everything is ready. Welcome aboard — let’s explore the Hub.',
    discoverHub: 'Explore the Hub',
    featEquipment: 'Equipment',
    featOnboarding: 'Onboarding',
    featOffboarding: 'Offboarding',
    featMailbox: 'Mailbox',
  },
}

// French — the primary language for VO Group.
const fr = {
  common: {
    save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer', delete: 'Supprimer',
    edit: 'Modifier', search: 'Rechercher', loading: 'Chargement…', back: 'Retour',
    yes: 'Oui', no: 'Non', confirm: 'Confirmer', send: 'Envoyer',
    available: 'Disponible', unavailable: 'Indisponible',
  },
  nav: {
    hub: 'Accueil', catalog: 'Catalogue', cart: 'Panier', profile: 'Profil',
    scan: 'Scanner', myRequests: 'Mes demandes', myEquipment: 'Mon matériel',
    admin: 'Admin', staff: 'Staff', backToHub: "Retour à l'accueil",
  },
  hub: {
    greetingMorning: 'Bonjour', greetingAfternoon: 'Bon après-midi',
    greetingEvening: 'Bonsoir', greetingNight: 'Belle nuit',
    catalogTitle: 'Catalogue de matériel',
    catalogDesc: 'Parcourez et demandez du matériel IT pour vos events ou projets.',
    myEquipmentTitle: 'Mon matériel',
    myEquipmentDesc: 'Le matériel que tu as actuellement — échéances, retours, problèmes.',
  },
  profile: {
    title: 'Profil', appearance: 'Apparence', theme: 'Thème',
    notifications: 'Notifications', language: 'Langue', contact: 'Contact',
    switchToLight: 'Passer en clair', switchToDark: 'Passer en sombre',
    useDefault: 'Valeur par défaut',
  },
  equipment: {
    title: 'Mon matériel', none: 'Rien en prêt',
    requestReturn: 'Demander un retour', reportProblem: 'Signaler un problème',
    dueIn: '{{count}} j restants', overdue: '{{count}} j de retard',
    whereToPickup: 'Où récupérer',
  },
  catalog: {
    inStock: 'En stock', outOfStock: 'Bientôt', backSoon: 'Bientôt de retour',
    availableFrom: 'Dispo à partir du {{date}}', addToCart: 'Ajouter au panier',
  },
  requestSent: {
    title: 'Demande envoyée !',
    message: 'Votre demande a bien été envoyée. Vous recevrez un email de confirmation sous peu.',
    backToHub: "Retour à l'accueil",
    myRequests: 'Voir mes demandes',
  },
  welcome: {
    skip: 'Passer',
    next: 'Suivant',
    back: 'Retour',
    finish: 'C’est parti',
    step1Title: 'Bienvenue chez VO Hub, {{name}} 👋',
    step1Body: 'Ton point d’entrée unique pour l’IT : demander du matériel, gérer les arrivées, les départs et les boîtes mail — tout au même endroit.',
    step2Title: 'Choisis ta langue',
    step2Body: 'Tu peux la changer à tout moment depuis ton profil.',
    step3Title: 'Clair ou sombre ?',
    step3Body: 'Choisis l’apparence qui te convient — tu peux changer quand tu veux.',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    step4Title: 'Tout est prêt !',
    step4Body: 'Tout est configuré. Bienvenue à bord — on part découvrir le Hub.',
    discoverHub: 'Découvrir le Hub',
    featEquipment: 'Matériel',
    featOnboarding: 'Arrivées',
    featOffboarding: 'Départs',
    featMailbox: 'Boîte mail',
  },
}

// Dutch — for VO's NL-speaking colleagues.
const nl = {
  common: {
    save: 'Opslaan', cancel: 'Annuleren', close: 'Sluiten', delete: 'Verwijderen',
    edit: 'Bewerken', search: 'Zoeken', loading: 'Laden…', back: 'Terug',
    yes: 'Ja', no: 'Nee', confirm: 'Bevestigen', send: 'Verzenden',
    available: 'Beschikbaar', unavailable: 'Niet beschikbaar',
  },
  nav: {
    hub: 'Hub', catalog: 'Catalogus', cart: 'Winkelmand', profile: 'Profiel',
    scan: 'Scannen', myRequests: 'Mijn aanvragen', myEquipment: 'Mijn materiaal',
    admin: 'Admin', staff: 'Staff', backToHub: 'Terug naar Hub',
  },
  hub: {
    greetingMorning: 'Goedemorgen', greetingAfternoon: 'Goedemiddag',
    greetingEvening: 'Goedenavond', greetingNight: 'Goedenacht',
    catalogTitle: 'Materiaalcatalogus',
    catalogDesc: 'Blader door en vraag IT-materiaal aan voor events of projecten.',
    myEquipmentTitle: 'Mijn materiaal',
    myEquipmentDesc: 'De apparaten die je nu in handen hebt — vervaldata, retours, problemen.',
  },
  profile: {
    title: 'Profiel', appearance: 'Weergave', theme: 'Thema',
    notifications: 'Meldingen', language: 'Taal', contact: 'Contact',
    switchToLight: 'Naar licht thema', switchToDark: 'Naar donker thema',
    useDefault: 'Standaard gebruiken',
  },
  equipment: {
    title: 'Mijn materiaal', none: 'Niets in bruikleen',
    requestReturn: 'Retour aanvragen', reportProblem: 'Probleem melden',
    dueIn: 'nog {{count}} d', overdue: '{{count}} d te laat',
    whereToPickup: 'Waar ophalen',
  },
  catalog: {
    inStock: 'Op voorraad', outOfStock: 'Binnenkort', backSoon: 'Snel terug',
    availableFrom: 'Beschikbaar vanaf {{date}}', addToCart: 'Toevoegen aan winkelmand',
  },
  requestSent: {
    title: 'Aanvraag verzonden!',
    message: 'Uw aanvraag is succesvol verzonden. U ontvangt binnenkort een bevestigingsmail.',
    backToHub: 'Terug naar Hub',
    myRequests: 'Mijn aanvragen bekijken',
  },
  welcome: {
    skip: 'Overslaan',
    next: 'Volgende',
    back: 'Terug',
    finish: 'Aan de slag',
    step1Title: 'Welkom bij VO Hub, {{name}} 👋',
    step1Body: 'Jouw centrale plek voor IT: materiaal aanvragen, onboardings, offboardings en mailboxen beheren — allemaal op één plek.',
    step2Title: 'Kies je taal',
    step2Body: 'Je kunt dit altijd wijzigen via je profiel.',
    step3Title: 'Licht of donker?',
    step3Body: 'Kies de weergave die bij je past — je kunt altijd wisselen.',
    themeLight: 'Licht',
    themeDark: 'Donker',
    step4Title: 'Alles is klaar!',
    step4Body: 'Alles is ingesteld. Welkom aan boord — laten we de Hub verkennen.',
    discoverHub: 'Verken de Hub',
    featEquipment: 'Materiaal',
    featOnboarding: 'Onboarding',
    featOffboarding: 'Offboarding',
    featMailbox: 'Mailbox',
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...en, admin: { ...adminEn, ...genEn }, user: userGenEn } },
      fr: { translation: { ...fr, admin: { ...adminFr, ...genFr }, user: userGenFr } },
      nl: { translation: { ...nl, admin: { ...adminNl, ...genNl }, user: userGenNl } },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'nl'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vo-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
