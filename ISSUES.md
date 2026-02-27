# VO Gear Hub — E2E Testing Issues Report

**Date:** 2026-02-27
**Tested by:** Claude (automated browser + code review)
**Test scope:** Full user and admin workflows

---

## Testing Summary

### User Workflows Tested
- Browsed catalog, added all 8 products with options to cart
- Submitted loan request with full equipment set (8 items)
- Completed IT Onboarding Request (5-step wizard)
- Tested search, theme toggle, profile page, My Requests

### Admin Workflows Tested
- Full request lifecycle: Pending → Approved → Picked Up → Returned → Closed
- Product CRUD: Create, Edit, (Delete — browser crashed before confirming)
- Code reviewed: Categories, Product Options, Planning, Returns, Users, Communications, Design, Onboarding, IT Requests, Form Builders, Offboarding

---

## Critical Issues

### 1. Product options/accessories NOT displayed or included in communications
**Severity:** Critical
**Location:** `src/pages/checkout/CheckoutPage.jsx` (lines 440-452), `src/services/checkout-service.js` (lines 115-120), `src/pages/admin/AdminRequestDetailPage.jsx`

**Description:** When users select product options (accessories like keyboard/mouse, software like Microsoft Office, subscriptions like Combo Premium, apps like Teams/Outlook), these selections are:
- Saved to the database in `loan_request_items.options` (confirmed in `src/lib/api/loan-requests.js:55`)
- **NOT displayed** in the checkout review page (only product name and category shown)
- **NOT displayed** in the admin request detail page
- **NOT included** in confirmation or admin notification emails (only `product_name`, `product_image`, `quantity`, `product_includes` are sent)

**Impact:** Admin has no way to know what accessories/software/subscriptions were requested. User can't verify their selections before submitting.

**Fix needed in:**
- `CheckoutPage.jsx` — display `item.options` in review step
- `AdminRequestDetailPage.jsx` — display options for each request item
- `checkout-service.js` → `sendCheckoutEmails()` — include options in email item data
- Email templates — render option details

### 2. Cart: Adding existing product overwrites options
**Severity:** Critical
**Location:** `src/stores/cart-store.js` (lines 16-22)

**Description:** When a product already in the cart is added again, only the quantity is incremented. The `options` from the new addition are silently discarded:
```js
? { ...i, quantity: i.quantity + quantity }  // options from new add are lost
```

**Impact:** If a user changes options and re-adds a product, their option changes are ignored.

**Fix:** Merge options or prevent duplicate additions when options differ.

---

## High Priority Issues

### 3. IT Onboarding Request: Success toast invisible after submission
**Severity:** High
**Location:** `src/pages/it-request/ItRequestFormPage.jsx` (lines 466-467)

**Description:** After successful IT request submission, `showToast()` is called immediately followed by `navigate('/')`. The toast fires on the current page but the navigation happens so fast the user doesn't see it — they just see a silent redirect to the hub.

**Fix:** Either:
- Add a small delay before navigation: `setTimeout(() => navigate('/'), 100)`
- Or pass toast state to the hub page and show it there
- Or show a success page/modal before redirecting

### 4. Checkout form: First/Last Name not pre-filled from profile
**Severity:** High
**Location:** `src/pages/checkout/CheckoutPage.jsx`

**Description:** The checkout form has First Name and Last Name fields that are blank even when the user's profile has these values set. Users must re-type their name for every request.

**Fix:** Pre-fill `fieldValues` with `profile.first_name` and `profile.last_name` on component mount.

### 5. 5G Home Router: Broken thumbnail image
**Severity:** High
**Location:** Database (`products` table)

**Description:** The 5G Home Router product has a missing or broken `image_url`. In the cart view, it renders as alt text "5G Home Router..." instead of an image. The admin products page also shows a blank/grey card for this product.

**Fix:** Update the `image_url` in the database for the 5G Home Router product, or add a proper placeholder/fallback image component.

---

## Medium Priority Issues

### 6. Admin: `AdminItRequestsPage` maps wrong field to department
**Severity:** Medium
**Location:** `src/pages/admin/AdminItRequestsPage.jsx` (approx. line 46)

**Description:** When creating an onboarding recipient from an IT request, the code maps `req.status` as `department`, which is incorrect. Status values (pending, approved, etc.) are not department names.

### 7. Onboarding Recipients: Default language hardcoded to 'fr'
**Severity:** Medium
**Location:** `src/pages/admin/onboarding/OnboardingRecipientsPage.jsx`

**Description:** New onboarding recipients default to French ('fr') language regardless of app locale or user preference. Should default to the app's configured language or 'en'.

### 8. Admin Product Options: No duplicate value validation
**Severity:** Medium
**Location:** `src/pages/admin/AdminProductOptionsPage.jsx`

**Description:** When creating options, the `value` is auto-generated from the label. But there's no check if a `value` already exists, which could create duplicate option entries.

### 9. Form Builders: Drag reorder doesn't rollback on failure
**Severity:** Medium
**Location:** `src/pages/admin/AdminItFormBuilderPage.jsx`, `src/pages/admin/AdminOffboardingFormBuilderPage.jsx`

**Description:** After drag-and-drop reordering, if the database mutation fails, the UI shows the new order but the database retains the old order. No rollback or error notification occurs.

### 10. Admin Planning: No error state for invalid date range
**Severity:** Medium
**Location:** `src/pages/admin/AdminPlanningPage.jsx`

**Description:** If the planning date range is invalid, the user sees a blank timeline with no explanation. Should show an error message or validation feedback.

---

## Low Priority / UX Issues

### 11. Admin Categories: No color preview before save
**Severity:** Low
**Location:** `src/pages/admin/AdminCategoriesPage.jsx`

**Description:** The color picker doesn't show a preview of how the badge will look with the selected color. Users could pick unreadable colors (e.g., white on white).

### 12. Admin New Request: Auto-approve checkbox lacks warning
**Severity:** Low
**Location:** `src/pages/admin/AdminNewRequestPage.jsx`

**Description:** The "Auto-approve this request" checkbox has no warning that it bypasses the normal approval workflow. Could lead to unintentional approvals.

### 13. Admin Returns: Date calculation uses raw math instead of date-fns
**Severity:** Low
**Location:** `src/pages/admin/AdminReturnsPage.jsx`

**Description:** `getDaysUntil()` function uses `Math.ceil((target - today) / 86400000)` which can have off-by-one errors due to DST/timezone changes. The app already imports `date-fns` — should use `differenceInDays()` instead.

### 14. Dell UltraSharp 27 4K Monitor: Test product to clean up
**Severity:** Low
**Location:** Database (`products` table)

**Description:** A test product "Dell UltraSharp 27 4K Monitor" was created during E2E testing and needs to be deleted from the database.

---

## Verified Working

- Sign-out button: EXISTS in `UserMenu.jsx` dropdown (avatar click → dropdown → "Sign out")
- Full request lifecycle: Pending → Approved → Picked Up → Returned → Closed
- Return item checklist with condition assessment and notes
- Product CRUD (Create, Edit, with proper data persistence)
- IT Onboarding 5-step wizard (all fields, auto-email generation)
- Cart persistence (localStorage via Zustand persist)
- Theme toggle (dark/light mode)
- Search functionality
- Notification badge with unread count
- Admin dashboard with charts (Requests, Equipment Usage)
- Email sending on request approval and return processing
- Timeline tracking for all status changes
