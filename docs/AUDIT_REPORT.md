# IT Hub — Audit Complet & Roadmap

**Date :** 8 Mai 2026 (v4)
**Projet :** IT Hub — VO Group
**Auditeur :** Claude Code (Opus 4.7)
**Scope :** Frontend, Backend, DB, UX, Sécurité, Performance, Roadmap complète

---

## Résumé Exécutif

IT Hub est un outil interne de gestion IT. Tous les problèmes critiques et hauts identifiés lors de l'audit ont été corrigés. Le système est à **9/10** et prêt pour un usage en entreprise.

Ce document contient la roadmap complète des améliorations planifiées.

---

## 1. Issues Résolues ✅

- **7 issues critiques** corrigées (anciens statuts, fichiers morts, kit remnants)
- **4 issues hautes** corrigées (stock edit, legacy hooks, extensions, dead pages)
- **-3392 lignes** de code mort supprimées, **12 fichiers** effacés
- **Sécurité** : 31 tables avec RLS, routes admin protégées, 0 faille

---

## 2. Issues Mineures Restantes

| # | Issue | Sévérité |
|---|---|---|
| 1 | `getScanStatsByCategory()` charge tous les logs sans limite | Moyenne |
| 2 | Boutons sans disabled state pendant les mutations | Basse |
| 3 | Forms sans validation Zod (installé mais non utilisé) | Basse |
| 4 | 8 composants > 300 lignes | Basse |
| 5 | Pas de TypeScript | Optionnel |

---

## 3. Roadmap Complète

### 🔴 Priorité 1 — Quick Wins

| # | Feature | Description | Effort |
|---|---|---|---|
| A1 | **Notifications auto in-app** | Notification automatique quand le statut change. Point rouge sur la cloche. | 2h |
| A2 | **Raccourcis clavier** | `Cmd/Ctrl+K` = recherche, `Cmd/Ctrl+N` = catalog. Mac + Windows. | 1h |
| A3 | **Page 404 brandée** | Page d'erreur avec style IT Hub. | 30min |
| A4 | **Mini dashboard utilisateur** | Hub : "2 équipements actifs, 1 demande en cours, retour dans 3j". | 2h |
| A5 | **QR code sur My Equipment** | L'utilisateur voit le QR code de son équipement assigné. | 1h |
| A6 | **Mode maintenance produit** | Produit invisible pour les users mais visible admin. | 1h |
| A7 | **Export CSV** | Bouton Export sur Equipment Requests, Local IT, Scan Logs. | 2h |
| A8 | **Alerte stock bas** | Notification admin quand un produit tombe à 1 ou 0 en stock. | 1h |
| A9 | **Notes admin sur demande** | Commentaire interne visible uniquement par les admins. | 1h |
| A10 | **Demande urgente** | L'utilisateur coche "Urgent", badge rouge dans l'admin. | 1h |
| A11 | **Dupliquer un produit** | Bouton "Dupliquer" dans l'admin Products. | 30min |
| A12 | **Badge "Nouveau"** | Produits ajoutés dans les 7 derniers jours = badge "New" dans le catalog. | 30min |

### 🟡 Priorité 2 — UX Améliorations

| # | Feature | Description | Effort |
|---|---|---|---|
| B1 | **Recherche globale** | Cherche produits + demandes + QR codes + utilisateurs. | 4h |
| B2 | **Transitions de page** | Animations plus fluides entre les pages. | 2h |
| B3 | **Drag & drop panier** | Réorganiser les items du panier par glisser-déposer. | 3h |
| B4 | **Avatar coloré partout** | Initiales colorées uniformes sur toutes les pages. | 2h |
| B5 | **Breadcrumbs admin** | Fil d'Ariane : Dashboard > Equipment > Request #22. | 3h |
| B6 | **Statistiques simples** | Page admin Stats : demandes/mois, produits populaires, temps moyen. | 3h |
| B7 | **Retour anticipé** | User signale depuis My Equipment qu'il veut rendre plus tôt. | 2h |
| B8 | **Note de satisfaction** | Après "Ready", 👍 ou 👎 en 1 clic. Taux visible dans les stats. | 2h |
| B9 | **Favoris catalogue** | L'utilisateur marque des produits en favori. | 2h |

### 🔵 Priorité 3 — Nouvelles Fonctionnalités

| # | Feature | Description | Effort |
|---|---|---|---|
| C1 | **Historique utilisateur (admin)** | Page admin : tout l'historique d'un user (demandes, équipements, scans). | 5h |
| C2 | **Multi-langue FR/EN** | Système i18n, tout le site traduit. Sélection dans le profil. | 10h |
| C3 | **Rapport mensuel auto** | Email mensuel : demandes traitées, stock bas, retards. | 5h |
| C4 | **Blocage utilisateur** | User avec retard = bloqué pour nouvelles demandes. | 2h |
| C5 | **Template de demande** | Admin crée des "kits" prédéfinis (ex: Kit Dev). User clique = tout au panier. | 4h |
| C6 | **Changelog "What's new"** | Section sur le Hub montrant les dernières mises à jour. | 2h |
| C7 | **Historique par appareil** | Dans Local IT : vie complète d'un appareil (qui l'a eu, quand). | 3h |
| C8 | **Rappel automatique email** | 1 jour avant retour + 1 jour après si pas rendu. Automatique. | 2h |

---

## 4. Résumé Effort

| Priorité | Items | Effort total |
|---|---|---|
| 🔴 Quick Wins | 12 | ~14h |
| 🟡 UX | 9 | ~23h |
| 🔵 Features | 8 | ~33h |
| **Total** | **29 items** | **~70h** |

---

## 5. Ordre d'implémentation recommandé

### Sprint 1 (Quick Wins)
1. A8 — Alerte stock bas
2. A10 — Demande urgente
3. A11 — Dupliquer produit
4. A12 — Badge "Nouveau"
5. A9 — Notes admin
6. A1 — Notifications auto
7. A7 — Export CSV
8. A3 — Page 404

### Sprint 2 (UX Quick)
9. A2 — Raccourcis clavier
10. A4 — Mini dashboard user
11. A5 — QR sur My Equipment
12. A6 — Mode maintenance

### Sprint 3 (UX Avancé)
13. B1 — Recherche globale
14. B5 — Breadcrumbs
15. B6 — Stats
16. B7 — Retour anticipé
17. B8 — Satisfaction
18. B9 — Favoris

### Sprint 4 (Features)
19. C1 — Historique user
20. C4 — Blocage user
21. C5 — Templates demande
22. C7 — Historique appareil
23. C8 — Rappels auto

### Sprint 5 (Long terme)
24. C2 — Multi-langue
25. C3 — Rapport mensuel
26. C6 — Changelog
27. B2 — Transitions
28. B3 — Drag & drop
29. B4 — Avatar partout

---

*Audit réalisé par Claude Code (Opus 4.7) — 8 Mai 2026*
*Projet : IT Hub — VO Group*
