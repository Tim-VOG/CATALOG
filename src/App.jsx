// ============================================
// EQUIPLEND - TOUS LES TEXTES À MODIFIER ICI
// ============================================

export const CONTENT = {
  
  // === NOM DE L'APPLICATION ===
  appName: "EquipLend",
  
  // === PAGE DE CONNEXION ===
  login: {
    title: "Sign In",
    titleSignUp: "Sign Up",
    subtitle: "Access EquipLend",
    subtitleSignUp: "Create your account",
    emailLabel: "Email",
    passwordLabel: "Password",
    firstNameLabel: "First Name",
    lastNameLabel: "Last Name",
    buttonSignIn: "Sign In",
    buttonSignUp: "Sign Up",
    toggleToSignUp: "Don't have an account? Sign Up",
    toggleToSignIn: "Already have an account? Sign In",
    loading: "Loading...",
  },

  // === NAVIGATION ===
  nav: {
    catalog: "Catalog",
    cart: "Cart",
    admin: "Admin",
  },

  // === CATALOGUE ===
  catalog: {
    title: "Equipment Catalog",
    subtitle: "Browse and reserve equipment",
    searchPlaceholder: "Search...",
    allCategories: "All",
    available: "available",
    buttonAdd: "Add",
    buttonConfigure: "Configure",
    noResults: "No equipment found",
    wifiOnly: "WiFi only - No 4G/5G",
    printerInfo: "B&W Laser - Print only",
  },

  // === PANIER ===
  cart: {
    title: "Your Cart",
    empty: "Your cart is empty",
    sectionItems: "Selected Items",
    sectionDates: "Loan Period",
    sectionInfo: "Your Information",
    pickupDate: "Pickup Date",
    returnDate: "Return Date",
    notes: "Notes",
    notesPlaceholder: "Purpose of loan...",
    submitButton: "Submit Request",
    submitting: "Submitting...",
    requestingAs: "Requesting as:",
    notAvailable: "Some items not available",
  },

  // === CONFIGURATION PRODUIT ===
  config: {
    title: "Configure:",
    accessories: "Accessories",
    keyboard: "Keyboard",
    mouse: "Mouse",
    software: "Software",
    officeSuite: "Microsoft Office Suite",
    otherSoftware: "Other software",
    otherPlaceholder: "Specify software...",
    subscription: "Subscription Plan",
    subscriptionType: "Type",
    callOnly: "Call only",
    dataOnly: "Data only",
    callAndData: "Call + Data",
    selectPlan: "Select Plan",
    appsTitle: "Apps to Pre-install",
    appsPlaceholder: "List apps...",
    included: "Included",
    buttonCancel: "Cancel",
    buttonAdd: "Add to Cart",
  },

  // === ADMIN - MENU ===
  admin: {
    title: "Administration",
    menuProducts: "Products",
    menuRequests: "Requests",
    menuReturns: "Returns",
    backToCatalog: "Back to catalog",
    signOut: "Sign out",
  },

  // === ADMIN - PRODUITS ===
  products: {
    title: "Product Management",
    buttonAdd: "Add Product",
    tableProduct: "Product",
    tableCategory: "Category",
    tableStock: "Stock",
    tableActions: "Actions",
    buttonEdit: "Edit",
    buttonDelete: "Delete",
    formTitle: "Add Product",
    formTitleEdit: "Edit Product",
    formName: "Name",
    formCategory: "Category",
    formSubType: "Sub-type",
    formImage: "Image URL",
    formStock: "Stock",
    formDescription: "Description",
    formIncludes: "Included Items (comma-separated)",
    formOptions: "Options",
    optionAccessories: "Accessories",
    optionSoftware: "Software",
    optionSubscription: "Subscription",
    optionApps: "Apps",
    optionWifiOnly: "WiFi only",
    optionPrinter: "Printer",
    buttonSave: "Save",
  },

  // === ADMIN - DEMANDES ===
  requests: {
    title: "Pending Requests",
    empty: "No pending requests",
    buttonApprove: "Approve",
    buttonReject: "Reject",
  },

  // === ADMIN - RETOURS ===
  returns: {
    title: "Returns Management",
    statOverdue: "Overdue",
    statDueSoon: "Due Soon",
    statActive: "Total Active",
    sectionOverdue: "Overdue",
    sectionDueSoon: "Due Soon",
    sectionActive: "All Active",
    empty: "No active loans",
    buttonReturn: "Process Return",
    daysOverdue: "days overdue",
    daysLeft: "days left",
    dueIn: "Due in",
    days: "days",
  },

  // === MODAL RETOUR ===
  returnModal: {
    title: "Confirm Return",
    borrowedBy: "Borrowed by:",
    condition: "Condition",
    conditionGood: "Good",
    conditionMinor: "Minor issues",
    conditionDamaged: "Damaged",
    conditionLost: "Lost",
    notes: "Notes",
    buttonConfirm: "Confirm Return",
  },

  // === MESSAGES ===
  messages: {
    addedToCart: "added to cart",
    requestSubmitted: "Request submitted!",
    approved: "Approved",
    rejected: "Rejected",
    returnProcessed: "Return processed",
    errorLoading: "Error loading data",
  },
};