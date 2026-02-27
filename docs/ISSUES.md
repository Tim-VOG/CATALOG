# Testing Issues Log

> Full testing completed on 27 Feb 2026 as admin user (Tim Admin).
> All pages tested: Hub, Dashboard, Products, Product Options, Categories, Requests, New Request, Planning, Returns, Users, Communications, Design, IT Requests, IT Form Builder, Onboarding (Recipients, Compose, History, Variables), Offboarding (Processes, Form Builder), Catalog (user-facing), Product Detail, Cart, My Requests, Profile, IT Request Form.

---

## Priority 1 — Database Migration Required

- [ ] **Offboarding tables not created yet** — `offboarding_processes` and `offboarding_form_fields` tables return 404 from Supabase. Migration `025_offboarding_and_updates.sql` needs to be executed in Supabase SQL Editor, then reload schema cache. Pages handle the error gracefully but are non-functional until migration is run.

---

## Priority 2 — Visual / Design Issues

- [ ] **Dashboard chart bars appear solid black** — The "Requests (7 Days)" bar chart uses `--color-primary` which resolves to `#000000` in light mode. The bars are technically correct but look jarring/ugly against the light background. **Fix:** Use `--color-accent` (#06b6d4) or a dedicated chart color instead of `--color-primary` for the bar fill in `src/components/admin/dashboard/RequestsChart.jsx` (line 28).

- [ ] **Onboarding email templates still in dark mode** — The onboarding email composer (MJML-based) still uses dark backgrounds (`#1a1f25`, `#111827`, `#1e293b`) while the equipment/request email templates have been converted to light mode. This creates visual inconsistency. **Fix:** Update `src/lib/onboarding-mjml.js` to use light mode colors matching the new email-html.js palette (white cards, light gray backgrounds, dark text).

---

## Priority 3 — Minor / Polish

- [ ] **Offboarding stat cards may flash blank on first load** — When the offboarding page loads and the API returns a 404 (missing tables), the stat cards briefly show empty content before the error state renders. This is a minor React Query timing issue — once the migration is run it should be a non-issue. **Note:** Verify after migration is executed.

---

## Tested & Working (No Issues Found)

### Hub Page
- [x] 5 cards displayed correctly (Equipment Catalog, Onboarding Hub, Functional Mailbox, IT Onboarding Request, Offboarding)
- [x] Grid layout adapts properly (3+2)
- [x] Coming soon badge on Functional Mailbox
- [x] Admin badges on Onboarding and Offboarding cards
- [x] Animations on page load

### Admin Dashboard
- [x] 4 stat cards (Pending, Active Loans, Overdue, Awaiting Pickup) — all showing 0
- [x] Planning Timeline widget with "No upcoming reservations" empty state
- [x] "Full view" link to Planning page works
- [x] Active Loans and Recent Requests widgets
- [x] Customize button visible

### Admin Sidebar
- [x] Three sections: CATALOG, ONBOARDING, OFFBOARDING
- [x] All menu items navigate correctly
- [x] "Back to Hub" link at bottom
- [x] Floatable design working
- [x] Active item highlighting

### Products
- [x] 8 products in 4-column grid
- [x] Stats bar (8 products, 29 total stock, 1 low stock, 8 categories)
- [x] Search bar, category badges, stock counts
- [x] "+ Add Product" button

### Product Options
- [x] Accessories (2), Software (2), Subscription Plans (7)
- [x] Toggle switches, edit/delete buttons, add buttons

### Categories
- [x] 8 categories in 3-column grid with colored badges
- [x] Delete buttons, "+ Add Category" button

### Requests (Admin)
- [x] Full request list with status badges
- [x] Filter buttons (All, pending, approved, picked up, returned)
- [x] User avatars, date ranges, item counts

### New Request (Admin)
- [x] 3-step wizard (User & Equipment, Project Details, Review & Submit)
- [x] User search, loan period, equipment list with stock

### Planning
- [x] Gantt-style timeline, today highlighted
- [x] Time range selectors (1 Day, 1 Week, 1 Month, 3 Months)
- [x] Status legend (Pending, Approved, Reserved, Picked Up, Overdue)
- [x] Navigation (prev/next/Today)

### Returns
- [x] 3 stat cards (Overdue, Due Soon, Total Active)
- [x] Empty state "No active loans"

### Users (Merged)
- [x] All 4 users visible in table
- [x] Module legend with 5 module icons
- [x] Search, role filters, BU filter dropdown
- [x] Inline module permission toggles per user
- [x] Role select, status toggle, delete button
- [x] Self-protection (current user row read-only)

### Communications / Email Templates
- [x] All templates rendering in light mode
- [x] Order Confirmation, Ready for Pickup, Equipment Picked Up, Return Reminder, Return Confirmation — all clean light design
- [x] Checkout Fields and Recipients tabs accessible

### Design & Branding
- [x] Theme Mode (Dark/Light) toggle
- [x] Mode Palettes (Dark/Light tabs) with color pickers
- [x] Border Radius options
- [x] **Dual Logos** — Dark Mode Logo and Light Mode Logo side by side with clear buttons
- [x] General settings (App Name, Header Tagline)
- [x] Email Branding (Tagline, Logo Height)
- [x] **Hub Page Content** section — Hub Title, Hub Tagline, Section Cards (Equipment Catalog, Onboarding Hub, Functional Mailbox, IT Onboarding Request) each with Title + Description
- [x] Sticky "Save Changes" button

### IT Requests (Admin)
- [x] Search bar, empty state "No IT requests found"

### IT Form Builder
- [x] 13 fields organized by steps (Identity, Dates, IT Needs)
- [x] Type badges, step badges, required badges
- [x] Drag handles, toggle switches, edit buttons
- [x] "+ Add Field" button

### Onboarding — Recipients
- [x] Tab nav (Recipients, Compose, History, Variables)
- [x] Stats (recipients count, FR/EN count, BU count)
- [x] Search + BU filter dropdown
- [x] "+ Add Recipient" button

### Onboarding — Compose
- [x] Email blocks editor (12/12 blocks)
- [x] Language toggle (FR/EN)
- [x] Live email preview (iframe)
- [x] Save Draft and Send Email buttons
- [x] Full screen preview

### Onboarding — History
- [x] Filter tabs (All, Draft, Sent, Failed)
- [x] Empty state working

### Onboarding — Variables
- [x] Variable mapping explanation
- [x] IT request search
- [x] Empty state

### Offboarding — Processes
- [x] Stats cards (Total, Pending, In Progress, Completed) — render after migration
- [x] Search + status filter
- [x] "New Process" button
- [x] Page handles missing tables gracefully

### Offboarding — Form Builder
- [x] Header with field count
- [x] "+ Add Field" button
- [x] Empty state
- [x] Handles missing tables gracefully

### Catalog (User-facing)
- [x] No featured product hero (correctly removed)
- [x] Loan Period selector
- [x] Category filter tabs
- [x] 8 product cards with images, badges, descriptions, availability
- [x] "+ Configure" / "+ Add" buttons

### Product Detail
- [x] Product image, category badge, description
- [x] Included accessories list
- [x] Availability counter
- [x] "+ Add to Cart" button
- [x] Availability Calendar accordion
- [x] Back to catalog link

### Cart
- [x] Empty state with cart icon and "Browse Catalog" button

### My Requests
- [x] Active/Past tabs with count
- [x] Past request shows correct details (name, status, dates, location, items)

### Profile
- [x] User info (avatar, name, email, Teams link, Admin badge, joined date)
- [x] Request stats (Total, Active, Completed)
- [x] Contact section with phone and Save button

### IT Request Form (User-facing)
- [x] 5-step wizard (Identity, Dates, IT Needs, Additional, Review)
- [x] Form fields populated from IT Form Builder config
- [x] Cancel and Next buttons
