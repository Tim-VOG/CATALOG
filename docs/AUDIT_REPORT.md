# IT Hub — Audit Complet

**Date :** 7 Mai 2026
**Projet :** IT Hub — VO Group
**Auditeur :** Claude Code (Opus 4.7)
**Scope :** Frontend, Backend, Base de données, UX, Sécurité, Performance

---

## Résumé Exécutif

IT Hub est un outil interne de gestion IT comprenant un inventaire d'équipements avec QR codes, un système de demandes (equipment, onboarding, offboarding, mailbox), un suivi des assignations, et des emails automatiques.

Le projet a subi de nombreuses évolutions rapides. L'architecture de base est solide (React + Supabase, RLS activé, hooks bien structurés), mais des résidus de refactoring subsistent : anciens statuts dans certains composants UI, fichiers non routés sur disque, et manques UX (loading states, validation).

**Verdict global : 7/10** — Fonctionnel et sécurisé, mais nécessite un nettoyage pour être production-ready.

---

## 1. Issues Critiques (Must Fix)

### 1.1 STATUS_MAP avec anciens statuts
- **Fichier :** `src/components/calendar/CalendarDayPopover.jsx` (lignes 20-29)
- **Problème :** Contient `approved`, `rejected`, `completed`, `cancelled`, `picked_up`, `returned`, `closed`
- **Impact :** Affichage incorrect si des données legacy existent
- **Fix :** Remplacer par `pending`, `in_progress`, `ready`

### 1.2 Référence aux kits supprimés
- **Fichier :** `src/pages/admin/AdminScanLogsPage.jsx` (lignes 132-134)
- **Problème :** Affiche `log.kit_name` — la table `qr_kits` a été supprimée (migration 048)
- **Impact :** Affiche `null` silencieusement
- **Fix :** Supprimer les références à `kit_name`

### 1.3 Système d'extensions encore actif
- **Fichiers :** `src/hooks/use-extension-requests.js`, `src/components/admin/ExtensionApprovalDialog.jsx`
- **Problème :** Utilise les statuts `approved`/`rejected` — workflow supprimé
- **Impact :** Code mort qui peut créer de la confusion
- **Fix :** Supprimer les fichiers ou désactiver complètement

### 1.4 Filtres CatalogLoansView avec anciens statuts
- **Fichier :** `src/components/calendar/CatalogLoansView.jsx` (lignes 325-336)
- **Problème :** STATUS_PILLS contient `approved`, `picked_up`, `returned`, `completed`
- **Impact :** Filtres non fonctionnels
- **Fix :** Remplacer par `pending`, `in_progress`, `ready`

### 1.5 Fichiers admin non routés sur disque
- **Fichiers :** `AdminQRTestPage.jsx`, `AdminFormFieldsPage.jsx`, `AdminNewRequestPage.jsx`, `AdminPlanningPage.jsx`, `AdminModuleAccessPage.jsx`, `AdminProductOptionsPage.jsx`
- **Problème :** Routes supprimées/redirigées mais fichiers encore présents
- **Impact :** Code mort, confusion pour les développeurs
- **Fix :** Supprimer les fichiers

---

## 2. Issues Hautes (Important)

### 2.1 Performance — getScanStatsByCategory()
- **Fichier :** `src/lib/api/qr-codes.js` (lignes 218-233)
- **Problème :** Charge TOUS les scan logs sans limite pour agréger des stats
- **Impact :** Dégradation de performance avec la croissance des données
- **Fix :** Implémenter une agrégation côté serveur (SQL function) ou ajouter un LIMIT

### 2.2 Pages sans loading state (8 pages)
- `AdminFormFieldsPage.jsx`
- `AdminNewRequestPage.jsx`
- `OnboardingRequestPage.jsx`
- `OffboardingRequestPage.jsx`
- `EquipmentRequestPage.jsx`
- `OnboardingComposerPage.jsx`
- `OnboardingHistoryPage.jsx`
- `OnboardingRecipientsPage.jsx`
- **Impact :** Page blanche pendant le chargement des données
- **Fix :** Ajouter `<PageLoading />` quand `isLoading` est true

### 2.3 Composants surdimensionnés (>300 lignes)
| Composant | Lignes |
|---|---|
| `SortableBlock.jsx` | 542 |
| `motion.jsx` | 536 |
| `CatalogLoansView.jsx` | 492 |
| `InviteUserDialog.jsx` | 471 |
| `FormFieldsManager.jsx` | 383 |
| `Header.jsx` | 368 |
| `OnboardingTour.jsx` | 350 |
| `ScanActionCard.jsx` | 330 |
- **Fix :** Refactoriser en sous-composants

### 2.4 Validation de formulaires manquante
- **Fichiers :** `EquipmentRequestPage.jsx`, `OnboardingRequestPage.jsx`, `OffboardingRequestPage.jsx`
- **Problème :** Validation manuelle avec `useState`, pas de Zod malgré l'installation
- **Impact :** Données invalides possibles, UX inconsistante
- **Fix :** Implémenter `react-hook-form` + `zod` (déjà dans package.json)

### 2.5 Boutons sans état disabled (253 boutons, 12 protégés)
- **Impact :** Double-submit possible, feedback utilisateur manquant
- **Fix :** Ajouter `disabled={mutation.isPending}` sur tous les boutons de soumission

---

## 3. Issues Moyennes (Should Fix)

### 3.1 Hooks legacy exportés
- **Fichier :** `src/hooks/index.js`
- **Problème :** Exporte `useLoans`, `usePlanning` — hooks non utilisés
- **Fix :** Supprimer les exports

### 3.2 Dossier my-equipment vs my-equipments
- **Problème :** Deux dossiers similaires, source de confusion
- **Fix :** Supprimer l'ancien dossier `my-equipment/`

### 3.3 Pas de TypeScript
- **Impact :** Erreurs runtime non détectées avant déploiement
- **Recommandation :** Migration progressive vers TypeScript (optionnel)

### 3.4 Import `lenis` dans App.jsx
- **Problème :** Usage non clair, potentiellement inutile
- **Fix :** Vérifier et supprimer si non utilisé

---

## 4. Sécurité ✅

| Aspect | Status |
|---|---|
| RLS activé sur toutes les tables | ✅ 31 tables protégées |
| Routes admin protégées | ✅ RequireAdmin wrapper |
| Page Scan admin-only | ✅ Route protégée |
| Emails via Edge Function | ✅ Pas d'envoi direct |
| Profil — users voient le leur uniquement | ✅ RLS policy |
| Audit logs — admins only | ✅ RLS policy |
| QR scan logs accessibles aux users auth | ⚠️ Normal (nécessaire pour MyEquipments) |

**Verdict sécurité : Bon.** Pas de faille critique identifiée.

---

## 5. Performance

| Problème | Sévérité | Solution |
|---|---|---|
| `getScanStatsByCategory()` — charge tout | Haute | Agrégation SQL ou LIMIT |
| `useScanLogs({ limit: 200 })` dans MyEquipments | Moyenne | OK pour MVP, à paginer plus tard |
| CatalogLoansView — calculs calendrier | Basse | Bien optimisé avec useMemo |
| Pas de pagination sur les listes admin | Moyenne | Implémenter virtual scrolling ou pagination |

---

## 6. Architecture & Code Quality

### Ce qui est propre ✅
- Séparation hooks / api / pages / components
- React Query bien utilisé (invalidation, mutations)
- Zustand pour l'état UI (cart, toasts)
- Supabase SDK bien intégré
- Email system avec templates inline (pas de dépendance DB)
- 3 statuts cohérents (pending → in_progress → ready)

### Ce qui doit être amélioré ⚠️
- Fichiers morts à supprimer (6 pages admin non routées)
- Composants trop gros à refactoriser (8 composants > 300 lignes)
- Validation côté client à implémenter (Zod déjà installé)
- Loading/empty states manquants sur plusieurs pages

---

## 7. Base de Données

### Tables actives (31)
- `products`, `categories`, `profiles`, `locations`
- `loan_requests`, `loan_request_items`
- `it_requests`, `mailbox_requests`
- `qr_codes`, `qr_scan_logs`
- `user_equipment`, `cart_items`
- `notifications`, `email_templates`, `notification_recipients`
- `extension_requests` (à évaluer — potentiellement obsolète)
- Et autres tables de support

### Tables supprimées ✅
- `qr_kits` — supprimée migration 048
- `qr_kit_items` — supprimée migration 048

### Vues actives
- `products_with_category`
- `loan_requests_with_details`
- `loan_request_items_with_details`
- `qr_codes_with_details`
- `qr_scan_logs_with_details`
- `cart_items_with_product`
- `user_equipment_with_product`

### Contraintes de statut ✅
- `loan_requests`: `pending`, `in_progress`, `ready`
- `mailbox_requests`: `pending`, `in_progress`, `ready`
- `qr_codes`: `available`, `assigned`, `maintenance`, `in_repair`, `lost`, `reserved`

---

## 8. Recommandations Prioritées

### Immédiat (cette semaine)
1. Fixer les STATUS_MAP dans CalendarDayPopover et CatalogLoansView
2. Supprimer les références kit_name dans AdminScanLogsPage
3. Supprimer les 6 fichiers admin non routés
4. Clarifier/supprimer le système d'extension requests

### Court terme (2 semaines)
5. Ajouter loading states aux 8 pages manquantes
6. Ajouter disabled states aux boutons de mutation
7. Implémenter validation Zod sur les formulaires de demande
8. Optimiser getScanStatsByCategory() avec une agrégation SQL

### Moyen terme (1 mois)
9. Refactoriser les 8 composants > 300 lignes
10. Supprimer les hooks legacy (useLoans, usePlanning)
11. Ajouter empty states aux pages qui en manquent
12. Implémenter la pagination sur les listes admin

### Long terme (optionnel)
13. Migration TypeScript progressive
14. Tests unitaires sur les hooks et API
15. Monitoring et alertes (Sentry ou similaire)

---

## 9. Conclusion

IT Hub est un système fonctionnel avec une bonne base architecturale et de sécurité. Les principaux problèmes sont des résidus de refactoring rapide (anciens statuts, fichiers morts) et des manques UX (loading states, validation). Aucune faille de sécurité critique n'a été identifiée.

**Priorité #1 :** Nettoyage du code mort et des anciens statuts
**Priorité #2 :** Amélioration UX (loading, validation, feedback)
**Priorité #3 :** Optimisation performance pour la scalabilité

---

*Audit réalisé par Claude Code (Opus 4.7) — 7 Mai 2026*
*Projet : IT Hub — VO Group*
