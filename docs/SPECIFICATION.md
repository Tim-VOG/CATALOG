# EquipLend - Specification Complète

> Application web interne de catalogue et prêt de matériel IT (type e-commerce sans paiement)

---

## Livrable 1 : Liste exhaustive des fonctionnalités

### Module 1 — Catalogue

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| CAT-01 | Arbre de catégories | Catégories hiérarchiques (ex: PC > Laptop > Dell). Jusqu'à 3 niveaux. |
| CAT-02 | Fiches produit | Nom, description, spécifications techniques (attributs clé/valeur), images multiples, documents techniques (PDF), stock, état. |
| CAT-03 | Variantes / Configurations | Un même modèle peut exister en plusieurs configs (RAM, stockage, OS). Chaque variante a son propre stock. |
| CAT-04 | Bundles / Kits | Regroupement de produits prédéfinis (ex: "Kit Visio" = laptop + webcam + casque). Un bundle réserve tous ses items en une fois. |
| CAT-05 | Produits liés — Accessoires | Relation many-to-many entre un produit et ses accessoires recommandés (cross-sell). |
| CAT-06 | Produits liés — Alternatives | Suggestion de produits similaires (même catégorie, specs proches). |
| CAT-07 | Tags / Labels | Tags libres pour filtrage transversal (ex: "télétravail", "présentation", "dev"). |
| CAT-08 | Attributs dynamiques | Attributs personnalisés par catégorie (RAM, CPU, résolution, ports, OS, etc.). Configurables en back-office. |
| CAT-09 | Images multiples | Galerie d'images par produit. Image principale + secondaires. Upload drag & drop. |
| CAT-10 | Documents techniques | Pièces jointes (PDF datasheet, guide utilisateur) par produit. |
| CAT-11 | Statut produit | Draft / Publié / Archivé / Hors service. Seuls les publiés apparaissent côté utilisateur. |
| CAT-12 | Produits favoris | L'utilisateur peut marquer des produits en favoris pour y revenir rapidement. |
| CAT-13 | Produits récemment consultés | Historique de navigation de l'utilisateur (derniers produits vus). |

### Module 2 — Navigation & Recherche

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| NAV-01 | Recherche full-text | Recherche par nom, description, tags, attributs. Tolérance fautes de frappe (fuzzy). |
| NAV-02 | Filtres à facettes | Filtrage par catégorie, tags, disponibilité, attributs (RAM, OS...), état. Combinables. |
| NAV-03 | Tri | Par nom, date d'ajout, popularité, disponibilité. |
| NAV-04 | Pagination / Infinite scroll | Pagination côté serveur. Option infinite scroll côté front. |
| NAV-05 | Vue grille / liste | Basculement entre affichage en grille (cards) et liste (tableau). |
| NAV-06 | Breadcrumb | Fil d'Ariane basé sur la hiérarchie de catégories. |
| NAV-07 | Recherche auto-complete | Suggestions en temps réel pendant la saisie (produits, catégories, tags). |
| NAV-08 | Filtres sauvegardés | L'utilisateur peut sauvegarder une combinaison de filtres. |

### Module 3 — Panier

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| PAN-01 | Ajout au panier | Ajout d'un produit avec quantité et période de prêt souhaitée. |
| PAN-02 | Panier multi-lignes | Plusieurs produits avec quantités indépendantes. |
| PAN-03 | Période de prêt | Choix de dates début/fin. Globale (tout le panier) ou par ligne. |
| PAN-04 | Vérification dispo temps réel | À chaque modification du panier, vérification de la disponibilité sur la période choisie. |
| PAN-05 | Suggestion accessoires | Lors de l'ajout d'un produit, proposition d'accessoires liés (cross-sell). |
| PAN-06 | Panier persistant | Le panier est sauvegardé en base (pas seulement localStorage). Survit aux sessions. |
| PAN-07 | Panier brouillon | Possibilité de sauvegarder un panier nommé pour y revenir plus tard. |
| PAN-08 | Dupliquer une demande | Créer un nouveau panier à partir d'une demande passée (pré-remplissage). |
| PAN-09 | Suppression / modification | Modifier quantités, changer dates, retirer un item. |
| PAN-10 | Résumé panier | Vue récapitulative avec tous les items, périodes, disponibilités. |
| PAN-11 | Alertes panier | Notification si un item du panier devient indisponible pendant la composition. |

### Module 4 — Checkout (Soumission de demande)

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| CHK-01 | Formulaire Projet | Formulaire structuré obligatoire (cf. Livrable 2 pour détails). |
| CHK-02 | Validation formulaire | Validations côté client + serveur (champs obligatoires, formats, dates cohérentes). |
| CHK-03 | Récapitulatif avant envoi | Page de résumé : panier + infos projet + dates + règles acceptées. |
| CHK-04 | Soumission | Création de la demande en base. Statut initial = "pending". |
| CHK-05 | Confirmation | Page + email de confirmation avec numéro de demande. |
| CHK-06 | Consentement | Checkbox obligatoire : acceptation des règles d'utilisation du matériel. |

### Module 5 — Gestion utilisateur

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| USR-01 | SSO Microsoft | Authentification via Microsoft Entra ID (Azure AD). OIDC / OAuth2. |
| USR-02 | Profil utilisateur | Nom, email, téléphone, organisation, département — pré-remplis depuis Microsoft Graph. |
| USR-03 | Dashboard utilisateur | Vue d'ensemble : demandes en cours, prêts actifs, historique. |
| USR-04 | Historique emprunts | Liste complète de tous les prêts passés et en cours, avec filtres/tri. |
| USR-05 | Favoris | Liste des produits marqués en favoris. |
| USR-06 | Paniers sauvegardés | Accès aux brouillons de panier. |
| USR-07 | Notifications utilisateur | Centre de notifications in-app + emails. |
| USR-08 | Préférences | Langue, fuseau horaire, fréquence des emails. |

### Module 6 — Notifications

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| NTF-01 | Email confirmation demande | Email à l'utilisateur à la soumission. |
| NTF-02 | Email approbation/refus | Email à l'utilisateur quand sa demande est traitée. |
| NTF-03 | Email rappel retrait | Rappel X jours avant la date de retrait. |
| NTF-04 | Email rappel retour | Rappel X jours avant la date de retour prévue. |
| NTF-05 | Email retard | Notification si retour en retard (escalade possible). |
| NTF-06 | Notification in-app | Centre de notifications avec bell icon + badge counter. |
| NTF-07 | Notification admin | Email/in-app quand une nouvelle demande arrive (pour les approbateurs). |
| NTF-08 | Notification stock bas | Alerte admin quand un produit passe sous le seuil de stock critique. |
| NTF-09 | Digest périodique | Résumé hebdomadaire optionnel pour les admins (demandes, retards, stock). |
| NTF-10 | Templates configurables | Templates email éditables en back-office (sujet, corps, variables). |

### Module 7 — Suivi de demande / commande

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| TRK-01 | Statuts de demande | pending → approved → reserved → picked_up → returned → closed (+ rejected, cancelled). |
| TRK-02 | Timeline / historique | Journal chronologique de chaque changement de statut avec horodatage et auteur. |
| TRK-03 | Détail demande | Vue complète : infos projet, items, dates, statut, commentaires, pièces jointes. |
| TRK-04 | Commentaires | Fil de discussion sur une demande (utilisateur ↔ admin). |
| TRK-05 | Pièces jointes | Upload de documents sur une demande (bon de retrait signé, photos...). |
| TRK-06 | Annulation | L'utilisateur peut annuler une demande tant qu'elle n'est pas "picked_up". |
| TRK-07 | Extension de prêt | Demande d'extension de la date de retour (soumise à approbation). |
| TRK-08 | Retour anticipé | L'utilisateur signale un retour avant la date prévue. |

### Module 8 — Retours

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| RET-01 | Check-in retour | L'admin enregistre le retour physique du matériel. |
| RET-02 | État du matériel | Saisie de l'état au retour : bon / usure mineure / endommagé / perdu. |
| RET-03 | Notes de retour | Commentaires sur l'état du matériel au retour. |
| RET-04 | Remise en stock | Après check-in, le stock disponible est automatiquement incrémenté. |
| RET-05 | Mise en maintenance | Option de placer un item en maintenance au lieu de le remettre en stock directement. |
| RET-06 | Bon de retour | Génération PDF optionnelle d'un bon de retour (signature). |

### Module 9 — Back-office complet

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| ADM-01 | Dashboard admin | KPIs : items prêtés, demandes en attente, retards, stock critique, taux d'utilisation. |
| ADM-02 | CRUD produits | Création, édition, suppression, archivage de produits. |
| ADM-03 | CRUD catégories | Gestion de l'arbre de catégories. |
| ADM-04 | CRUD tags | Gestion des tags. |
| ADM-05 | Gestion attributs | Définition des attributs par catégorie (RAM, CPU, OS...). |
| ADM-06 | Gestion stock | Vue par produit : total, disponible, réservé, prêté, en maintenance. Numéros de série. |
| ADM-07 | Gestion bundles | Création/édition de kits pré-configurés. |
| ADM-08 | Gestion demandes | Liste, filtres, détail, approbation/refus, commentaires. |
| ADM-09 | Gestion retraits | Check-out : confirmer le retrait physique, générer un bon. |
| ADM-10 | Gestion retours | Check-in : confirmer le retour, saisir l'état, remettre en stock. |
| ADM-11 | Gestion utilisateurs | Liste, profils, rôles, désactivation. |
| ADM-12 | Gestion permissions | Rôles, groupes, règles d'accès. |
| ADM-13 | Quotas & règles | Limites par utilisateur/projet (durée max, quantité max, catégories restreintes). |
| ADM-14 | Règles d'approbation | Workflow configurable (auto-approbation sous seuil, approbation manager, multi-niveaux). |
| ADM-15 | Templates notifications | Édition des templates d'email. |
| ADM-16 | CMS contenu | Édition des pages d'aide, FAQ, règles d'utilisation, bannières. |
| ADM-17 | Theme / Design | Personnalisation visuelle (couleurs, typographies, logo, header/footer). |
| ADM-18 | Exports | Export CSV/XLSX des produits, demandes, historique. |
| ADM-19 | Audit log | Journal complet de toutes les actions admin (qui, quoi, quand). |
| ADM-20 | Configuration globale | Paramètres : durée de prêt par défaut, buffer maintenance, seuils d'alerte. |

### Module 10 — Calendrier & disponibilités

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| CAL-01 | Vue calendrier produit | Pour chaque produit, calendrier montrant les périodes réservées/disponibles. |
| CAL-02 | Vue calendrier global | Vue d'ensemble de toutes les réservations (filtrable par catégorie/produit). |
| CAL-03 | Détection de conflits | Empêcher une réservation si stock insuffisant sur la période. |
| CAL-04 | Buffer maintenance | Période configurable entre deux prêts (nettoyage, vérification). |
| CAL-05 | Extension de réservation | Prolonger une réservation existante (si stock disponible). |
| CAL-06 | Retour anticipé | Libérer les créneaux restants quand un retour est fait en avance. |

### Module 11 — Reporting & analytics

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| RPT-01 | Taux d'utilisation | Par produit, catégorie, période. |
| RPT-02 | Produits les plus demandés | Classement par nombre de demandes. |
| RPT-03 | Retards | Liste et statistiques des retours en retard. |
| RPT-04 | Stock critique | Alertes sur les items sous le seuil minimum. |
| RPT-05 | Historique par utilisateur | Tous les emprunts d'un utilisateur donné. |
| RPT-06 | Rapport par projet | Matériel emprunté par projet. |
| RPT-07 | Exports | CSV, XLSX. |
| RPT-08 | Dashboard graphique | Graphiques : courbes d'utilisation, barres de demandes, camembert catégories. |

### Module 12 — Qualité, performance, accessibilité

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| QUA-01 | WCAG AA | Conformité accessibilité niveau AA. |
| QUA-02 | Responsive | Mobile-first pour la consultation, desktop pour l'admin. |
| QUA-03 | Performance | Lighthouse > 90. Lazy loading images, code splitting, pagination serveur. |
| QUA-04 | Multilingue | FR / NL / EN. i18n avec détection de la langue du navigateur + choix utilisateur. |
| QUA-05 | Indexation interne | Recherche full-text indexée (Supabase full-text search ou Meilisearch). |
| QUA-06 | Cache | Cache API (SWR/React Query), cache serveur (CDN pour les assets statiques). |

### Module 13 — Sécurité, audit, conformité

| ID | Fonctionnalité | Description |
|----|---------------|-------------|
| SEC-01 | RBAC | Contrôle d'accès basé sur les rôles. Vérifié côté serveur (RLS Supabase + middleware). |
| SEC-02 | Audit log | Chaque action critique est journalisée (qui, quoi, quand, IP, user-agent). |
| SEC-03 | Rate limiting | Protection contre l'abus (trop de requêtes). |
| SEC-04 | CSRF / XSS | Protection standard via framework (React échappe par défaut, tokens CSRF si cookies). |
| SEC-05 | RGPD | Minimisation des données, droit à l'oubli, export des données personnelles, politique de rétention. |
| SEC-06 | Gestion des secrets | Variables d'environnement, pas de secrets dans le code. Vault optionnel. |
| SEC-07 | Logs | Logs applicatifs structurés (JSON), rotation, rétention configurable. |
| SEC-08 | Observabilité | Métriques (temps de réponse, erreurs), traces, alertes. |

---

## Livrable 2 : Spécification fonctionnelle

### 2.1 User Stories

#### Utilisateur (Employé)

| ID | User Story | Critères d'acceptation |
|----|-----------|----------------------|
| US-01 | En tant qu'employé, je veux me connecter via SSO Microsoft pour accéder à l'application sans créer de compte séparé. | Le bouton "Se connecter avec Microsoft" déclenche le flux OIDC. Le profil est créé/mis à jour automatiquement depuis Azure AD. |
| US-02 | En tant qu'employé, je veux parcourir le catalogue par catégories et filtres pour trouver le matériel dont j'ai besoin. | Les catégories sont affichées en sidebar/nav. Les filtres (catégorie, dispo, tags, attributs) se combinent. La recherche full-text fonctionne. |
| US-03 | En tant qu'employé, je veux consulter la fiche d'un produit pour voir ses spécifications, images, disponibilités et accessoires recommandés. | La fiche affiche : images, description, specs (attributs), stock dispo, calendrier de disponibilité, accessoires liés, bouton "ajouter au panier". |
| US-04 | En tant qu'employé, je veux ajouter des produits à mon panier avec une quantité et une période de prêt. | L'ajout au panier ouvre un picker de dates + quantité. La dispo est vérifiée en temps réel. Les accessoires liés sont suggérés. |
| US-05 | En tant qu'employé, je veux vérifier la disponibilité sur un calendrier avant de réserver. | Un calendrier interactif montre les créneaux occupés (grisés) et disponibles (verts). L'utilisateur sélectionne sa période. |
| US-06 | En tant qu'employé, je veux soumettre une demande de prêt en remplissant un formulaire projet. | Le formulaire est affiché au checkout. Tous les champs obligatoires sont validés. La soumission crée une demande en statut "pending". |
| US-07 | En tant qu'employé, je veux suivre le statut de mes demandes (en attente, approuvé, refusé, etc.). | Le dashboard montre mes demandes avec leur statut actuel, une timeline des changements, et des notifications par email à chaque transition. |
| US-08 | En tant qu'employé, je veux annuler une demande tant qu'elle n'a pas été retirée. | Un bouton "Annuler" est disponible sur les demandes en statut pending/approved/reserved. Le stock est libéré. |
| US-09 | En tant qu'employé, je veux demander une extension de prêt si j'ai besoin du matériel plus longtemps. | Un bouton "Demander extension" sur les prêts actifs ouvre un formulaire de nouvelle date. L'extension est soumise à approbation. |
| US-10 | En tant qu'employé, je veux consulter mon historique complet d'emprunts. | Une page "Historique" affiche tous les prêts passés avec filtres par date, produit, statut. |
| US-11 | En tant qu'employé, je veux dupliquer une demande passée pour gagner du temps. | Un bouton "Refaire cette demande" pré-remplit le panier + formulaire avec les données d'un prêt précédent. |
| US-12 | En tant qu'employé, je veux recevoir des rappels avant la date de retour. | Un email est envoyé J-3 et J-1 avant la date de retour. Notification in-app également. |

#### Admin / Gestionnaire

| ID | User Story | Critères d'acceptation |
|----|-----------|----------------------|
| US-20 | En tant qu'admin, je veux approuver ou refuser une demande de prêt avec un motif. | La liste des demandes en attente est accessible. Chaque demande a un bouton Approuver/Refuser. Le refus exige un motif. L'utilisateur est notifié. |
| US-21 | En tant qu'admin, je veux gérer le catalogue (CRUD produits, catégories, tags, attributs). | Interface back-office avec formulaires complets. Upload d'images. Gestion des variantes et bundles. |
| US-22 | En tant qu'admin, je veux enregistrer le retrait physique d'un matériel (check-out). | Page de gestion des retraits. Scan/sélection de la demande. Confirmation du retrait. Changement de statut → picked_up. |
| US-23 | En tant qu'admin, je veux enregistrer le retour physique d'un matériel (check-in). | Page de gestion des retours. Saisie de l'état du matériel. Changement de statut → returned/maintenance. Stock mis à jour. |
| US-24 | En tant qu'admin, je veux voir un dashboard avec les KPIs (taux utilisation, retards, stock critique). | Dashboard avec widgets : graphiques d'utilisation, liste retards, alertes stock bas, demandes en attente. |
| US-25 | En tant qu'admin, je veux exporter les données (produits, demandes, historique) en CSV/XLSX. | Bouton export sur chaque vue de liste. Filtres appliqués à l'export. |
| US-26 | En tant qu'admin, je veux configurer les templates d'email de notification. | Éditeur de templates avec variables (nom, produit, date...). Preview avant sauvegarde. |
| US-27 | En tant qu'admin, je veux gérer le contenu des pages d'aide et FAQ. | CMS simple : éditeur WYSIWYG pour pages d'aide, FAQ, règles d'utilisation. |
| US-28 | En tant qu'admin, je veux personnaliser l'apparence (couleurs, logo, bannières). | Interface de personnalisation du thème. Preview en temps réel. Publication avec rollback possible. |
| US-29 | En tant qu'admin, je veux consulter l'audit log de toutes les actions. | Page d'audit avec filtres par utilisateur, action, date. Détail de chaque entrée. Export possible. |
| US-30 | En tant qu'admin, je veux définir des quotas et règles (durée max, quantité max par utilisateur). | Page de configuration avec règles : durée max de prêt, nb max d'items simultanés, catégories restreintes par rôle. |

### 2.2 Formulaire Projet (détaillé)

| Champ | Type | Obligatoire | Validation | Notes |
|-------|------|:-----------:|-----------|-------|
| Nom du projet | text | Oui | min 3, max 200 chars | — |
| Description / objectif | textarea | Oui | min 10, max 2000 chars | — |
| Business owner / responsable | user-picker | Oui | Doit être un user valide | Auto-suggestion via Microsoft Graph |
| Équipe / participants | multi-user-picker | Non | — | Auto-suggestion via Microsoft Graph |
| Date début prêt | date | Oui | >= aujourd'hui | Pré-rempli depuis le panier |
| Date fin prêt | date | Oui | > date début | Pré-rempli depuis le panier |
| Localisation (site/bureau) | select | Oui | Valeur parmi liste configurable | Liste gérée en back-office |
| Justification du besoin | textarea | Oui | min 10, max 1000 chars | — |
| Priorité | select | Oui | low / medium / high / critical | — |
| Besoins spécifiques | textarea | Non | max 2000 chars | Logiciels, configs, OS, accessoires spéciaux |
| Commentaires | textarea | Non | max 2000 chars | — |
| Pièces jointes | file-upload | Non | max 5 fichiers, 10 MB chacun, PDF/DOCX/PNG/JPG | — |
| Consentement règles d'usage | checkbox | Oui | Doit être coché | Lien vers les règles d'utilisation |
| Consentement responsabilité | checkbox | Oui | Doit être coché | "Je m'engage à retourner le matériel en bon état" |

### 2.3 Règles métier principales

| ID | Règle | Description |
|----|-------|-------------|
| BR-01 | Disponibilité | Une réservation ne peut être créée que si le stock disponible est suffisant sur toute la période demandée. |
| BR-02 | Chevauchement | Le calcul de disponibilité tient compte de toutes les réservations existantes (pending, approved, reserved, picked_up) sur la période. |
| BR-03 | Buffer maintenance | Un intervalle configurable (par défaut 1 jour) est imposé entre deux prêts consécutifs d'un même item. |
| BR-04 | Durée max | La durée de prêt ne peut excéder la limite configurée (par défaut 90 jours). Extensible sur demande. |
| BR-05 | Quota utilisateur | Un utilisateur ne peut pas avoir plus de N items empruntés simultanément (configurable, par défaut 5). |
| BR-06 | Annulation | Une demande peut être annulée par l'utilisateur tant que le statut n'est pas "picked_up". |
| BR-07 | Expiration auto | Une demande "pending" non traitée expire après X jours (configurable, par défaut 7). |
| BR-08 | Retard | Un prêt est marqué "overdue" automatiquement à J+1 après la date de retour prévue. Notification escalade à J+3 et J+7. |
| BR-09 | Extension | Une extension prolonge la date de retour. Elle est soumise à approbation et vérification de disponibilité. |
| BR-10 | Retour anticipé | Un retour avant la date prévue libère immédiatement le créneau restant pour d'autres réservations. |
| BR-11 | Bundle atomique | Un bundle se réserve en entier. Si un seul item du bundle n'est pas disponible, le bundle est indisponible. |
| BR-12 | Approbation auto | Option : les demandes sous un certain seuil (ex: 1 item, durée < 7 jours) peuvent être auto-approuvées. |

---

## Livrable 3 : Modèle de données

### 3.1 Schéma relationnel (tables principales)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MODÈLE DE DONNÉES                              │
└─────────────────────────────────────────────────────────────────────────┘

profiles                         categories
┌──────────────────────┐        ┌──────────────────────┐
│ id (PK, UUID)        │        │ id (PK, UUID)        │
│ azure_oid            │        │ name                 │
│ email                │        │ slug                 │
│ first_name           │        │ description          │
│ last_name            │        │ color                │
│ phone                │        │ icon                 │
│ department           │        │ parent_id (FK→self)  │
│ organization         │        │ sort_order           │
│ job_title            │        │ created_at           │
│ role (enum)          │        │ updated_at           │
│ avatar_url           │        └──────────┬───────────┘
│ locale               │                   │
│ is_active            │                   │
│ last_login_at        │                   │
│ created_at           │        ┌──────────┴───────────┐
│ updated_at           │        │ category_attributes  │
└──────────┬───────────┘        │                      │
           │                    │ id (PK)              │
           │                    │ category_id (FK)     │
           │                    │ name                 │
           │                    │ type (enum)          │
           │                    │ options (JSONB)      │
           │                    │ is_required          │
           │                    │ sort_order           │
           │                    └──────────────────────┘
           │
           │                    products
           │                    ┌──────────────────────┐
           │                    │ id (PK, UUID)        │
           │                    │ name                 │
           │                    │ slug                 │
           │                    │ description          │
           │                    │ category_id (FK)     │
           │                    │ sku                  │
           │                    │ status (enum)        │
           │                    │ total_stock          │
           │                    │ min_stock_alert      │
           │                    │ max_loan_days        │
           │                    │ buffer_days          │
           │                    │ attributes (JSONB)   │
           │                    │ includes (text[])    │
           │                    │ created_at           │
           │                    │ updated_at           │
           │                    └──────────┬───────────┘
           │                               │
           │            ┌──────────────────┼──────────────────┐
           │            │                  │                  │
           │   product_images    product_documents   product_relations
           │   ┌──────────────┐  ┌──────────────┐   ┌──────────────────┐
           │   │ id (PK)      │  │ id (PK)      │   │ id (PK)          │
           │   │ product_id   │  │ product_id   │   │ product_id (FK)  │
           │   │ url          │  │ name         │   │ related_id (FK)  │
           │   │ alt_text     │  │ url          │   │ type (enum)      │
           │   │ is_primary   │  │ type         │   │  accessory /     │
           │   │ sort_order   │  │ size_bytes   │   │  alternative /   │
           │   └──────────────┘  │ uploaded_at  │   │  bundle_item     │
           │                     └──────────────┘   │ sort_order       │
           │                                        └──────────────────┘
           │
           │                    inventory_items
           │                    ┌──────────────────────┐
           │                    │ id (PK, UUID)        │
           │                    │ product_id (FK)      │
           │                    │ serial_number        │
           │                    │ asset_tag            │
           │                    │ status (enum)        │
           │                    │  available /         │
           │                    │  reserved /          │
           │                    │  loaned /            │
           │                    │  maintenance /       │
           │                    │  lost / retired      │
           │                    │ location             │
           │                    │ condition (enum)     │
           │                    │ notes                │
           │                    │ purchased_at         │
           │                    │ created_at           │
           │                    │ updated_at           │
           │                    └──────────────────────┘
           │
           │
    loan_requests
    ┌──────────────────────────┐
    │ id (PK, UUID)            │
    │ request_number (unique)  │    loan_request_items
    │ user_id (FK→profiles)    │    ┌──────────────────────────┐
    │ status (enum)            │    │ id (PK, UUID)            │
    │ project_name             │    │ request_id (FK)          │
    │ project_description      │    │ product_id (FK)          │
    │ business_owner_id (FK)   │    │ quantity                 │
    │ team_members (UUID[])    │    │ start_date               │
    │ start_date               │    │ end_date                 │
    │ end_date                 │    │ notes                    │
    │ location                 │    │ status (enum)            │
    │ justification            │    └──────────────────────────┘
    │ priority (enum)          │
    │ specific_needs           │
    │ comments                 │    allocations
    │ consent_rules            │    ┌──────────────────────────┐
    │ consent_responsibility   │    │ id (PK, UUID)            │
    │ approved_by (FK)         │    │ request_item_id (FK)     │
    │ approved_at              │    │ inventory_item_id (FK)   │
    │ rejection_reason         │    │ allocated_at             │
    │ expires_at               │    │ picked_up_at             │
    │ created_at               │    │ returned_at              │
    │ updated_at               │    │ return_condition (enum)  │
    └──────────────────────────┘    │ return_notes             │
                                    └──────────────────────────┘

    tags                        product_tags
    ┌──────────────────┐        ┌──────────────────┐
    │ id (PK, UUID)    │        │ product_id (FK)  │
    │ name             │        │ tag_id (FK)      │
    │ slug             │        └──────────────────┘
    │ color            │
    └──────────────────┘

    bundles                     bundle_items
    ┌──────────────────┐        ┌──────────────────┐
    │ id (PK, UUID)    │        │ bundle_id (FK)   │
    │ name             │        │ product_id (FK)  │
    │ description      │        │ quantity         │
    │ image_url        │        └──────────────────┘
    │ is_active        │
    └──────────────────┘

    saved_carts                 saved_cart_items
    ┌──────────────────┐        ┌──────────────────┐
    │ id (PK, UUID)    │        │ cart_id (FK)     │
    │ user_id (FK)     │        │ product_id (FK)  │
    │ name             │        │ quantity         │
    │ is_active_cart   │        │ start_date       │
    │ created_at       │        │ end_date         │
    │ updated_at       │        └──────────────────┘
    └──────────────────┘

    request_attachments         request_comments
    ┌──────────────────┐        ┌──────────────────┐
    │ id (PK, UUID)    │        │ id (PK, UUID)    │
    │ request_id (FK)  │        │ request_id (FK)  │
    │ file_name        │        │ user_id (FK)     │
    │ file_url         │        │ content          │
    │ file_size        │        │ created_at       │
    │ mime_type        │        └──────────────────┘
    │ uploaded_by (FK) │
    │ uploaded_at      │
    └──────────────────┘

    audit_logs                  notifications
    ┌──────────────────────┐    ┌──────────────────────┐
    │ id (PK, UUID)        │    │ id (PK, UUID)        │
    │ user_id (FK)         │    │ user_id (FK)         │
    │ action (enum)        │    │ type (enum)          │
    │ entity_type          │    │ title                │
    │ entity_id            │    │ message              │
    │ old_values (JSONB)   │    │ link                 │
    │ new_values (JSONB)   │    │ is_read              │
    │ ip_address           │    │ email_sent           │
    │ user_agent           │    │ created_at           │
    │ created_at           │    └──────────────────────┘
    └──────────────────────┘

    cms_pages                   theme_settings
    ┌──────────────────────┐    ┌──────────────────────┐
    │ id (PK, UUID)        │    │ id (PK, UUID)        │
    │ slug                 │    │ key                  │
    │ title                │    │ value (JSONB)        │
    │ content (JSONB)      │    │ version              │
    │ status (enum)        │    │ is_active            │
    │ updated_by (FK)      │    │ created_by (FK)      │
    │ published_at         │    │ created_at           │
    │ created_at           │    └──────────────────────┘
    │ updated_at           │
    └──────────────────────┘

    locations                   app_settings
    ┌──────────────────────┐    ┌──────────────────────┐
    │ id (PK, UUID)        │    │ key (PK)             │
    │ name                 │    │ value (JSONB)        │
    │ address              │    │ updated_by (FK)      │
    │ is_active            │    │ updated_at           │
    └──────────────────────┘    └──────────────────────┘

    favorites
    ┌──────────────────┐
    │ user_id (FK)     │
    │ product_id (FK)  │
    │ created_at       │
    └──────────────────┘
```

### 3.2 Enums

```sql
-- Rôles
CREATE TYPE user_role AS ENUM ('user', 'manager', 'admin', 'super_admin');

-- Statut produit
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived', 'discontinued');

-- Statut item inventaire
CREATE TYPE inventory_status AS ENUM ('available', 'reserved', 'loaned', 'maintenance', 'lost', 'retired');

-- État physique
CREATE TYPE item_condition AS ENUM ('new', 'good', 'fair', 'poor', 'damaged');

-- Statut demande
CREATE TYPE request_status AS ENUM (
  'draft', 'pending', 'approved', 'rejected',
  'reserved', 'picked_up', 'returned',
  'overdue', 'cancelled', 'closed'
);

-- Priorité
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Type de relation produit
CREATE TYPE product_relation_type AS ENUM ('accessory', 'alternative', 'bundle_item');

-- Type d'attribut
CREATE TYPE attribute_type AS ENUM ('text', 'number', 'select', 'multi_select', 'boolean');

-- Type de notification
CREATE TYPE notification_type AS ENUM (
  'request_submitted', 'request_approved', 'request_rejected',
  'pickup_reminder', 'return_reminder', 'overdue_notice',
  'extension_requested', 'extension_approved', 'extension_rejected',
  'stock_low', 'system'
);

-- Statut page CMS
CREATE TYPE cms_status AS ENUM ('draft', 'published', 'archived');
```

### 3.3 Différences avec le schéma existant

Le schéma existant (`supabase/schema.sql`) est un MVP fonctionnel. Les ajouts majeurs :

| Existant | Proposition |
|----------|-------------|
| `loans` table unique | Séparation `loan_requests` (demande) + `loan_request_items` (lignes) + `allocations` (items physiques assignés) |
| Stock = `total_stock` (compteur) | Ajout `inventory_items` pour traçabilité par numéro de série |
| Catégories plates | Catégories hiérarchiques (`parent_id`) |
| Pas de tags | Table `tags` + `product_tags` |
| Pas de bundles | Tables `bundles` + `bundle_items` |
| Pas d'images multiples | Table `product_images` |
| Pas de panier persistant | Tables `saved_carts` + `saved_cart_items` |
| Pas d'audit log | Table `audit_logs` |
| Pas de CMS | Tables `cms_pages` + `theme_settings` |
| Profil basique | Profil enrichi (azure_oid, department, job_title, locale) |

---

## Livrable 4 : Architecture technique

### 4.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        UTILISATEURS                             │
│                    (Navigateur / Mobile)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CDN / Edge (Vercel)                          │
│              Static assets, SSR/ISR cache                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌──────────────────────┐    ┌──────────────────────────┐
│    FRONTEND          │    │     BACKEND (API)        │
│                      │    │                          │
│  React 18 (Vite)     │    │  Supabase                │
│  + React Router v6   │    │  ├─ PostgREST (API)      │
│  + TanStack Query    │    │  ├─ Auth (SSO)           │
│  + Zustand (state)   │    │  ├─ Storage (fichiers)   │
│  + react-i18next     │    │  ├─ Edge Functions       │
│  + TailwindCSS       │    │  ├─ Realtime             │
│  + shadcn/ui         │    │  └─ PostgreSQL           │
│  + react-big-cal.    │    │                          │
│  + recharts          │    │  Meilisearch (option)    │
└──────────────────────┘    └──────────────────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │  Microsoft Entra ID  │
                            │  (Azure AD)          │
                            │  ├─ OIDC/OAuth2      │
                            │  └─ Microsoft Graph  │
                            └──────────────────────┘
```

### 4.2 Choix technologiques détaillés

#### Frontend

| Composant | Choix | Justification |
|-----------|-------|---------------|
| Framework | **React 18** (existant) | Déjà en place. Écosystème riche. |
| Bundler | **Vite 5** (existant) | Déjà en place. Rapide, HMR. |
| Routing | **React Router v6** (existant) | Déjà en place. |
| State management | **Zustand** | Léger, simple, pas de boilerplate. Préféré à Redux pour cette taille d'app. |
| Data fetching | **TanStack Query (React Query)** | Cache, invalidation, optimistic updates, pagination. Essentiel pour la vérification de dispo en temps réel. |
| UI Components | **shadcn/ui** + **TailwindCSS** | Composants accessibles (Radix), personnalisables, design system cohérent. Le thème builder peut manipuler les CSS variables de Tailwind. |
| Calendrier | **react-big-calendar** ou **FullCalendar React** | Affichage calendrier de disponibilité. FullCalendar est plus complet mais plus lourd. |
| Formulaires | **React Hook Form** + **Zod** | Validation performante côté client. Zod pour les schémas partagés front/back. |
| Charts | **Recharts** | Graphiques pour le dashboard admin. Léger, React-natif. |
| i18n | **react-i18next** | Standard. Supporte FR/NL/EN. Namespaces, interpolation, pluriel. |
| Recherche | **Composant custom** + debounce | Côté client : autocomplete avec debounce. Côté serveur : Supabase full-text ou Meilisearch. |

#### Backend

| Composant | Choix | Justification |
|-----------|-------|---------------|
| BaaS | **Supabase** (existant) | Déjà en place. PostgreSQL + Auth + Storage + Realtime + Edge Functions. |
| API | **PostgREST** (via Supabase) | API REST auto-générée depuis le schéma PostgreSQL. RLS pour la sécurité. |
| Auth | **Supabase Auth** + **Microsoft OIDC** | Supabase supporte nativement Azure AD comme provider OIDC. |
| Stockage fichiers | **Supabase Storage** | Pour les images produits, documents techniques, pièces jointes des demandes. Buckets avec RLS. |
| Edge Functions | **Supabase Edge Functions** (Deno) | Pour la logique métier complexe : notifications email, cron jobs (expiration, rappels), intégration Microsoft Graph. |
| Recherche avancée | **PostgreSQL full-text search** (simple) ou **Meilisearch** (robuste) | Option simple : `tsvector` + `tsquery` natif PostgreSQL. Option robuste : Meilisearch auto-hébergé pour fuzzy search, facets, typo tolerance. |
| Email | **Resend** ou **SendGrid** | Envoi d'emails transactionnels via Edge Functions. Templates HTML. |
| Cron/Scheduler | **pg_cron** (Supabase) ou **Edge Function + cron** | Pour les tâches planifiées : expiration demandes, rappels retour, alertes retard. |

#### Authentification SSO Microsoft

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Navigateur │────>│ Supabase Auth│────>│ Microsoft Entra  │
│              │     │              │     │ ID (Azure AD)    │
│  1. Click    │     │ 2. Redirect  │     │                  │
│  "Login MS"  │     │    to Azure  │     │ 3. User login    │
│              │<────│              │<────│    + consent     │
│  6. Session  │     │ 5. Create    │     │ 4. Return token  │
│     active   │     │   session    │     │    + user info   │
└──────────────┘     └──────────────┘     └──────────────────┘
```

Configuration Supabase :
1. Dans Supabase Dashboard → Authentication → Providers → Azure
2. Configurer : Client ID, Client Secret, Tenant ID depuis Azure App Registration
3. Redirect URI : `https://<project>.supabase.co/auth/v1/callback`
4. Scopes : `openid profile email User.Read`

Pour le **compte admin local de secours** :
- Conserver le provider email/password de Supabase (désactivé par défaut pour les utilisateurs normaux)
- Restreint par un flag `is_local_admin` + IP whitelist via Edge Function middleware
- Rotation de mot de passe forcée (champ `password_changed_at`, contrôle en Edge Function)

#### Microsoft Graph (pour user-picker)

```javascript
// Edge Function : recherche d'utilisateurs dans Azure AD
const graphResponse = await fetch(
  `https://graph.microsoft.com/v1.0/users?$search="displayName:${query}"`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ConsistencyLevel: 'eventual'
    }
  }
);
```

### 4.3 Structure du projet (proposée)

```
equiplend/
├── public/
│   └── locales/           # i18n JSON files
│       ├── fr/
│       ├── nl/
│       └── en/
├── src/
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── catalog/       # Catalogue components
│   │   ├── cart/          # Panier components
│   │   ├── calendar/      # Calendrier components
│   │   ├── forms/         # Formulaire projet, etc.
│   │   ├── admin/         # Back-office components
│   │   ├── layout/        # Header, Footer, Sidebar
│   │   └── common/        # Shared (Badge, Avatar, etc.)
│   ├── pages/
│   │   ├── auth/          # Login, Callback
│   │   ├── catalog/       # Browse, ProductDetail
│   │   ├── cart/          # Cart, Checkout
│   │   ├── dashboard/     # User Dashboard
│   │   ├── requests/      # Request list, detail
│   │   └── admin/         # All admin pages
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand stores
│   ├── lib/
│   │   ├── supabase.js    # Supabase client
│   │   ├── api/           # API functions per entity
│   │   ├── auth.js        # Auth helpers
│   │   └── utils.js       # Utilities
│   ├── i18n/              # i18n config
│   ├── types/             # TypeScript types (migration recommandée)
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── supabase/
│   ├── schema.sql
│   ├── migrations/        # Incremental migrations
│   ├── functions/         # Edge Functions
│   │   ├── send-notification/
│   │   ├── cron-expiration/
│   │   ├── cron-reminders/
│   │   └── graph-users/
│   └── seed.sql           # Sample data
├── docs/
│   └── SPECIFICATION.md
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## Livrable 5 : Wireframes textuels

### 5.1 Pages Utilisateur

#### Page : Login

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              [Logo EquipLend]                             │
│                                                          │
│           Catalogue Matériel IT                           │
│                                                          │
│    ┌──────────────────────────────────────┐               │
│    │  🔐  Se connecter avec Microsoft     │               │
│    └──────────────────────────────────────┘               │
│                                                          │
│    Application réservée aux employés.                     │
│    ──────────────────────────────                         │
│    Accès admin ?  [Connexion locale]                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Page : Catalogue (Homepage)

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]   Catalogue   Mes Demandes   [🔔 3]  [Avatar ▼]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Bannière : "Nouveau : Kit Visio disponible !"]         │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 🔍 Rechercher un produit...              [🔍]   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                          │
│  Catégories :                                            │
│  [PC] [Mac] [Écrans] [iPhone] [Tablettes] [Imprimantes] │
│  [Accessoires] [Routeurs 5G]                             │
│                                                          │
│  Filtres :  Disponibilité [▼]  Tags [▼]  Attributs [▼]  │
│  Tri : [Plus récents ▼]      Vue : [▦ Grille] [☰ Liste] │
│                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ [Image]     │ │ [Image]     │ │ [Image]     │        │
│  │ Dell Lat.   │ │ MacBook Pro │ │ Dell 27"    │        │
│  │ 5540        │ │ 14"         │ │ Monitor     │        │
│  │ ─────────── │ │ ─────────── │ │ ─────────── │        │
│  │ PC > Laptop │ │ Mac > Lapt. │ │ Écrans      │        │
│  │ Stock: 7/10 │ │ Stock: 3/5  │ │ Stock: 10/12│        │
│  │ [♡] [Voir]  │ │ [♡] [Voir]  │ │ [♡] [Voir]  │        │
│  └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                          │
│  [1] [2] [3] ... [→]                                     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  © EquipLend — Aide — FAQ — Règles d'utilisation         │
└──────────────────────────────────────────────────────────┘
```

#### Page : Fiche Produit

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]   Catalogue   Mes Demandes   [🔔]  [Avatar ▼]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  PC > Laptop > Dell Latitude 5540                        │
│                                                          │
│  ┌──────────────────┐  Dell Latitude 5540                │
│  │                  │  ═══════════════════                │
│  │   [Image         │  Professional laptop               │
│  │    Galerie]      │                                    │
│  │                  │  Spécifications :                   │
│  │  [○] [○] [●] [○]│  ├ CPU : Intel i7-1365U            │
│  └──────────────────┘  ├ RAM : 16 GB                     │
│                        ├ Stockage : 512 GB SSD            │
│                        ├ OS : Windows 11 Pro              │
│                        └ Ports : USB-C, HDMI, USB-A       │
│                                                          │
│  Inclus : Chargeur                                       │
│  Tags : [télétravail] [dev] [bureautique]                │
│                                                          │
│  Stock disponible : 7 / 10                               │
│                                                          │
│  📅 Disponibilités :                                     │
│  ┌──────────────────────────────────────────────┐        │
│  │  < Février 2026 >                            │        │
│  │  Lu Ma Me Je Ve Sa Di                        │        │
│  │                          1  ░  ░             │        │
│  │  ░  ░  ░  ░  ░  ░  ░                        │        │
│  │  ░  ░  ░  ░  ░  ░  ░                        │        │
│  │  ░  ░  ░  ░  ░  ░  ░                        │        │
│  │  ░  ░  ░  ░  ░                               │        │
│  │  ░ = disponible   █ = réservé                │        │
│  └──────────────────────────────────────────────┘        │
│                                                          │
│  Période souhaitée :                                     │
│  Du [____/____/____] au [____/____/____]                 │
│  Quantité : [- 1 +]                                      │
│                                                          │
│  [♡ Favori]  [🛒 Ajouter au panier]                     │
│                                                          │
│  ─────────────────────────────────                       │
│  Accessoires recommandés :                               │
│  ┌────────────┐ ┌────────────┐                           │
│  │ Dock USB-C │ │ Sacoche    │                           │
│  │ [+ Panier] │ │ [+ Panier] │                           │
│  └────────────┘ └────────────┘                           │
│                                                          │
│  Alternatives :                                          │
│  ┌────────────┐ ┌────────────┐                           │
│  │ HP ProBook │ │ Lenovo T14 │                           │
│  │ [Voir]     │ │ [Voir]     │                           │
│  └────────────┘ └────────────┘                           │
│                                                          │
│  📄 Documents :                                          │
│  [📎 Datasheet.pdf]  [📎 Guide utilisateur.pdf]          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Page : Panier

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]   Catalogue   Mes Demandes   [🔔]  [Avatar ▼]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🛒 Mon Panier (3 articles)                              │
│                                                          │
│  Période globale : Du [24/02/2026] au [10/03/2026]       │
│  [ ] Utiliser des dates différentes par article          │
│                                                          │
│  ┌────────────────────────────────────────────────┐      │
│  │ [img] Dell Latitude 5540         Qté: [- 1 +] │      │
│  │       PC > Laptop                              │      │
│  │       ✅ Disponible sur la période              │      │
│  │       [Supprimer]                              │      │
│  ├────────────────────────────────────────────────┤      │
│  │ [img] Dell 27" Monitor           Qté: [- 2 +] │      │
│  │       Écrans                                   │      │
│  │       ✅ Disponible (2/12)                      │      │
│  │       [Supprimer]                              │      │
│  ├────────────────────────────────────────────────┤      │
│  │ [img] Présentation Clicker       Qté: [- 1 +] │      │
│  │       Accessoires                              │      │
│  │       ⚠️ Plus que 1 disponible                  │      │
│  │       [Supprimer]                              │      │
│  └────────────────────────────────────────────────┘      │
│                                                          │
│  💡 Accessoires suggérés :                               │
│  [+ HDMI Cable 2m]  [+ USB-C Cable]                     │
│                                                          │
│  [💾 Sauvegarder brouillon]                              │
│  [📋 Charger un brouillon]                               │
│  [🔄 Dupliquer une demande passée]                       │
│                                                          │
│  [Continuer vers le formulaire projet →]                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Page : Checkout (Formulaire Projet)

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]   Catalogue   Mes Demandes   [🔔]  [Avatar ▼]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📋 Formulaire de demande de prêt                        │
│                                                          │
│  Étape 2/3 : Informations projet                         │
│  [● Panier] ─── [● Projet] ─── [○ Confirmation]         │
│                                                          │
│  Nom du projet *                                         │
│  [________________________________________]              │
│                                                          │
│  Description / objectif *                                │
│  [________________________________________]              │
│  [________________________________________]              │
│                                                          │
│  Responsable (Business Owner) *                          │
│  [🔍 Rechercher un collaborateur...    ]                 │
│                                                          │
│  Équipe / Participants                                   │
│  [🔍 Ajouter des membres...           ]                 │
│  [Jean Dupont ×] [Marie Martin ×]                        │
│                                                          │
│  Dates de prêt *                                         │
│  Du [24/02/2026] au [10/03/2026]  (pré-rempli)          │
│                                                          │
│  Localisation *                                          │
│  [Bruxelles - Siège ▼]                                   │
│                                                          │
│  Justification du besoin *                               │
│  [________________________________________]              │
│                                                          │
│  Priorité *                                              │
│  (○) Basse  (○) Moyenne  (●) Haute  (○) Critique        │
│                                                          │
│  Besoins spécifiques (logiciels, configs...)             │
│  [________________________________________]              │
│                                                          │
│  Commentaires                                            │
│  [________________________________________]              │
│                                                          │
│  Pièces jointes                                          │
│  [📎 Glissez ou cliquez pour ajouter]                    │
│  projet-brief.pdf (2.1 MB) [×]                           │
│                                                          │
│  [✓] J'accepte les règles d'utilisation du matériel *    │
│  [✓] Je m'engage à retourner le matériel en bon état *   │
│                                                          │
│  [← Retour au panier]    [Voir le récapitulatif →]       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Page : Confirmation / Récapitulatif

```
┌──────────────────────────────────────────────────────────┐
│  📋 Récapitulatif de votre demande                       │
│                                                          │
│  Étape 3/3 : Confirmation                                │
│  [● Panier] ─── [● Projet] ─── [● Confirmation]         │
│                                                          │
│  Projet : Migration Datacenter Phase 2                   │
│  Responsable : Jean Dupont                               │
│  Période : 24/02/2026 → 10/03/2026 (14 jours)           │
│  Localisation : Bruxelles - Siège                        │
│  Priorité : Haute                                        │
│                                                          │
│  Articles :                                              │
│  ┌──────────────────────────────────────────┐            │
│  │ 1× Dell Latitude 5540      ✅ Disponible │            │
│  │ 2× Dell 27" Monitor        ✅ Disponible │            │
│  │ 1× Présentation Clicker    ✅ Disponible │            │
│  └──────────────────────────────────────────┘            │
│                                                          │
│  [← Modifier]         [✅ Soumettre la demande]          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Page : Dashboard Utilisateur

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]   Catalogue   Mes Demandes   [🔔]  [Avatar ▼]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Bonjour, Tim 👋                                         │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ En att.  │ │ Actifs   │ │ Retard   │ │ Total    │    │
│  │    2     │ │    3     │ │    0     │ │   24     │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                          │
│  Demandes récentes :                                     │
│  ┌────────────────────────────────────────────────┐      │
│  │ #REQ-0042  Migration DC Phase 2                │      │
│  │ 24/02/2026  ●  En attente  [Voir détails]      │      │
│  ├────────────────────────────────────────────────┤      │
│  │ #REQ-0039  Formation Dev Team                  │      │
│  │ 15/02/2026  ●  Prêté      [Voir détails]       │      │
│  ├────────────────────────────────────────────────┤      │
│  │ #REQ-0035  Demo Client Acme                    │      │
│  │ 01/02/2026  ●  Retourné   [Voir détails]       │      │
│  └────────────────────────────────────────────────┘      │
│                                                          │
│  [Voir tout l'historique →]                              │
│                                                          │
│  Prochains retours :                                     │
│  • MacBook Pro 14" — retour le 28/02/2026 (4 jours)     │
│  • Dell Monitor × 2 — retour le 05/03/2026 (9 jours)    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Pages Admin

#### Page : Dashboard Admin

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]  ADMIN  │ Dashboard │ Produits │ Demandes │ ...   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Dashboard                                               │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ En att.  │ │ Prêtés   │ │ Retards  │ │ Stock    │    │
│  │   12     │ │   47     │ │    3     │ │ critique │    │
│  │ demandes │ │ items    │ │ items    │ │    5     │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                          │
│  ┌─────────────────────────┐ ┌────────────────────────┐  │
│  │ Utilisation (30j)       │ │ Top produits demandés  │  │
│  │ [Courbe graphique]      │ │ 1. MacBook Pro   (23)  │  │
│  │                         │ │ 2. Dell Monitor  (19)  │  │
│  │                         │ │ 3. iPhone 15 Pro (14)  │  │
│  └─────────────────────────┘ └────────────────────────┘  │
│                                                          │
│  ┌─────────────────────────┐ ┌────────────────────────┐  │
│  │ Demandes en attente     │ │ Retards                │  │
│  │ #042 - Tim V. (Haute)   │ │ #035 - J.Dupont +3j   │  │
│  │ #041 - M.Martin (Moy.)  │ │ #033 - S.Peeters +1j  │  │
│  │ [Voir toutes →]         │ │ [Voir tous →]          │  │
│  └─────────────────────────┘ └────────────────────────┘  │
│                                                          │
│  Alertes stock :                                         │
│  ⚠️ Présentation Clicker : 1 restant (seuil: 2)         │
│  ⚠️ 5G Mobile Router : 0 restant                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Page : Gestion Produits (Admin)

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]  ADMIN  │ Dashboard │ Produits │ Demandes │ ...   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Produits                    [+ Nouveau produit]         │
│                              [+ Nouveau bundle]          │
│                                                          │
│  [🔍 Rechercher...]  Catégorie [▼]  Statut [▼]          │
│                                                          │
│  ┌─────┬─────────────────┬──────────┬───────┬────────┐   │
│  │     │ Nom             │ Catégorie│ Stock │ Statut │   │
│  ├─────┼─────────────────┼──────────┼───────┼────────┤   │
│  │[img]│ Dell Lat. 5540  │ PC       │ 7/10  │ Publié │   │
│  │[img]│ MacBook Pro 14" │ Mac      │ 3/5   │ Publié │   │
│  │[img]│ Dell 27" Monitor│ Écrans   │10/12  │ Publié │   │
│  │[img]│ iPhone 15 Pro   │ iPhone   │ 5/8   │ Publié │   │
│  │[img]│ Kit Visio       │ Bundle   │ 2/2   │ Draft  │   │
│  └─────┴─────────────────┴──────────┴───────┴────────┘   │
│                                                          │
│  [1] [2] [3]   Afficher [25 ▼] par page                  │
│                                                          │
│  [📥 Exporter CSV]  [📥 Exporter XLSX]                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Page : Gestion Demandes (Admin)

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]  ADMIN  │ Dashboard │ Produits │ Demandes │ ...   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Demandes de prêt                                        │
│                                                          │
│  [🔍 Rechercher...]  Statut [▼]  Priorité [▼]  Date [▼] │
│                                                          │
│  ┌───────┬──────────────┬──────────┬────────┬──────────┐ │
│  │ Réf.  │ Projet       │ Demandeur│Priorité│ Statut   │ │
│  ├───────┼──────────────┼──────────┼────────┼──────────┤ │
│  │ #0042 │ Migration DC │ Tim V.   │ Haute  │●En att.  │ │
│  │       │ 3 items      │ 24/02    │        │[Traiter] │ │
│  ├───────┼──────────────┼──────────┼────────┼──────────┤ │
│  │ #0041 │ Formation    │ M.Martin │ Moy.   │●En att.  │ │
│  │       │ 5 items      │ 23/02    │        │[Traiter] │ │
│  ├───────┼──────────────┼──────────┼────────┼──────────┤ │
│  │ #0039 │ Demo Acme    │ J.Dupont │ Haute  │●Prêté    │ │
│  │       │ 2 items      │ 15/02    │        │[Détails] │ │
│  └───────┴──────────────┴──────────┴────────┴──────────┘ │
│                                                          │
│  ──── Détail demande #0042 (panneau latéral) ────        │
│  │                                                │      │
│  │ Projet : Migration Datacenter Phase 2          │      │
│  │ Demandeur : Tim Vanholder                      │      │
│  │ Responsable : Jean Dupont                      │      │
│  │ Période : 24/02 → 10/03/2026                   │      │
│  │ Localisation : Bruxelles                       │      │
│  │ Priorité : Haute                               │      │
│  │ Justification : Besoin de matériel pour...     │      │
│  │                                                │      │
│  │ Articles :                                     │      │
│  │ • 1× Dell Latitude 5540  ✅                    │      │
│  │ • 2× Dell 27" Monitor    ✅                    │      │
│  │ • 1× Présentation Clicker ✅                   │      │
│  │                                                │      │
│  │ Pièce jointe : [📎 projet-brief.pdf]           │      │
│  │                                                │      │
│  │ [✅ Approuver]  [❌ Refuser]                    │      │
│  │                                                │      │
│  │ Motif de refus (si refus) :                    │      │
│  │ [________________________________________]     │      │
│  │                                                │      │
│  │ Commentaire :                                  │      │
│  │ [________________________________________]     │      │
│  │ [Envoyer commentaire]                          │      │
│  │                                                │      │
│  │ Timeline :                                     │      │
│  │ ● 24/02 09:15 - Demande créée par Tim V.      │      │
│  │ ○ En attente d'approbation                     │      │
│  └────────────────────────────────────────────────┘      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Page : CMS / Theme (Admin)

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]  ADMIN  │ ... │ Contenu │ Design │ Paramètres    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Contenu (CMS) ─────────────────────────────────┐     │
│  │                                                  │     │
│  │  Pages :                                         │     │
│  │  ┌──────────────┬──────────┬───────────────────┐ │     │
│  │  │ Page         │ Statut   │ Actions           │ │     │
│  │  ├──────────────┼──────────┼───────────────────┤ │     │
│  │  │ Accueil      │ Publié   │ [Éditer] [Voir]   │ │     │
│  │  │ FAQ          │ Publié   │ [Éditer] [Voir]   │ │     │
│  │  │ Règles       │ Publié   │ [Éditer] [Voir]   │ │     │
│  │  │ Aide         │ Brouillon│ [Éditer] [Publier] │ │     │
│  │  └──────────────┴──────────┴───────────────────┘ │     │
│  │                                                  │     │
│  │  [+ Nouvelle page]                               │     │
│  └──────────────────────────────────────────────────┘     │
│                                                          │
│  ┌─ Design (Thème) ────────────────────────────────┐     │
│  │                                                  │     │
│  │  Couleurs :                                      │     │
│  │  Primaire    [■ #3b82f6]  [Modifier]             │     │
│  │  Secondaire  [■ #6b7280]  [Modifier]             │     │
│  │  Accent      [■ #10b981]  [Modifier]             │     │
│  │  Background  [■ #ffffff]  [Modifier]             │     │
│  │                                                  │     │
│  │  Logo : [Upload]  [Preview: Logo actuel]         │     │
│  │                                                  │     │
│  │  Typographie :                                   │     │
│  │  Titres  [Inter ▼]    Corps  [Inter ▼]           │     │
│  │                                                  │     │
│  │  [Preview en temps réel]                         │     │
│  │                                                  │     │
│  │  Version actuelle : v3 (publié le 20/02)         │     │
│  │  [Publier les changements]  [Rollback vers v2]   │     │
│  └──────────────────────────────────────────────────┘     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Livrable 6 : Workflow d'approbation

### 6.1 Diagramme d'états

```
                    ┌───────────┐
          ┌────────>│   DRAFT   │ (panier sauvegardé, pas encore soumis)
          │         └─────┬─────┘
          │               │ Soumettre
          │               ▼
          │         ┌───────────┐
          │    ┌───>│  PENDING  │<──── Expiration auto (J+7)
          │    │    └─────┬─────┘         │
          │    │          │               ▼
          │    │    ┌─────┴─────┐    ┌──────────┐
          │    │    │           │    │ EXPIRED  │
          │    │    ▼           ▼    └──────────┘
          │    │ ┌─────────┐ ┌──────────┐
          │    │ │APPROVED │ │ REJECTED │
          │    │ └────┬────┘ └──────────┘
          │    │      │
          │    │      │ Allocation des items
          │    │      ▼
          │    │ ┌──────────┐
          │    │ │ RESERVED │ (items physiques assignés)
          │    │ └────┬─────┘
          │    │      │
          │    │      │ Check-out (retrait)
          │    │      ▼
          │    │ ┌───────────┐
          │    │ │PICKED_UP  │──── Dépassement date retour ──┐
          │    │ └─────┬─────┘                               │
          │    │       │                                     ▼
          │    │       │ Check-in (retour)            ┌──────────┐
          │    │       ▼                              │ OVERDUE  │
          │    │ ┌──────────┐                         └────┬─────┘
          │    │ │ RETURNED │                              │
          │    │ └────┬─────┘                         Check-in
          │    │      │                                    │
          │    │      │ Clôture (stock remis)               │
          │    │      ▼                                    │
          │    │ ┌──────────┐                              │
          │    └─│  CLOSED  │<─────────────────────────────┘
          │      └──────────┘
          │
          │    ┌───────────┐
          └────│ CANCELLED │ (par l'utilisateur, avant picked_up)
               └───────────┘
```

### 6.2 Transitions et actions

| De | Vers | Déclencheur | Actions automatiques |
|----|------|-------------|---------------------|
| — | draft | Sauvegarde panier | — |
| draft | pending | Utilisateur soumet la demande | Email confirmation à l'utilisateur. Notification aux admins/approbateurs. |
| pending | approved | Admin approuve | Email à l'utilisateur. Stock réservé (logiquement). |
| pending | rejected | Admin refuse (motif obligatoire) | Email à l'utilisateur avec motif. Stock libéré. |
| pending | expired | Cron job (J+7 sans action) | Email à l'utilisateur. Stock libéré. |
| pending | cancelled | Utilisateur annule | Stock libéré. |
| approved | reserved | Admin alloue les items physiques | Notification à l'utilisateur : items prêts au retrait. |
| approved | cancelled | Utilisateur annule | Stock libéré. Allocation annulée. |
| reserved | picked_up | Admin confirme le retrait | Log du check-out. Bon de retrait généré (optionnel). |
| reserved | cancelled | Utilisateur annule | Stock libéré. Allocation annulée. |
| picked_up | returned | Admin confirme le retour + état | Log du check-in. État du matériel enregistré. |
| picked_up | overdue | Cron job (J+1 après date retour) | Email rappel à l'utilisateur. Email alerte aux admins. Escalade à J+3 et J+7. |
| overdue | returned | Admin confirme le retour | Log du check-in. Marqué comme retour tardif. |
| returned | closed | Admin clôture (ou auto après check-in) | Stock remis à jour. Item remis en "available" ou "maintenance". |

### 6.3 Notifications par transition

| Transition | Destinataire | Canal | Template |
|-----------|-------------|-------|----------|
| → pending | Utilisateur | Email + In-app | "Votre demande #X a été soumise" |
| → pending | Admins | Email + In-app | "Nouvelle demande #X de [Nom] — [Priorité]" |
| → approved | Utilisateur | Email + In-app | "Votre demande #X a été approuvée" |
| → rejected | Utilisateur | Email + In-app | "Votre demande #X a été refusée : [motif]" |
| → reserved | Utilisateur | Email + In-app | "Matériel prêt : retrait [lieu] le [date]" |
| → picked_up | Utilisateur | Email | "Retrait confirmé — retour prévu le [date]" |
| J-3 retour | Utilisateur | Email + In-app | "Rappel : retour dans 3 jours" |
| J-1 retour | Utilisateur | Email + In-app | "Rappel : retour demain" |
| → overdue | Utilisateur | Email + In-app | "Retard : matériel à retourner immédiatement" |
| → overdue | Admins | Email | "Retard demande #X — [Nom] — +N jours" |
| → returned | Utilisateur | Email | "Retour enregistré. Merci !" |
| → expired | Utilisateur | Email | "Demande #X expirée (non traitée)" |
| → cancelled | Admins | In-app | "Demande #X annulée par [Nom]" |
| Extension demandée | Admins | Email + In-app | "Demande d'extension #X — [Nom]" |
| Extension approuvée | Utilisateur | Email + In-app | "Extension approuvée jusqu'au [date]" |
| Stock bas | Admins | Email + In-app | "Stock critique : [Produit] — [N] restants" |

---

## Livrable 7 : Plan de permissions & rôles

### 7.1 Matrice des rôles

| Rôle | Description | Nombre typique |
|------|------------|---------------|
| **user** | Employé standard. Parcourt le catalogue, crée des demandes, consulte ses emprunts. | Majorité |
| **manager** | Gestionnaire de stock / Approbateur. Peut approuver/refuser des demandes, gérer les retraits/retours. | 3-10 |
| **admin** | Administrateur complet. Tout accès back-office : produits, CMS, design, config, users. | 1-3 |
| **super_admin** | Super admin technique. Accès admin + gestion des rôles, audit log, config système, compte local de secours. | 1 |

### 7.2 Matrice de permissions détaillée

| Ressource / Action | user | manager | admin | super_admin |
|-------------------|:----:|:-------:|:-----:|:-----------:|
| **Catalogue** | | | | |
| Voir catalogue | ✅ | ✅ | ✅ | ✅ |
| Voir fiche produit | ✅ | ✅ | ✅ | ✅ |
| CRUD produits | ❌ | ❌ | ✅ | ✅ |
| CRUD catégories | ❌ | ❌ | ✅ | ✅ |
| CRUD tags | ❌ | ❌ | ✅ | ✅ |
| CRUD bundles | ❌ | ❌ | ✅ | ✅ |
| Gérer stock / inventaire | ❌ | 📖 (lecture) | ✅ | ✅ |
| **Panier & Demandes** | | | | |
| Créer panier | ✅ | ✅ | ✅ | ✅ |
| Soumettre demande | ✅ | ✅ | ✅ | ✅ |
| Voir ses propres demandes | ✅ | ✅ | ✅ | ✅ |
| Voir toutes les demandes | ❌ | ✅ | ✅ | ✅ |
| Annuler sa demande | ✅ | ✅ | ✅ | ✅ |
| Approuver / Refuser | ❌ | ✅ | ✅ | ✅ |
| Check-out (retrait) | ❌ | ✅ | ✅ | ✅ |
| Check-in (retour) | ❌ | ✅ | ✅ | ✅ |
| **Utilisateurs** | | | | |
| Voir son profil | ✅ | ✅ | ✅ | ✅ |
| Modifier son profil | ✅ | ✅ | ✅ | ✅ |
| Voir tous les profils | ❌ | ❌ | ✅ | ✅ |
| Modifier rôles | ❌ | ❌ | ❌ | ✅ |
| Désactiver utilisateur | ❌ | ❌ | ✅ | ✅ |
| **Config & CMS** | | | | |
| Gérer contenu (CMS) | ❌ | ❌ | ✅ | ✅ |
| Gérer thème / design | ❌ | ❌ | ✅ | ✅ |
| Gérer templates email | ❌ | ❌ | ✅ | ✅ |
| Gérer quotas / règles | ❌ | ❌ | ✅ | ✅ |
| Gérer localisations | ❌ | ❌ | ✅ | ✅ |
| **Reporting** | | | | |
| Dashboard utilisateur | ✅ | ✅ | ✅ | ✅ |
| Dashboard admin | ❌ | ✅ | ✅ | ✅ |
| Exports CSV/XLSX | ❌ | ✅ | ✅ | ✅ |
| **Audit & Système** | | | | |
| Voir audit log | ❌ | ❌ | 📖 (lecture) | ✅ |
| Gérer paramètres système | ❌ | ❌ | ❌ | ✅ |
| Compte local de secours | ❌ | ❌ | ❌ | ✅ |

### 7.3 Implémentation technique

**Côté base de données (Supabase RLS)** :
```sql
-- Exemple : seuls les managers+ peuvent voir toutes les demandes
CREATE POLICY "Managers can view all requests" ON loan_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('manager', 'admin', 'super_admin')
        )
    );

-- Les users ne voient que leurs propres demandes
CREATE POLICY "Users view own requests" ON loan_requests
    FOR SELECT USING (user_id = auth.uid());
```

**Côté frontend** :
```jsx
// Hook usePermission
const { role } = useAuth();
const canApprove = ['manager', 'admin', 'super_admin'].includes(role);
const canManageCatalog = ['admin', 'super_admin'].includes(role);

// Route guards
<Route path="/admin/*" element={
  <RequireRole roles={['admin', 'super_admin']}>
    <AdminLayout />
  </RequireRole>
} />
```

### 7.4 Règles d'approbation configurables

| Règle | Configuration | Par défaut |
|-------|--------------|-----------|
| Auto-approbation | Si ≤ N items ET durée ≤ X jours | Désactivé |
| Approbation requise par | Rôle minimum | manager |
| Approbation multi-niveaux | Si priorité = "critical" → double approbation | Désactivé |
| Restriction catégorie | Certaines catégories réservées à certains départements | Aucune |
| Quota max items simultanés | Par utilisateur | 5 |
| Durée max prêt | Par catégorie ou global | 90 jours |

---

## Livrable 8 : CMS / Design — Proposition & garde-fous

### 8.1 Architecture CMS

**Approche recommandée : CMS intégré léger (pas de CMS externe)**

Raison : l'application est interne, les besoins CMS sont limités (pages d'aide, FAQ, bannières, règles). Un CMS headless externe (Strapi, Sanity) serait surdimensionné.

#### Structure des pages CMS

```
cms_pages
├── slug (unique, ex: "faq", "rules", "help")
├── title
├── content (JSONB) ← structure "block-based"
├── status (draft / published)
├── version (auto-incrémenté)
├── published_at
├── updated_by
└── created_at / updated_at
```

#### Format du contenu (block-based)

```json
{
  "blocks": [
    {
      "type": "heading",
      "level": 2,
      "text": "Comment emprunter du matériel ?"
    },
    {
      "type": "paragraph",
      "text": "Parcourez le catalogue, ajoutez les items..."
    },
    {
      "type": "image",
      "url": "/storage/cms/guide-step1.png",
      "alt": "Étape 1"
    },
    {
      "type": "faq",
      "items": [
        { "question": "Combien de temps...", "answer": "Maximum 90 jours..." }
      ]
    },
    {
      "type": "callout",
      "variant": "warning",
      "text": "Le matériel doit être retourné..."
    }
  ]
}
```

#### Éditeur back-office

- Éditeur WYSIWYG basé sur **TipTap** (ProseMirror) ou **BlockNote**
- Blocks disponibles : Heading, Paragraph, Image, FAQ (accordion), Callout, List, Table, Divider, Banner
- Drag & drop pour réordonner les blocks
- Preview en temps réel dans un iframe

### 8.2 Theme Builder

#### Design Tokens (CSS Custom Properties)

```css
:root {
  /* Couleurs primaires */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-secondary: #6b7280;
  --color-accent: #10b981;

  /* Surfaces */
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-border: #e5e7eb;

  /* Texte */
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;

  /* Typographie */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;

  /* Spacing, border-radius, shadows... */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

#### Interface de personnalisation

L'admin peut modifier :
1. **Couleurs** : Color picker pour chaque token. Aperçu en temps réel.
2. **Logo** : Upload. Affiché dans le header.
3. **Typographies** : Sélection parmi Google Fonts pré-approuvées (Inter, Roboto, Open Sans, Poppins).
4. **Header/Footer** : Liens, texte, configuration.
5. **Homepage** : Choix des sections affichées (bannière, catégories mises en avant, nouveautés, produits populaires).

#### Stockage thème

```
theme_settings
├── id
├── key (ex: "colors", "typography", "layout")
├── value (JSONB)
├── version (auto-incrémenté)
├── is_active (boolean)
├── created_by
└── created_at
```

### 8.3 Garde-fous

| Risque | Mitigation |
|--------|-----------|
| Casser le design | **Preview obligatoire** avant publication. Comparaison côté-à-côté (avant/après). |
| Perte de contenu | **Versioning** : chaque sauvegarde crée une nouvelle version. Historique des N dernières versions. |
| Rollback | **Bouton rollback** : restaurer une version précédente en 1 clic. |
| Incohérence visuelle | **Design tokens** : les couleurs et typographies sont contraintes par le système. Pas d'édition CSS brut. |
| Contenu cassé | **Validation** des blocks CMS avant publication (images valides, liens fonctionnels). |
| Accès non autorisé | **Seuls admin/super_admin** peuvent modifier le CMS et le thème. |
| Performances | **Publication asynchrone** : les changements de thème sont compilés en CSS statique et cachés. |

### 8.4 Option simple vs robuste

| Aspect | Option simple (MVP) | Option robuste (V2) |
|--------|-------------------|---------------------|
| CMS | Éditeur markdown simple (textarea) | Block editor (TipTap/BlockNote) avec drag & drop |
| Theme | Sélection parmi 3-5 presets de couleurs | Color picker complet + live preview |
| Versioning | Dernière version uniquement | Historique complet + diff + rollback |
| Homepage | Statique (code) | Configurable par blocks (drag & drop sections) |
| Bannières | Texte simple configurable | Image + texte + lien + scheduling (date début/fin) |

---

## Livrable 9 : Risques & mitigations

| # | Risque | Impact | Probabilité | Mitigation |
|---|--------|--------|------------|-----------|
| R-01 | **Conflit de réservation** (race condition) : deux utilisateurs réservent le dernier item simultanément | Haut | Moyen | Verrouillage optimiste en base (SELECT ... FOR UPDATE). Vérification de stock dans une transaction PostgreSQL. Double check au moment de l'approbation. |
| R-02 | **Performance recherche** : dégradation avec beaucoup de produits + attributs dynamiques | Moyen | Faible | Indexation PostgreSQL (GIN pour JSONB, tsvector pour full-text). Meilisearch en option pour > 1000 produits. Pagination serveur obligatoire. |
| R-03 | **SSO indisponible** (panne Azure AD) | Haut | Faible | Compte admin local de secours (email/password Supabase). Tokens JWT avec durée de vie raisonnable (1h) pour ne pas couper les sessions actives. |
| R-04 | **Données orphelines** : demande approuvée mais produit supprimé | Moyen | Faible | Soft delete obligatoire pour les produits (status = "archived"). Contraintes FK avec ON DELETE RESTRICT sur les tables critiques. |
| R-05 | **Scalabilité Supabase** : limites du plan gratuit (500 MB DB, 1 GB storage, 50K auth MAU) | Moyen | Moyen | Surveiller l'usage. Passer au plan Pro dès la mise en production réelle. Compression images avant upload. Politique de rétention (archiver les vieilles demandes). |
| R-06 | **RGPD** : données personnelles des employés (nom, email, historique emprunts) | Haut | Moyen | Minimisation : ne stocker que le nécessaire. Politique de rétention : purge auto après X mois (configurable). Droit à l'oubli : anonymisation des données liées à un profil supprimé. Log d'accès aux données personnelles. |
| R-07 | **Adoption utilisateur** : interface trop complexe, pas intuitive | Moyen | Moyen | UX testing avec 5-10 utilisateurs pilotes avant le rollout. Onboarding guidé (tour de l'interface au premier login). Pages d'aide / FAQ intégrées. Feedback widget. |
| R-08 | **Emails non reçus** : notifications critiques bloquées par spam/firewalls | Moyen | Moyen | Utiliser un service email réputé (Resend/SendGrid) avec domaine vérifié (SPF, DKIM, DMARC). Notifications in-app en complément. Dashboard admin pour voir les emails envoyés/échoués. |
| R-09 | **Stock physique désynchronisé** : le stock en base ne correspond pas à la réalité | Haut | Moyen | Inventaire régulier : fonctionnalité d'audit de stock en back-office. Numéros de série traçables. Alertes si un item est marqué "prêté" depuis trop longtemps sans retour. |
| R-10 | **Abus / réservations abusives** : un utilisateur bloque du stock sans besoin réel | Moyen | Faible | Quotas par utilisateur. Expiration automatique des demandes non traitées. Durée max de prêt. Monitoring des patterns de réservation. |
| R-11 | **Sécurité locale admin** : le compte de secours local est un vecteur d'attaque | Haut | Faible | MFA obligatoire (TOTP). IP whitelist stricte. Rotation de mot de passe forcée (30j). Logging renforcé de toutes les actions. Alerte email à chaque connexion locale. |
| R-12 | **Migration depuis le schéma existant** : le schéma actuel est simple, la migration vers le nouveau modèle sera conséquente | Moyen | Certain | Script de migration SQL incrémental. Backup complet avant migration. Période de gel des données pendant la migration. Tests sur une copie de la base. |

---

## Livrable 10 : Checklist MVP vs V1 vs V2

### MVP (Minimum Viable Product)

Le strict minimum pour être utilisable en production avec un petit groupe pilote.

- [x] **Auth** : SSO Microsoft (login/logout)
- [x] **Profils** : Création automatique depuis Azure AD
- [x] **Catalogue** : Liste produits avec catégories (1 niveau)
- [x] **Fiche produit** : Nom, description, image, stock, spécifications
- [x] **Recherche** : Recherche par nom (LIKE/full-text simple)
- [x] **Filtres** : Par catégorie
- [x] **Panier** : Ajout, modification, suppression. Période de prêt globale.
- [x] **Disponibilité** : Vérification de stock par période (fonction `get_available_stock` existante)
- [x] **Formulaire projet** : Champs essentiels (nom, description, dates, localisation, justification, consentement)
- [x] **Soumission** : Création de demande en statut "pending"
- [x] **Back-office demandes** : Liste, détail, approuver/refuser avec motif
- [x] **Back-office produits** : CRUD produits + catégories
- [x] **Suivi demande** : Statuts basiques (pending → approved/rejected → picked_up → returned)
- [x] **Check-out / Check-in** : Confirmation retrait et retour
- [x] **Notifications** : Email à la soumission et à l'approbation/refus
- [x] **Rôles** : user + admin (2 rôles)
- [x] **RLS** : Sécurité en base de données
- [x] **Responsive** : Consultation mobile basique

### V1 (Première version complète)

Fonctionnalités ajoutées après le MVP, pour un déploiement à l'échelle de l'entreprise.

- [ ] **Catégories hiérarchiques** (3 niveaux)
- [ ] **Tags** et filtres à facettes
- [ ] **Attributs dynamiques** par catégorie
- [ ] **Images multiples** par produit
- [ ] **Documents techniques** (upload PDF)
- [ ] **Produits liés** (accessoires, alternatives)
- [ ] **Bundles / Kits**
- [ ] **Calendrier de disponibilité** (vue calendrier interactive)
- [ ] **Panier persistant** en base
- [ ] **Paniers brouillons** sauvegardés
- [ ] **Dupliquer une demande**
- [ ] **Formulaire projet complet** (business owner, équipe, pièces jointes, priorité, besoins spécifiques)
- [ ] **User picker** Microsoft Graph (auto-suggestion collaborateurs)
- [ ] **Suggestion accessoires** (cross-sell) dans le panier
- [ ] **Workflow complet** (tous les statuts : draft → pending → approved → reserved → picked_up → returned → closed)
- [ ] **Commentaires** sur les demandes
- [ ] **Extension de prêt** (demande + approbation)
- [ ] **Retour anticipé**
- [ ] **Notifications complètes** (rappels, retards, stock bas, in-app + email)
- [ ] **Templates email** éditables
- [ ] **Rôle manager** (approbateur dédié)
- [ ] **Quotas** (items max, durée max)
- [ ] **Dashboard admin** (KPIs, graphiques)
- [ ] **Exports** CSV/XLSX
- [ ] **Inventaire** par numéro de série (table `inventory_items`)
- [ ] **Audit log** complet
- [ ] **Multilingue** FR/NL/EN
- [ ] **Accessibilité** WCAG AA
- [ ] **Performance** : TanStack Query, pagination serveur, lazy loading
- [ ] **Compte admin local** de secours (MFA, IP whitelist)

### V2 (Améliorations futures)

- [ ] **CMS** : Éditeur de pages (aide, FAQ, règles) avec block editor
- [ ] **Theme builder** : Personnalisation couleurs, logo, typographies + preview + rollback
- [ ] **Homepage configurable** : Sections drag & drop (bannières, catégories, nouveautés)
- [ ] **Recherche avancée** : Meilisearch (fuzzy, facets, typo tolerance)
- [ ] **Bon de retrait / retour** PDF généré
- [ ] **Règles d'approbation configurables** (auto-approbation, multi-niveaux)
- [ ] **Notifications** : Digest hebdomadaire, Slack/Teams integration
- [ ] **Reporting avancé** : Taux d'utilisation par période, rapport par projet, rapport par département
- [ ] **Filtres sauvegardés** par utilisateur
- [ ] **Produits favoris**
- [ ] **Historique navigation** (récemment consultés)
- [ ] **Buffer maintenance** configurable entre deux prêts
- [ ] **Expiration automatique** des demandes non traitées
- [ ] **Escalade retards** (notifications à J+3, J+7 avec escalade hiérarchique)
- [ ] **Audit de stock** (inventaire physique vs base)
- [ ] **RGPD** : Export données personnelles, anonymisation, politique de rétention auto
- [ ] **Observabilité** : Métriques, traces, alertes (Sentry ou équivalent)
- [ ] **API publique** : Endpoints documentés pour intégrations internes
- [ ] **App mobile** (PWA) : Scan QR code pour check-in/check-out rapide
- [ ] **Intégration ITSM** : Lien avec ServiceNow / Jira pour les incidents matériels

---

## Annexe A : Parcours utilisateur complet (séquentiel)

```
1. LOGIN SSO
   └─> Clic "Se connecter avec Microsoft"
   └─> Redirect Azure AD → auth → callback
   └─> Profil créé/mis à jour depuis token
   └─> Redirect vers le catalogue

2. CONSULTATION CATALOGUE
   └─> Page d'accueil avec bannières + catégories
   └─> Navigation par catégorie OU recherche
   └─> Filtres à facettes (catégorie, dispo, tags, attributs)
   └─> Vue grille ou liste

3. FICHE PRODUIT
   └─> Galerie images
   └─> Spécifications (attributs)
   └─> Documents techniques
   └─> Calendrier de disponibilité
   └─> Accessoires recommandés
   └─> Alternatives

4. AJOUT AU PANIER
   └─> Sélection période (datepicker)
   └─> Sélection quantité
   └─> Vérification dispo temps réel
   └─> Suggestion accessoires (popup/drawer)
   └─> Confirmation ajout

5. PANIER
   └─> Récapitulatif multi-lignes
   └─> Modification quantités / dates
   └─> Suppression items
   └─> Indicateurs de disponibilité
   └─> Sauvegarde brouillon (optionnel)

6. CHECKOUT — FORMULAIRE PROJET
   └─> Remplissage des champs (voir Livrable 2)
   └─> Validation temps réel
   └─> User picker (Microsoft Graph)
   └─> Upload pièces jointes
   └─> Consentements

7. RÉCAPITULATIF & SOUMISSION
   └─> Page récapitulative (panier + projet)
   └─> Dernière vérification disponibilité
   └─> Bouton "Soumettre"
   └─> Confirmation (page + email)

8. SUIVI
   └─> Dashboard : demandes en cours
   └─> Détail de chaque demande + timeline
   └─> Notifications (email + in-app)
   └─> Actions : annuler, demander extension

9. RETRAIT
   └─> Notification "matériel prêt"
   └─> Se rendre au lieu de retrait
   └─> Admin confirme le check-out

10. RETOUR
    └─> Rappel avant échéance
    └─> Se rendre au lieu de retour
    └─> Admin confirme le check-in + état
    └─> Clôture automatique
```

---

## Annexe B : Stack technique résumée

| Couche | Technologie | Version |
|--------|------------|---------|
| Frontend | React | 18.x |
| Bundler | Vite | 5.x |
| Routing | React Router | 6.x |
| State | Zustand | 5.x |
| Data fetching | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | — |
| UI | shadcn/ui + TailwindCSS | — |
| Calendar | react-big-calendar ou FullCalendar | — |
| Charts | Recharts | 2.x |
| i18n | react-i18next | — |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) | — |
| SSO | Microsoft Entra ID (OIDC via Supabase Auth) | — |
| Search | PostgreSQL full-text (MVP) / Meilisearch (V2) | — |
| Email | Resend ou SendGrid (via Edge Functions) | — |
| Hosting | Vercel (frontend) + Supabase (backend) | — |
| Monitoring | Sentry (V2) | — |
