# 🚀 Prompt Claude Code — UI/UX Frontend Design Boost

## Contexte du projet

Tu travailles sur un site web interne de **réservation de matériel** construit avec :
- **React + Vite** avec **Tailwind CSS 4**
- **Composants UI faits maison** (style shadcn/ui avec CVA + Tailwind)
- **Zustand** (state management) + **React Query / TanStack Query** (data fetching)
- **@dnd-kit** (drag & drop) + **react-hook-form + zod** (formulaires)
- **Supabase** (backend) avec theming dynamique (`useTheme()`)
- **Lucide React** (icônes)
- Typographies : Space Grotesk (titres) + DM Sans (corps)

L'objectif est d'améliorer la qualité UI/UX du projet en ajoutant les couches manquantes côté design, animations, accessibilité et composants. Applique les changements **de manière incrémentale**, en testant chaque étape.

---

## Phase 1 — Animations & Transitions (priorité haute)

### 1.1 Installer Framer Motion

```bash
npm install motion
```

### 1.2 Créer un set de composants d'animation réutilisables

Crée un fichier `src/components/ui/motion.jsx` qui exporte des wrappers animés :

- **`FadeIn`** — apparition en fondu (opacity 0→1, translateY léger) pour les sections de page
- **`SlideIn`** — glissement latéral pour les panneaux/drawers
- **`ScaleIn`** — scale 0.95→1 pour les modales/dialogs
- **`AnimateList`** — animation staggered pour les listes d'éléments (matériel, résultats de recherche)
- **`PageTransition`** — wrapper pour les transitions entre pages/routes

Utilise des durées courtes (150-300ms) et des easings naturels (`easeOut`). Ne sur-anime pas — chaque animation doit servir un feedback UX, pas être décorative.

### 1.3 Intégrer les animations dans les composants existants

- Anime l'ouverture/fermeture des `Dialog` (scale + fade)
- Anime les items du panier quand on ajoute/retire du matériel (AnimatePresence + layoutId)
- Ajoute des transitions sur les `DropdownMenu` (fade rapide)
- Anime le drag & drop `@dnd-kit` avec des transitions fluides sur le repositionnement

---

## Phase 2 — Composants UI manquants (priorité haute)

### 2.1 Installer Radix UI Primitives

```bash
npm install @radix-ui/react-toast @radix-ui/react-tooltip @radix-ui/react-alert-dialog @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-progress @radix-ui/react-switch @radix-ui/react-slot
```

> On utilise Radix comme base accessible (gestion focus, clavier, aria) et on style par-dessus avec CVA + Tailwind, exactement comme shadcn/ui.

### 2.2 Créer les composants manquants critiques

Crée chaque composant dans `src/components/ui/` en suivant le pattern existant (CVA + `cn()` helper + Tailwind) :

1. **Toast / Sonner** — Installe `sonner` (`npm install sonner`) pour les notifications. Crée un `Toaster` provider et utilise `toast.success()`, `toast.error()`, `toast.loading()` pour :
   - Confirmation de réservation
   - Erreurs de formulaire / réseau
   - Actions réussies (ajout au panier, sauvegarde)

2. **Skeleton** — Composant de loading placeholder. Crée `Skeleton` avec des variantes :
   - `text` (ligne de texte)
   - `card` (carte de matériel)
   - `avatar` (rond)
   - `table-row` (ligne de tableau)
   Utilise-les systématiquement avec les états `isLoading` de React Query.

3. **Tooltip** — Basé sur `@radix-ui/react-tooltip`. Ajoute des tooltips sur :
   - Toutes les icônes sans label textuel
   - Les boutons d'action dans les tableaux
   - Les badges/statuts tronqués

4. **Calendar + DatePicker** — Installe `react-day-picker` (`npm install react-day-picker`) et crée :
   - `Calendar` — composant calendrier standalone, stylé Tailwind
   - `DatePicker` — input + popover avec Calendar intégré
   - `DateRangePicker` — sélection de plage de dates pour les réservations
   Intègre avec `date-fns` pour le formatage et `react-hook-form` pour la validation.

5. **Sheet / Drawer** — Panneau latéral glissant basé sur `@radix-ui/react-dialog` avec les variantes :
   - `side: "right" | "left" | "top" | "bottom"`
   - Utilise-le pour le panier sur mobile et les filtres

6. **AlertDialog** — Basé sur `@radix-ui/react-alert-dialog` pour les confirmations destructives :
   - Annulation de réservation
   - Suppression d'éléments
   - Actions irréversibles

7. **Command / Combobox** — Installe `cmdk` (`npm install cmdk`) pour :
   - Recherche rapide de matériel avec autocomplétion
   - Sélection de catégories avec filtre
   - Command palette (Ctrl+K) pour la navigation rapide

8. **Progress** — Basé sur `@radix-ui/react-progress` pour :
   - Étapes du flow de réservation
   - Upload de fichiers
   - Indicateurs de quota

9. **ScrollArea** — Basé sur `@radix-ui/react-scroll-area` pour les listes longues avec scrollbar custom stylée Tailwind.

10. **Switch** — Basé sur `@radix-ui/react-switch` pour les toggles (dark mode, préférences).

---

## Phase 3 — Accessibilité (priorité haute)

### 3.1 Audit et correction des composants existants

Pour chaque composant dans `src/components/ui/`, vérifie et corrige :

- **Focus management** — Tous les éléments interactifs doivent avoir un `focus-visible` ring visible (utilise `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`)
- **Navigation clavier** — Tab, Enter, Escape, Arrow keys doivent fonctionner sur tous les composants interactifs
- **Aria labels** — Ajoute `aria-label` ou `aria-labelledby` sur tous les boutons icône-only, les inputs sans label visible, les sections de page
- **Rôles ARIA** — Vérifie que Dialog, Select, DropdownMenu, Tabs ont les bons rôles (`role="dialog"`, `role="listbox"`, `role="menu"`, `role="tablist"`)
- **Contraste** — Vérifie que les rapports de contraste respectent WCAG AA (4.5:1 pour le texte, 3:1 pour les grands textes) en mode light ET dark
- **Screen reader** — Ajoute `sr-only` pour le texte masqué mais lisible par les lecteurs d'écran (statuts, actions)

### 3.2 Skip navigation

Ajoute un lien "Skip to content" en haut de chaque page, visible uniquement au focus clavier :

```jsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2">
  Aller au contenu principal
</a>
```

### 3.3 Annonces live regions

Crée un composant `LiveRegion` (`aria-live="polite"`) pour annoncer :
- Les ajouts/retraits du panier
- Les résultats de recherche filtrés
- Les confirmations d'actions

---

## Phase 4 — Self-hosting des fonts (GDPR + Performance)

### 4.1 Installer les fonts localement

```bash
npm install @fontsource-variable/space-grotesk @fontsource-variable/dm-sans
```

### 4.2 Remplacer les imports Google Fonts

Dans le fichier d'entrée principal (`src/main.jsx` ou `src/index.jsx`), ajoute :

```js
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/dm-sans';
```

### 4.3 Supprimer les liens Google Fonts

Retire tous les `<link>` vers `fonts.googleapis.com` et `fonts.gstatic.com` dans `index.html`.

### 4.4 Mettre à jour le CSS

Dans `globals.css`, vérifie que les `font-family` pointent vers les mêmes noms :

```css
--font-display: 'Space Grotesk Variable', sans-serif;
--font-body: 'DM Sans Variable', sans-serif;
```

> Avantage : plus d'appels réseau vers Google, meilleur TTFB, conformité GDPR (pas de leak d'IP vers Google).

---

## Phase 5 — Stratégie Responsive & Mobile

### 5.1 Breakpoints et layout

Vérifie et ajuste les layouts pour les breakpoints Tailwind standards :
- `sm` (640px) — téléphones en paysage
- `md` (768px) — tablettes
- `lg` (1024px) — desktop

### 5.2 Adaptations mobile spécifiques

- **Panier** → Utilise `Sheet` (drawer bottom) au lieu de sidebar sur mobile
- **Dialog** → Passe en fullscreen sur `sm` avec `className="sm:max-w-lg max-sm:h-full max-sm:max-h-full max-sm:rounded-none"`
- **Tables** → Ajoute un scroll horizontal avec `ScrollArea` ou un layout card sur mobile
- **Drag & drop** → Vérifie que `@dnd-kit` fonctionne au touch. Ajoute `touchAction: "none"` sur les éléments draggable et utilise `restrictToVerticalAxis` pour mobile
- **Navigation** → Menu hamburger avec Sheet sur mobile

### 5.3 Touch targets

Assure-toi que tous les boutons et éléments cliquables font minimum **44x44px** sur mobile (recommandation WCAG).

---

## Phase 6 — Error Handling & Loading States (qualité UX)

### 6.1 Error Boundary global

Crée un `ErrorBoundary` React qui affiche un fallback UX-friendly :

```jsx
// src/components/ErrorBoundary.jsx
// - Message d'erreur clair et non-technique
// - Bouton "Réessayer" qui recharge la page/le composant
// - Option de retour à l'accueil
```

### 6.2 Pattern de loading cohérent

Crée un hook ou composant wrapper qui standardise les états React Query :

```jsx
// src/components/QueryWrapper.jsx
// Props: query (useQuery result), skeleton (composant Skeleton), errorFallback
// - isLoading → affiche Skeleton
// - isError → affiche ErrorFallback avec retry
// - isSuccess → affiche children
```

### 6.3 Empty states

Crée un composant `EmptyState` pour les cas où :
- Aucun matériel ne correspond à la recherche
- Le panier est vide
- Aucune réservation en cours

Avec une illustration, un message et un CTA.

---

## Règles générales à respecter

1. **Incrémental** — Fais les changements phase par phase. Ne casse pas ce qui fonctionne.
2. **Cohérence** — Tous les nouveaux composants doivent suivre le pattern existant : CVA pour les variantes, `cn()` pour les classes, Tailwind pour le styling.
3. **Naming** — Garde la convention de nommage existante dans `src/components/ui/`.
4. **Dark mode** — Tous les nouveaux composants doivent supporter le theming dark/light via les CSS custom properties existantes.
5. **Theming** — Respecte les variables `--color-*` et `--radius-*` existantes.
6. **TypeScript** — Si le projet utilise JSX, reste en JSX. Ne convertis pas en TypeScript sauf demande explicite.
7. **Tests** — Après chaque phase, vérifie visuellement que rien n'est cassé en dark et light mode.
8. **Performance** — Lazy-load les composants lourds (Calendar, Command). Utilise `React.lazy()` + `Suspense` si nécessaire.
