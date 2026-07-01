# VO Hub — Roadmap complet par phase

> Document de pilotage. Ancré sur un audit réel du codebase (tables, RLS, edge functions, dette de typage, tests, santé des migrations) — pas sur des suppositions.
>
> **État au dernier audit** : 111 migrations, 39 tables sous RLS, 7 fichiers de tests unitaires, 3 specs Playwright, 561 occurrences de `: any`, 5 tables fantômes.
>
> **Convention** : chaque tâche a un ID stable (`A1`, `B2`…). Une phase = un lot cohérent qui peut être mergé et déployé indépendamment. On attaque phase par phase, dans l'ordre, sauf mention "parallélisable".

---

## Légende

| Symbole | Sens |
|---------|------|
| ✅ | Livré et poussé |
| 🔜 | Prochaine phase à attaquer |
| ⚠️ | Risqué / nécessite validation métier avant de coder |
| 🔁 | Parallélisable avec la phase précédente |
| 💥 | Migration DB (à appliquer dans l'ordre) |

---

## PHASE A — Fondations people-ops ✅ FAIT

Livré sur `claude/vo-hub-naming-update-Gmiox`. Détail complet dans `docs/PHASE_A_CHECKLIST.md`.

| ID | Tâche | Statut |
|----|-------|--------|
| A0 | Business units éditables (table + admin CRUD + refactor 5 consumers) | ✅ 💥 `109` |
| A1 | Manager scope par BU sur `it_requests` (RLS + dashboard + cancel) | ✅ 💥 `110` |
| A4 | 3 hot indexes | ✅ 💥 `111` |
| A5 | `notification_recipients` fan-out (5 flux + status change) | ✅ |
| A7 | Tests SQL `fn_audit` | ✅ |
| A2 | Squash baseline — **documenté seulement** (pg_dump requis) | ⚠️ reporté |
| A6 | TS strict full — **diagnostiqué seulement** (~1100 erreurs) | ⚠️ reporté |
| A3 | Tables fantômes — **backlog** (voir Phase E) | ⏸ |

**Reste à faire côté A** : tester sur staging (checklist), puis merger.

---

## PHASE B — Nettoyage & durcissement 🔜

**Objectif** : solder la dette laissée ouverte par la phase A, retirer le legacy, verrouiller ce qui est sensible. Aucune nouvelle feature — que du solide. Idéal juste après le merge de A.

### B1 — Retrait des emails hardcodés `admin@vo-group.be` 🔁
- **Contexte** : onboarding / offboarding / equipment / IT pages envoient encore un `sendEmail({ to: 'admin@vo-group.be' })` en dur, EN PLUS du nouveau fan-out `notifyRecipients` (A5).
- **Fichiers** : `OnboardingRequestPage.tsx`, `OffboardingRequestPage.tsx`, `EquipmentRequestPage.tsx`, `ItRequestFormPage.tsx`
- **Action** : seeder `admin@vo-group.be` dans `notification_recipients` (migration data), puis retirer les 4 `sendEmail` legacy.
- **Risque** : faible. À valider : est-ce que d'autres adresses doivent recevoir ces notifs ?
- **Validation** : soumettre 1 demande de chaque type → l'admin reçoit toujours exactement 1 email (pas 0, pas 2).

### B2 — Brancher `notifyReturnRecipients()` sur le retour équipement
- **Contexte** : le helper `event: 'return'` (toggle `notify_on_return`) est exposé mais jamais appelé.
- **Fichiers** : flow de retour QR / "mark returned" (à localiser : `AdminRequestDetailPage` ou `processQRScan`).
- **Validation** : marquer un prêt comme retourné → recipient avec `notify_on_return = true` reçoit l'email.

### B3 — Nettoyer les `console.log` de debug
- **Fichiers** : `src/services/request-status-service.ts:173, 215, 222` (3 logs `[sendStatusChangeEmail]`).
- **Action** : retirer ou passer derrière un flag `import.meta.env.DEV`.
- **Validation** : `grep -rn 'console.log' src/services` → vide.

### B4 — Revue des 2 policies RLS `USING (true)` non triviales ⚠️
- **Contexte** : l'audit a flagué `089_version_baseline_policies.sql:69` (`USING (true)` sans contexte) et `push_subscriptions` (1 policy à revoir).
- **Action** : lire chaque policy, confirmer qu'elle est intentionnelle, resserrer sinon.
- **Risque** : ⚠️ toucher aux RLS peut casser un flux. Tester chaque table impactée.
- **Validation** : un user non-admin ne peut pas lire les `push_subscriptions` d'un autre.

### B5 — Consolider la churn migration 070↔071
- **Contexte** : `070` ajoute une DELETE policy user, `071` la retire immédiatement + ajoute `user_notes`. Bruit historique.
- **Action** : **documenter** dans `migrations/README.md` que c'est intentionnel (070 superseded by 071). Ne PAS réécrire l'historique appliqué.
- **Validation** : lecture seule, pas de risque.

**Livrable Phase B** : 1 migration data (seed recipient), ~5 fichiers front nettoyés, doc RLS.
**Critère de sortie** : `npm run ci` vert, 0 console.log debug, 0 email en double.

---

## PHASE C — Confiance : tests & CI 🔁 (parallélisable avec B)

**Objectif** : passer d'une couverture "utils only" à une couverture qui protège les flux métier critiques. Aujourd'hui : 0 test sur les pages, hooks, API, composants.

### C1 — Tests unitaires de la couche API (`src/lib/api/*`)
- **Cibles prioritaires** (les plus utilisées) : `business-units.ts`, `notify-recipients.ts`, `it-requests.ts`, `loan-requests.ts`, `mailbox-requests.ts`.
- **Approche** : mock du client Supabase, tester les query builders + gestion d'erreur.
- **Validation** : chaque fichier API a un `.test.ts` couvrant le happy path + 1 cas d'erreur.

### C2 — Tests des règles métier pures
- **Cibles** : `generate-email.ts` (déjà couvert ✅), les fonctions de matching BU, `getAvailableTransitions` (status transitions), `is_manager_of_request_bu` (via test SQL).
- **Nouveau** : test SQL RLS façon `fn_audit_test.sql` mais pour le scope Manager (A1) — simuler 2 managers, vérifier l'isolation.
- **Validation** : `psql -f supabase/tests/manager_scope_test.sql` → assertions passed.

### C3 — Étendre les e2e Playwright
- **Contexte** : 3 specs smoke aujourd'hui, skippées si pas d'env auth.
- **Cibles** : parcours onboarding complet (remplir form → voir dans dashboard), parcours manager (isolation BU visible en UI).
- **Validation** : `npm run test:e2e` avec creds → parcours verts.

### C4 — Coverage gate en CI
- **Action** : ajouter un seuil `vitest --coverage` minimal (ex: 40% lignes sur `src/lib`) au script `ci`.
- **Validation** : `npm run ci` échoue si la couverture baisse sous le seuil.

**Livrable Phase C** : ~15 fichiers de test, 1 test SQL RLS, gate coverage.
**Critère de sortie** : couche API et règles métier couvertes ; e2e onboarding + manager verts.

---

## PHASE D — Typage strict (le grand ménage) ⚠️

**Objectif** : activer `noImplicitAny` + `strictNullChecks` sans casser le build. ~1100 erreurs à dérouler. **Multi-jours** — à faire par modules, pas en un bloc.

### D1 — Générer les types Supabase
- **Action** : `supabase gen types typescript` → `src/types/database.ts`. Remplace les `any` sur les retours de requêtes par les vrais types de tables.
- **Impact** : élimine une grande partie des 561 `: any` d'un coup (couche API).

### D2 — Module par module (ordre par ROI)
Ordre recommandé (du plus utilisé au moins) :
1. `src/lib/api/*` (couche data — bénéficie le plus des types D1)
2. `src/hooks/*`
3. `src/services/*`
4. `src/pages/admin/*` (gros offenders : `ManagerDashboardPage` 15, `AdminRequestDetailPage` 12, `AdminQRCodesPage` 11)
5. `src/components/*`
- **Approche** : activer les flags en local, corriger un dossier, commit, répéter. Garder `npm run typecheck` vert à chaque étape via des overrides temporaires par fichier si besoin.

### D3 — Flip final du tsconfig
- **Action** : retirer `noImplicitAny: false` + `strictNullChecks: false` (+ le TODO annoté en A6).
- **Validation** : `npm run typecheck` vert avec strict complet.

**Livrable Phase D** : types générés, dette `: any` réduite de ~561 → <50, tsconfig strict.
**Critère de sortie** : `tsc --noEmit --strict` = 0 erreur.

---

## PHASE E — Tables fantômes : câbler ou drop ⚠️

**Objectif** : décider, table par table, du sort des 5 schémas créés mais jamais utilisés. **Chaque table = une décision métier** — je ne drop rien sans ton go.

| Table | Migration | Intention d'origine | Options |
|-------|-----------|---------------------|---------|
| `extension_requests` | `009` | Demande de prolongation d'un prêt | **Câbler** (feature utile) ou **drop** |
| `qr_kits` | `034` | Grouper plusieurs items sous 1 QR (kit) | **Câbler** ou **drop** |
| `qr_kit_items` | `034` | Membres d'un kit | idem `qr_kits` (lié) |
| `personal_info_submissions` | `063` | Form public de collecte d'infos perso onboarding | **Câbler** ou **drop** (RGPD : attention si drop = perte de données) |
| `edge_function_calls` | — | Audit/rate-limit des edge functions | **Garder** (utilisé par les edge functions, invisible au grep front) — PAS un fantôme |

### E1 — Atelier de décision ⚠️
- **Action** : pour chaque table (sauf `edge_function_calls` qui reste), tu tranches : câbler ou drop.
- **Je te préparerai** : pour chaque table, ce que "câbler" implique (form + hook + page + RLS déjà en place ?) vs "drop" (migration de suppression + vérif aucune FK).

### E2 — Exécution
- Selon les décisions : migrations de drop (idempotentes) OU implémentation des flux manquants.
- **Risque** : ⚠️ `personal_info_submissions` peut contenir des données RGPD réelles — vérifier avant tout drop.

**Livrable Phase E** : 1 migration de cleanup (drops) et/ou 1-2 features câblées.
**Critère de sortie** : plus aucune table "créée mais morte" non documentée.

---

## PHASE F — Squash baseline (clôture technique) ⚠️

**Objectif** : réduire les 111+ migrations à un baseline unique. **Nécessite un accès `pg_dump` sur staging/prod** — ne peut pas se faire depuis l'agent seul.

### F1 — Dump du schéma de référence
```bash
pg_dump --schema-only --no-owner --no-acl "$DATABASE_URL" \
  > supabase/migrations/000_baseline.sql
```

### F2 — Vérifier sur DB fraîche
- Appliquer `000_baseline.sql` sur une base vierge locale → doit reproduire l'état actuel exactement.

### F3 — Archiver l'historique
- `git rm` des migrations 001–xxx **une fois le baseline validé** (l'historique git reste consultable).
- Mettre à jour `migrations/README.md`.

**Livrable Phase F** : `000_baseline.sql` + migrations historiques archivées.
**Critère de sortie** : `supabase db reset` sur une base vierge → schéma identique à prod.
**Détail complet** : déjà documenté dans `supabase/migrations/README.md`.

---

## Ordre d'attaque recommandé

```
A (fait) ──► B (nettoyage) ──► E (tables fantômes) ──► F (squash)
                │
                └─(parallèle)─► C (tests) ──► D (typage strict)
```

- **B** en premier : rapide, solde la dette de A, faible risque.
- **C** peut démarrer en parallèle de B (aucun conflit de fichiers majeur).
- **D** dépend de C (les tests protègent le refactor de typage) et de D1 (types générés).
- **E** avant **F** : inutile de garder des tables mortes dans le baseline.
- **F** en dernier : une fois que le schéma est stable et nettoyé.

---

## Décisions en attente (je bloque dessus tant que tu n'as pas tranché)

1. **B1** : quelles adresses doivent recevoir les notifs admin (seulement `admin@vo-group.be` ou une liste) ?
2. **B4** : la policy `089:69` et `push_subscriptions` — intentionnelles ou à resserrer ?
3. **E1** : pour chacune des 4 tables fantômes — **câbler ou drop** ?
4. **F** : as-tu un accès `pg_dump` sur staging/prod à me fournir (ou tu le lances toi-même) ?
5. **Priorité globale** : tu veux quoi en premier après le merge de A — **B (propreté)** ou **C (tests)** ?

---

## Récap des livrables par phase

| Phase | Migrations | Fichiers front | Tests | Risque | Durée estimée |
|-------|-----------|----------------|-------|--------|---------------|
| A ✅ | 3 (109-111) | ~15 | 1 SQL | Moyen | fait |
| B 🔜 | 1 (data) | ~5 | — | Faible | 0.5 j |
| C 🔁 | — | — | ~15 + 1 SQL | Faible | 1-2 j |
| D | — | ~40 | — | Élevé | 3-5 j |
| E ⚠️ | 1 (drops) | 0-4 | — | Moyen (RGPD) | 1 j + décisions |
| F ⚠️ | 1 (baseline) | — | — | Élevé | 0.5 j + accès DB |
