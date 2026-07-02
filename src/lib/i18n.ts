import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

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
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      nl: { translation: nl },
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
