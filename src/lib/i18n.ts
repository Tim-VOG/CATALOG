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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'vo-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
