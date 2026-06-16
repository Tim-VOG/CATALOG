# VO Hub — Prompt design dashboard SaaS interne complet

> Prompt à coller dans un générateur de design (v0, Figma AI, Lovable, etc.) ou à donner à un designer.

---

## Contexte

Design un dashboard SaaS **interne d'entreprise**, modern et premium, pour la gestion centralisée de l'**équipement IT**, des **onboardings/offboardings**, des **mailboxes** et du **support utilisateur**. Le produit est un **hub interne** utilisé quotidiennement par une équipe IT et par tous les employés de l'entreprise. Inspiré de Linear, Vercel, Notion, Height, Raycast.

---

## Style visuel

- Dark mode par défaut, light mode disponible
- Typographie display moderne (Space Grotesk / Geist) + sans-serif sobre pour le corps
- Une seule couleur d'accent (orange chaud), neutres profonds, cartes glassmorphiques très subtiles
- Beaucoup d'espace, hiérarchie typographique nette, chiffres en tabular-nums
- Iconographie cohérente (Lucide), micro-animations discrètes
- Mobile-first responsive, PWA installable

---

## Architecture des rôles

3 niveaux :

- **Admin IT** — accès complet
- **Manager RH** — people-ops uniquement
- **User** — self-service

---

## Vues à designer

### Public / Auth

1. **Login** — SSO Microsoft + email/password, fond gradient subtil
2. **Tracking public** (`/track/:token`) — suivi d'une demande sans login, stepper de statut
3. **Status page** — état des services en temps réel, accessible sans login

### User (employé lambda)

4. **Hub / Accueil** — greeting personnalisé, tuiles principales (catalogue, mes équipements, mes demandes, IT request, mailbox, onboarding), stats rapides
5. **Catalogue d'équipement** — grille de produits avec photo, filtres catégorie, recherche, badge "back soon", favoris ❤️
6. **Fiche produit modale** — détails, accessoires inclus, dates de disponibilité, options
7. **Panier multi-étapes (3 steps)** — items, dates + contacts pickup/return, review
8. **Mes demandes** — liste unifiée (équipement + onboarding + offboarding + mailbox) avec tabs actives/passées
9. **Détail d'une demande** — timeline, items, statut, contacts
10. **Mes équipements** — devices actuellement en sa possession avec dates de retour, barres de progression colorées, boutons "demander un retour" / "signaler un problème" (ticket avec photo)
11. **Formulaire onboarding** (multi-step 11 étapes) — identité, profil, entreprise, email, accès, distribution lists, équipement
12. **Formulaire offboarding** (multi-step 6 étapes) — qui part, quand, accès à révoquer, équipement à récupérer
13. **Demande équipement événement** (multi-step) — projet, dates, équipement avec stock awareness
14. **Demande IT** — form dynamique configurable
15. **Mailbox fonctionnelle** — création + délégation de membres
16. **Profil utilisateur** — avatar, infos, préférences (thème, langue FR/EN, push notifications), historique

### Admin IT

17. **Dashboard admin** — KPIs (dispo / en cours / demandes en attente / en retard), tile "matériel en circulation" avec progress bars colorées, attention list, activité récente, breakdown par catégorie, export Excel
18. **Planning calendrier** — vue mois/semaine/jour de toutes les utilisations + arrivées + départs, filtres par type et par user
19. **Statistics** — graphiques (loans par période, top produits, trends)
20. **Utilization** — taux d'utilisation par catégorie/produit avec barres colorées, suggestions "à racheter" / "trop nombreux"
21. **Audit log** — historique horodaté de toutes les actions admin
22. **Liste des demandes d'équipement** — table filtrable par statut (pending → in_progress → ready → returned), export CSV
23. **Détail demande équipement** — items, assignation QR codes, status workflow, scan inline
24. **Catalogue produits** — CRUD products, image upload, sub-types, flags (visible, subscription, wifi-only)
25. **Catégories** — CRUD avec color picker
26. **Plans d'abonnement** — CRUD plans pour téléphones/routeurs
27. **QR codes** — grille avec preview, filtres catégorie/statut, bulk generate, print all, export PDF stickers, assignation desktop sans caméra, historique par device
28. **Réservations** — dashboard pour réserver du matos pour une date future
29. **Objets perdus** — liste des items signalés perdus, action "résoudre"
30. **Scan logs** — historique complet take/deposit avec filtres temps réel
31. **Scanner QR mobile** — interface caméra plein écran, modes single + bulk
32. **Device credentials** (admin-only) — table sensible IMEI/SIM/WiFi/PIN avec masquage par défaut, toggle "reveal"
33. **Issue tickets** — tickets ouverts par les users, photo, reply, resolve
34. **Users / Profils** — annuaire, invite, gestion roles + module access
35. **Détail user** — profil complet, équipement assigné, demandes, activité
36. **Onboarding requests (admin)** — liste cards avec status, action "send welcome email", checklist
37. **Welcome email composer** — éditeur de blocs MJML drag-and-drop, preview live, send
38. **Offboarding requests (admin)** — liste + checklist cochable avec progress bar, équipement à récupérer
39. **Mailbox requests (admin)** — liste + détail délégation
40. **Form builders** (IT / offboarding / mailbox) — drag-and-drop fields, types, conditional logic
41. **Email templates** — éditeur des templates système avec variables `{{var}}`, preview branding
42. **Shared mailboxes** — inventory miroir avec édition inline
43. **IT inventory** — assets avec dépréciation, amortissement, dates
44. **Local IT** — partenaires locaux par pays
45. **Design & branding** — logos, couleurs (dark + light), border radius, tagline, hub content
46. **Notifications** — cloche header avec catégorisation (onboarding, mailbox, IT, equipment), mark as read

### Manager RH

47. **Dashboard RH** — variant simplifié : counts pending onboarding/offboarding/mailbox + welcome emails à envoyer, listes "arrivées de la semaine" et "départs de la semaine", quick links, **sans le bruit inventaire**

### Système

48. **404** — page not found avec illustration
49. **Offline shell** — quand pas de réseau, avec retry auto
50. **Error boundary** — fallback friendly avec bouton "retour à l'accueil"

---

## Patterns transverses à designer

- **Bottom tab bar** mobile (Hub / Catalog / Cart / Profile)
- **Sidebar admin** desktop avec sections collapsibles + badges count
- **Header** avec search global (Cmd+K), notification bell, theme toggle, user menu
- **Toasts** discrets bas-droite (success / error / info)
- **Empty states** illustrés avec CTA
- **Loading skeletons** (jamais de spinner plein écran)
- **Confirmation dialogs** sobres
- **Status badges** cohérents (pending amber / in_progress blue / ready emerald / returned muted)
- **Avatars** avec fallback initials colorés

---

## Livrables attendus

Pour chaque vue :

- Layout desktop (1440px) + mobile (375px)
- États : empty, loading, error, populated
- Composants réutilisables identifiés et nommés
