# Phase A — Récap des corrections + checklist de test

> Branche : `claude/vo-hub-naming-update-Gmiox`
> Commits : 3 (`feat(admin): editable business units` → `feat(rls): scope Manager access by BU` → `chore(phase-a): hot indexes, notification fan-out, fn_audit tests, baseline notes`)

---

## Vue d'ensemble

| Code | Sujet | Statut | Migration | Fichiers clés |
|------|-------|--------|-----------|---------------|
| **A0** | Business units éditables (DB-backed) | ✅ Livré | `109_business_units.sql` | `src/pages/admin/AdminBusinessUnitsPage.tsx`, `src/hooks/use-business-units.ts`, `src/lib/api/business-units.ts` |
| **A1** | Manager scope par BU sur `it_requests` | ✅ Livré | `110_manager_bu_scope.sql` | `src/pages/admin/ManagerDashboardPage.tsx`, `OnboardingRequestsPage.tsx`, `AdminOffboardingRequestsPage.tsx` |
| **A4** | Hot indexes (3 composites) | ✅ Livré | `111_hot_indexes.sql` | — |
| **A5** | `notification_recipients` fan-out | ✅ Livré | — (helper client-side) | `src/lib/api/notify-recipients.ts`, `src/services/request-status-service.ts` |
| **A6** | TS strict full | ⚠️ Reporté | — | ~1100 erreurs à corriger en Phase B |
| **A7** | Tests SQL `fn_audit` | ✅ Livré | — | `supabase/tests/fn_audit_test.sql` |
| **A2** | Squash baseline | ⚠️ Documenté seulement | — | `supabase/migrations/README.md` |

---

## A0 — Business units éditables

### Ce que ça fait

Sortir la liste des BU du fichier TypeScript figé (`src/lib/constants/business-units.ts`) et la stocker dans une vraie table éditable depuis l'admin UI.

### Pourquoi

- L'ajout d'une BU (ex: **ACT-EVENTS / act-events.com**) imposait un deploy.
- La DB n'avait aucun moyen de mapper BU ↔ domaine email → bloquant pour le scope Manager en A1.
- Deux pages d'admin (`AdminUsersPage`, `InviteUserDialog`) avaient en plus leur propre liste locale obsolète (VO CONSULTING, VO PRODUCTION, VO STUDIOS, KRAFTHAUS) qui dérivait du canonique.

### Changements

**Migration `109_business_units.sql`**
- Table `business_units (id, value UNIQUE, domain UNIQUE, email_pattern CHECK, sort_order, created_at, updated_at)`
- Index `idx_business_units_domain`
- RLS : authenticated read, admin write
- Trigger `update_updated_at` + trigger `fn_audit`
- Seed des 7 BU existantes **+ ACT-EVENTS** (`act-events.com`, pattern `initial_last` par défaut)

**Front-end**
- Page admin `/admin/business-units` (CRUD complet via dialog)
- Route + entrée sidebar dans la section Settings
- Hook `useBusinessUnits()` + API
- Refactor de 5 consumers : `ItRequestFormPage`, `AdminUsersPage`, `InviteUserDialog`, `generate-email.ts`, `constants/business-units.ts`
- `generateCorporateEmail()` accepte désormais une liste optionnelle de BU
- Constante TS gardée comme fallback (first paint + tests) avec 8 entrées en miroir du seed

### Tests à valider

#### Préalable
```bash
supabase db push          # ou exécuter 109 via Studio
```

- [ ] **Sidebar** : entrée *Business Units* (icône immeuble) sous *Settings*
- [ ] **Liste** : `/admin/business-units` affiche 8 BU avec leur domaine
- [ ] **Création** : "+ Add Business Unit" → ajout d'une BU bidon → apparaît dans la liste
- [ ] **Édition** : modifier le pattern email d'ACT-EVENTS, sauvegarder, le badge se met à jour
- [ ] **Suppression** : delete sur la BU bidon → disparaît
- [ ] **Audit** : `/admin/audit` log une ligne `create`/`update`/`delete` par opération
- [ ] **Formulaire onboarding** (`/onboarding-request`) : dropdown BU charge les 8 depuis DB ; une nouvelle BU créée en admin apparaît sans deploy
- [ ] **Génération email** : ACT-EVENTS + "John Doe" → `jdoe@act-events.com` (ou autre selon pattern)
- [ ] **AdminUsersPage** : filtre BU dropdown + édition BU sur ligne profil = 8 BU (plus de VO CONSULTING/STUDIOS/PRODUCTION/KRAFTHAUS legacy)
- [ ] **InviteUserDialog** : dropdown BU = 8 BU canoniques

### ⚠️ Point à valider

- **Pattern ACT-EVENTS** : par défaut `initial_last` (= `jdoe@act-events.com`). Si ce n'est pas le bon pattern, le modifier via `/admin/business-units`.
- **BU fantômes** : si certains profils en base ont `business_unit = 'VO CONSULTING'` (ou autre legacy), le texte reste visible en lecture mais aucun nouveau profil ne peut plus le sélectionner. À nettoyer ou rajouter via l'admin.

---

## A1 — Manager scope par BU

### Ce que ça fait

Limiter ce qu'un user avec `role = 'manager'` voit et modifie dans `it_requests` à la business unit de son propre profil.

### Pourquoi

Avant : la policy "Staff can view/update all it_requests" (migration 099) donnait à tout `manager`+`admin` un accès non scopé à toutes les it_requests. Avec plusieurs BU qui onboard en parallèle, un Manager VO EUROPE ne devait pas voir le pipeline de VO EVENT.

### Règles métier

- **Admin** : accès complet (inchangé)
- **Manager SELECT** : limité à sa BU (pour éviter les doublons entre Managers de la même BU)
- **Manager UPDATE** : uniquement sur sa propre demande, tant que `status = 'pending'` (déjà couvert par migration 071)
- **Manager DELETE/Cancel** : uniquement sur sa propre demande, **n'importe quand** (nouveau)
- **Ne peut pas toucher** aux demandes des autres Managers de sa BU (juste les voir)

### Matching BU (triple)

La fonction `is_manager_of_request_bu(business_unit, data)` matche le `profiles.business_unit` du Manager courant contre :
1. La colonne legacy `it_requests.business_unit`
2. `it_requests.data->>'business_unit'`
3. Le domaine de `it_requests.data->>'corporate_email'` vs `business_units.domain`

### Changements

**Migration `110_manager_bu_scope.sql`**
- Drop des policies non scopées 099 ("Staff can view/update all it_requests")
- Création de la fonction `is_manager_of_request_bu` (SECURITY DEFINER)
- Policy `"Managers view it_requests of own BU"` (SELECT)
- Policy `"Managers delete own it_requests"` (DELETE, sans gate sur status)
- Nouvelle colonne `it_requests.onboarded_by_manager_id` (FK → profiles, ON DELETE SET NULL)
- Index sur `onboarded_by_manager_id`

**Front-end**
- `ManagerDashboardPage` : pill "Showing requests for {BU}", warning amber si BU non set, mention du submitter sur chaque ligne d'arrivée/départ
- `OnboardingRequestsPage` + `AdminOffboardingRequestsPage` : bouton "Delete" devient "Cancel" pour managers sur leur propre row, caché ailleurs ; boutons "Start Processing"/"Mark Ready"/"Reserve kit" cachés pour managers (admin only)
- Les 3 formulaires de création (onboarding, offboarding, IT) populent `onboarded_by_manager_id = user.id` quand `profile.role === 'manager'`

### Tests à valider

#### Préalable
Créer en DB :
- 1 Admin
- 2 Managers de BU différentes (ex: Tim/`VO EUROPE`, Marc/`VO EVENT`)
- 1 2e Manager dans la même BU que Tim (ex: Patricia/`VO EUROPE`)

- [ ] **Banner scope** : Tim se connecte → pill "Showing requests for VO EUROPE" visible
- [ ] **No BU warning** : retirer la BU de Tim → pill amber "No business unit set on your profile" apparaît
- [ ] **Isolation BU** : Tim soumet une demande onboarding → visible pour Tim, **invisible** pour Marc, visible pour l'admin
- [ ] **Match via corporate_email** : Marc soumet une demande avec `corporate_email = xxx@vo-event.be` sans renseigner business_unit dans le form → demande visible pour Marc, invisible pour Tim
- [ ] **Doublon évité** : Patricia (VO EUROPE) voit la demande de Tim, ligne marquée "by Tim"
- [ ] **Bouton Cancel propriétaire** : Patricia ouvre la demande de Tim → "Cancel" **caché**. Tim ouvre sa demande → "Cancel" visible.
- [ ] **Status buttons admin only** : Tim/Patricia voient leur demande pending → boutons "Start Processing"/"Mark Ready"/"Reserve kit" **cachés**. Admin les voit.
- [ ] **Cancel pending** : Tim clique Cancel sur sa demande pending → DELETE OK, demande disparaît
- [ ] **Cancel non-pending** : admin passe une demande de Tim à `in_progress` → Tim peut toujours Cancel (DELETE policy ne gate pas sur status)
- [ ] **Admin pas impacté** : admin voit/modifie/delete tout sans restriction
- [ ] **Traçabilité** : en DB, `it_requests.onboarded_by_manager_id` rempli avec l'id du manager soumetteur ; NULL pour les soumissions admin

---

## A4 — Hot indexes

### Ce que ça fait

Trois index composites partiels qui collent aux requêtes de liste les plus chaudes du codebase.

### Changements

Migration `111_hot_indexes.sql` :

| Index | Table | Colonnes | Filtre partiel |
|-------|-------|----------|----------------|
| `idx_it_requests_requester_created` | `it_requests` | `(requester_id, created_at DESC)` | `WHERE deleted_at IS NULL` |
| `idx_loan_requests_user_status_created` | `loan_requests` | `(user_id, status, created_at DESC)` | `WHERE deleted_at IS NULL` |
| `idx_profiles_role_created` | `profiles` | `(role, created_at DESC)` | `WHERE is_active = TRUE` |

### Tests à valider

- [ ] **Présence** :
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename IN ('it_requests','loan_requests','profiles')
    AND indexname LIKE 'idx_%_created';
  ```
  → 3 lignes
- [ ] **Plan utilisé** :
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM it_requests
  WHERE requester_id = '<uuid d'un user actif>'
  ORDER BY created_at DESC LIMIT 20;
  ```
  → doit utiliser `idx_it_requests_requester_created` (et non un seq scan)

---

## A5 — Notification recipients fan-out

### Ce que ça fait

Quand un user soumet une demande (ou que son statut change), envoyer un email à chaque ligne de `notification_recipients` dont le toggle correspondant est `true` ET `is_active = true`.

### Pourquoi DB trigger écarté

Le rapport d'exploration a confirmé que :
- Aucun pattern `pg_net → send-email` n'existe dans la base
- L'edge function `send-email` exige un Bearer token (impossible depuis un trigger SQL sans gérer le service role + rate-limit en SQL)
- Les toggles individuels par recipient demandent de l'évaluation côté client de toute façon

Décision : helper client-side fire-and-forget appelé après chaque insert.

### Changements

**Nouveau fichier `src/lib/api/notify-recipients.ts`**
- Helper `notifyRecipients({ kind, event, submitter, subject, detail })`
- Map des toggles :
  - `new_request` → `notify_on_new_request`
  - `status_change` → `notify_on_status_change`
  - `return` → `notify_on_return`
- Filtre `is_active = true AND <toggle> = true`
- Subject + body HTML construits localement
- Fire-and-forget : erreur recipient n'interrompt jamais le submit user

**Wirings**
- `OnboardingRequestPage` (kind: onboarding)
- `OffboardingRequestPage` (kind: offboarding)
- `EquipmentRequestPage` (kind: equipment)
- `FunctionalMailboxFormPage` (kind: mailbox)
- `ItRequestFormPage` (kind: it)
- `sendStatusChangeEmail` dans `request-status-service.ts` → déclenche `event: 'status_change'`
- Helper `notifyReturnRecipients()` exposé pour le flow de retour équipement (à brancher quand le UI return sera prêt)

### Tests à valider

#### Préalable
Via `/admin/email-templates` (ou la page de gestion `notification_recipients`), créer :
```
email: test@example.com
is_active: true
notify_on_new_request: true
notify_on_status_change: true
notify_on_return: true
```

- [ ] **New request — onboarding** : soumettre via `/onboarding-request` → test@example.com reçoit "[VO Hub] Onboarding request submitted: <nom>"
- [ ] **New request — offboarding** : soumettre via `/offboarding-request` → email reçu
- [ ] **New request — equipment** : soumettre via `/equipment-request` → email reçu
- [ ] **New request — mailbox** : soumettre via `/functional-mailbox` → email reçu
- [ ] **New request — IT** : soumettre via `/it-request` → email reçu
- [ ] **Toggle off** : `notify_on_new_request = false` sur le recipient → soumettre → **aucun email** (mais submit OK côté user)
- [ ] **Status change** : admin passe une demande pending → in_progress → email "[VO Hub] … updated: New status: in progress"
- [ ] **Recipient inactif** : `is_active = false` → aucun email même si tous les toggles à true
- [ ] **Pas de blocage** : couper temporairement Resend (ou bad RESEND_API_KEY) → user submit doit toujours réussir, warning console mais pas d'erreur UI
- [ ] **Multi-recipients** : créer 2 recipients actifs → les 2 reçoivent l'email

### ⚠️ Note

L'ancien hardcodé `admin@vo-group.be` (présent dans onboarding/offboarding/equipment/IT pages) a été **conservé** en parallèle pour ne pas casser le flux existant. Quand `admin@vo-group.be` sera dans `notification_recipients`, on pourra retirer les `sendEmail({ to: 'admin@vo-group.be', ... })` legacy.

---

## A6 — TypeScript strict full

### Statut

⚠️ **Reporté à Phase B** — hors scope de Phase A.

### Diagnostic

```bash
npx tsc --noEmit --strict
# 1102 erreurs (principalement TS7006 implicit any sur paramètres, TS7053 indexation)
```

Le codebase passe `"strict": true` aujourd'hui uniquement grâce à `noImplicitAny: false` + `strictNullChecks: false` qui désactivent les deux flags qui produisent l'essentiel des erreurs.

### Changements

- `tsconfig.json` annoté avec un TODO clair pointant vers la passe de typage à venir
- Aucun changement de comportement

### Tests à valider

- [ ] `npm run typecheck` reste vert
- [ ] `npm run lint` reste vert
- [ ] `npm test` reste vert (61/61)

---

## A7 — Tests SQL fn_audit

### Ce que ça fait

Suite de 7 assertions SQL qui vérifient que le trigger `fn_audit()` (migrations 100 + 108) capture correctement les actions et produit des diffs compacts.

### Changements

Nouveau fichier `supabase/tests/fn_audit_test.sql`. Tout est emballé dans `BEGIN … ROLLBACK`, donc le test ne persiste rien.

Les 7 assertions couvrent :
1. INSERT → `action = 'create'`
2. UPDATE pure `updated_at` (sans autre changement) → **pas de log** (skip no-op)
3. Changement de status → `action = 'status:<new>'`
4. Diff compact (seules les clés modifiées)
5. UPDATE plain → `action = 'update'`
6. DELETE → `action = 'delete'` avec `old_values`
7. Changement de role sur profiles → `action = 'role:<new>'`

### Tests à valider

- [ ] Exécution :
  ```bash
  psql "$DATABASE_URL" -f supabase/tests/fn_audit_test.sql
  ```
  Attendu :
  ```
  NOTICE:  fn_audit_test: all 7 assertions passed
  ROLLBACK
  ```
- [ ] Aucune ligne ajoutée en DB après le run (`SELECT count(*) FROM audit_logs` identique avant/après)
- [ ] Re-run depuis un compte non-admin (psql avec un JWT user) : vérifier qu'`audit_logs` reçoit quand même la row (test du SECURITY DEFINER)

---

## A2 — Squash baseline

### Statut

⚠️ **Documenté seulement** — la génération d'un vrai baseline demande un `pg_dump` contre staging/prod, impossible depuis ce contexte sans accès DB.

### Changements

**`supabase/full_schema.sql`** — réécrit l'en-tête en gros avertissement de dépréciation. Le fichier est conservé pour ne pas casser les liens externes mais flagué comme inutilisable pour provisionner une nouvelle base (il ne couvrait que les migrations 001–004 sur les 111 actuelles).

**Nouveau `supabase/migrations/README.md`** — documente :
- Les règles de migration (idempotence, BEGIN/COMMIT, drop-before-create)
- La numérotation
- La stratégie de squash recommandée : `pg_dump --schema-only` contre l'env source, archiver les migrations historiques en `git rm` (l'historique git reste consultable)
- Le test `fn_audit_test.sql` et son usage

### Tests à valider

- [ ] Lire `supabase/migrations/README.md` et valider la stratégie (squash via pg_dump plutôt que concat manuelle)
- [ ] Vérifier qu'aucun script de CI / onboarding / Docker compose ne pointe encore vers `supabase/full_schema.sql` (le marqueur de dépréciation est en haut du fichier)

---

## Récap : à faire après merge

1. **Avant le déploiement** : tester localement avec `supabase db push` sur une DB de dev
2. **Migrations en ordre** : `109` → `110` → `111`
3. **Vérification fn_audit** : `psql -f supabase/tests/fn_audit_test.sql`
4. **Notification recipients** : créer au moins 1 ligne dans la table (sinon le fan-out est silencieux par construction)
5. **ACT-EVENTS** : valider le pattern email (initial_last par défaut, modifiable via `/admin/business-units`)
6. **Profiles managers** : vérifier que chaque Manager actif a bien une `business_unit` set (sinon il ne voit plus rien)

## Backlog Phase B (sorti du scope A)

- **A6** suite : tightening progressif `noImplicitAny` + `strictNullChecks` — ~1100 erreurs à dérouler par module
- **A2** suite : `pg_dump` sur prod → baseline réel → archivage des 111 migrations
- **A5** suite : retirer les `sendEmail({ to: 'admin@vo-group.be', ... })` legacy une fois que `notification_recipients` est seeded avec l'admin
- Brancher `notifyReturnRecipients()` sur le flow de retour équipement (`event = 'return'`)
- Phase C+ : tables fantômes (`extension_requests`, `qr_kits`, `qr_kit_items`, `personal_info_submissions`, `offboarding_processes`) à wirer ou drop selon décision
