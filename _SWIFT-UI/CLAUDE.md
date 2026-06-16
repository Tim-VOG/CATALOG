# CLAUDE.md — Hub IT iOS
# Prompt de référence pour Claude Agent dans Xcode 26

---

## 🗂️ Projet source React (référence)

Le projet web source Hub IT est disponible en local sur ce Mac.
**Chemin Git à renseigner ici avant de commencer :**

```
SOURCE_REPO = /Users/tim/Documents/GitHub/CATALOG
```

> Exemple : `/Users/vo/Projects/hub-it`

Avant toute génération de code, lis les fichiers suivants du repo source pour
comprendre l'architecture, le design system et la logique métier :

```
$SOURCE_REPO/src/
├── components/ui/          ← 14 composants design system (Button, Card, Badge…)
├── pages/                  ← écrans principaux
├── store/                  ← état global Zustand
├── hooks/                  ← hooks custom
├── lib/supabase.js         ← client Supabase + types
└── App.jsx                 ← routing et structure globale
```

---

## 🎯 Objectif

Transposer l'application web **Hub IT** (réservation de matériel interne, VO Group)
en application iOS native **SwiftUI**, en conservant :
- La même logique métier et les mêmes flux utilisateur
- Le même backend Supabase (tables, RLS, auth)
- Le même design system (couleurs, typographie, espacements)
- La même authentification Microsoft (Entra ID / MSAL)

---

## 🏗️ Architecture iOS cible

```
HubIT/
├── HubITApp.swift              ← @main, setup MSAL + Supabase
├── ContentView.swift           ← root view + navigation
│
├── Core/
│   ├── Supabase/
│   │   ├── SupabaseClient.swift        ← singleton
│   │   └── SupabaseModels.swift        ← structs Codable = tables DB
│   ├── Auth/
│   │   ├── MSALManager.swift           ← Entra ID auth
│   │   └── AuthViewModel.swift
│   └── Theme/
│       ├── Colors.swift                ← palette du design system
│       ├── Typography.swift            ← Space Grotesk + DM Sans
│       └── Spacing.swift              ← tokens d'espacement
│
├── Features/
│   ├── Materials/
│   │   ├── MaterialsListView.swift
│   │   ├── MaterialDetailView.swift
│   │   └── MaterialsViewModel.swift
│   ├── Reservations/
│   │   ├── ReservationsView.swift
│   │   ├── NewReservationView.swift
│   │   └── ReservationsViewModel.swift
│   └── Profile/
│       └── ProfileView.swift
│
└── Components/
    ├── HBButton.swift          ← Button du design system
    ├── HBCard.swift            ← Card
    ├── HBBadge.swift           ← Badge statuts
    └── HBTextField.swift       ← Input
```

---

## 🎨 Design System — Tokens

Reproduis exactement ces valeurs depuis `$SOURCE_REPO/src/components/ui/` :

### Couleurs (à lire depuis le CSS/Tailwind du repo source)
```swift
// Colors.swift
extension Color {
    // Lire les valeurs exactes depuis le repo source
    // src/index.css ou tailwind.config.js
    static let hubPrimary     = Color(hex: "#LIRE_DEPUIS_SOURCE")
    static let hubBackground  = Color(hex: "#LIRE_DEPUIS_SOURCE")
    static let hubSurface     = Color(hex: "#LIRE_DEPUIS_SOURCE")
    static let hubText        = Color(hex: "#LIRE_DEPUIS_SOURCE")
    static let hubMuted       = Color(hex: "#LIRE_DEPUIS_SOURCE")
    static let hubBorder      = Color(hex: "#LIRE_DEPUIS_SOURCE")

    // Statuts réservations
    static let statusAvailable = Color(hex: "#LIRE_DEPUIS_SOURCE")
    static let statusReserved  = Color(hex: "#LIRE_DEPUIS_SOURCE")
    static let statusPending   = Color(hex: "#LIRE_DEPUIS_SOURCE")
}
```

### Typographie
```swift
// Typography.swift
// Polices : Space Grotesk (titres) + DM Sans (corps)
// Ajouter les .ttf dans Assets.xcassets si nécessaire
// ou utiliser les system fonts comme fallback
```

---

## 🔌 Backend Supabase

Réutilise le même projet Supabase que l'app web.
**Ne crée pas de nouvelle base de données.**

```swift
// SupabaseClient.swift
import Supabase

let supabase = SupabaseClient(
    supabaseURL: URL(string: "SUPABASE_URL_DEPUIS_SOURCE_ENV")!,
    supabaseKey: "SUPABASE_ANON_KEY_DEPUIS_SOURCE_ENV"
)
```

> Lis `$SOURCE_REPO/.env` ou `$SOURCE_REPO/.env.local` pour récupérer
> les valeurs `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
> Place-les dans un fichier `Config.xcconfig` (jamais en dur dans le code).

**Tables à mapper** (lis `$SOURCE_REPO/src/lib/supabase.js` pour les types exacts) :
- `materials` → `struct Material: Codable, Identifiable`
- `reservations` → `struct Reservation: Codable, Identifiable`
- `users` → `struct UserProfile: Codable`

---

## 🔐 Authentification Microsoft (MSAL)

Reproduis la logique de `$SOURCE_REPO/src/` auth :

```swift
// Package Swift : MSAL (Microsoft Authentication Library)
// Ajouter via SPM : https://github.com/AzureAD/microsoft-authentication-library-for-objc

// MSALManager.swift
// - Lire le clientId et tenantId depuis $SOURCE_REPO (fichier de config auth)
// - Scopes : ["User.Read", "openid", "profile", "email"]
// - Stocker le token dans Keychain (pas UserDefaults)
// - Fournir acquireToken() et refreshToken()
```

---

## 📱 Mapping écrans — React → SwiftUI

Pour chaque page dans `$SOURCE_REPO/src/pages/`, crée une View SwiftUI équivalente.

| Fichier source React | View SwiftUI iOS | Notes |
|---|---|---|
| `pages/Home.jsx` | `HomeView.swift` | Dashboard principal |
| `pages/Materials.jsx` | `MaterialsListView.swift` | Liste avec filtres |
| `pages/MaterialDetail.jsx` | `MaterialDetailView.swift` | Fiche + CTA réservation |
| `pages/Reservations.jsx` | `ReservationsView.swift` | Mes réservations |
| `pages/NewReservation.jsx` | `NewReservationView.swift` | Formulaire |
| `pages/Profile.jsx` | `ProfileView.swift` | Compte utilisateur |

**Pour chaque écran, lis le fichier React source correspondant avant de générer
le code SwiftUI. Respecte exactement la même structure de données et les mêmes
états UI (loading, empty, error).**

---

## 🧩 Mapping composants — React → SwiftUI

Lis chaque fichier dans `$SOURCE_REPO/src/components/ui/` et crée l'équivalent
dans `Components/`. Respecte les variantes (size, variant, disabled…).

| Composant React | Composant SwiftUI |
|---|---|
| `Button.jsx` (variant: primary/ghost/outline) | `HBButton.swift` |
| `Card.jsx` | `HBCard.swift` |
| `Badge.jsx` (statuts) | `HBBadge.swift` |
| `Input.jsx` / `TextField.jsx` | `HBTextField.swift` |
| `Modal.jsx` | `.sheet()` modifier |
| `Toast.jsx` | `.overlay()` + animation |
| `Skeleton.jsx` | `.redacted(reason: .placeholder)` |

---

## 🔄 Mapping state — Zustand → @Observable

Lis `$SOURCE_REPO/src/store/` et transpose chaque store :

```swift
// Zustand store → @Observable class Swift
// Exemple :
// useReservationsStore.js → ReservationsViewModel.swift
// - Mêmes propriétés (items, isLoading, error, filters)
// - Mêmes actions (fetchAll, create, update, cancel)
// - Appels Supabase async/await au lieu de React Query
```

---

## ⚠️ Règles absolues

### NE JAMAIS faire
- ❌ Modifier le fichier `.pbxproj` directement — crée les fichiers, l'utilisateur les ajoute à Xcode
- ❌ Mettre des credentials (URL Supabase, clés API) en dur dans le code Swift
- ❌ Modifier le repo source React — lecture seule uniquement
- ❌ Créer de nouvelles tables Supabase — utiliser l'existant

### TOUJOURS faire
- ✅ Lire le fichier source React correspondant AVANT de générer le SwiftUI
- ✅ Utiliser `async/await` (pas de Combine sauf si vraiment nécessaire)
- ✅ Gérer les 3 états : loading / success / error sur chaque View
- ✅ Respecter les noms de propriétés Supabase (snake_case → CodingKeys)
- ✅ Ajouter des `Logger` statements sur les flux async complexes
- ✅ Tester sur iPhone 14 simulator minimum (iOS 17+)
- ✅ Capturer les Previews SwiftUI pour vérifier le rendu avant de continuer

---

## 🚀 Ordre de développement recommandé

```
Phase 1 — Foundation
  1. Setup projet Xcode + SPM (Supabase Swift, MSAL)
  2. Config.xcconfig avec les variables d'env
  3. SupabaseClient.swift + modèles Codable
  4. MSALManager.swift + AuthViewModel
  5. Theme (Colors, Typography, Spacing)

Phase 2 — Composants UI
  6. HBButton, HBCard, HBBadge, HBTextField
  7. Previews pour chaque composant

Phase 3 — Écrans
  8. HomeView + navigation TabView
  9. MaterialsListView + filtres
  10. MaterialDetailView
  11. NewReservationView (formulaire)
  12. ReservationsView
  13. ProfileView

Phase 4 — Polish
  14. Offline handling + erreurs réseau
  15. Animations et transitions
  16. Tests UI de base
```

---

## 📦 Dépendances Swift (SPM)

Ajoute ces packages dans Xcode → File → Add Package Dependencies :

```
https://github.com/supabase/supabase-swift
https://github.com/AzureAD/microsoft-authentication-library-for-objc
```

---

## 🗒️ Notes de session

> Utilise cette section pour documenter les décisions prises et les problèmes rencontrés.
> Mets à jour à chaque session pour éviter de répéter les mêmes erreurs.

- [ ] Chemin repo source renseigné : `SOURCE_REPO = `
- [ ] Variables Supabase récupérées depuis .env
- [ ] clientId / tenantId MSAL identifiés
- [ ] Structure des tables Supabase vérifiée
