-- =============================================================
-- Migration 089 — Version the 'ghost' baseline policies that live
-- on profiles / products / categories / locations + close two
-- holes the export from production exposed.
--
-- Context: those four tables have policies in prod (migration 005
-- and earlier created the tables, plus manual Studio tweaks) but
-- the policies were never committed to git. That makes the
-- baseline opaque — nobody can tell from the repo what's actually
-- enforced. This migration re-declares each one explicitly with
-- DROP-then-CREATE so the state is unambiguous and auditable.
--
-- Two real fixes ride along:
--   * locations.SELECT was still 'true' (anyone, even
--     unauthenticated, could enumerate office addresses). The
--     supposed fix from 031 didn't take. Re-applied here.
--   * products.SELECT was 'true'. Catalog is behind login already
--     so the practical leak is small, but defense in depth says
--     require auth.
--
-- profiles.SELECT stays open to authenticated users — it's needed
-- by the offboarding autocomplete (ProfileAutocomplete fetches all
-- profiles to filter client-side). If/when we add a backend layer
-- we should expose a narrow /api/users/search endpoint and tighten
-- profiles.SELECT to admin-only. Documented inline.
-- =============================================================


-- ─── locations ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Locations are viewable by everyone"           ON public.locations;
DROP POLICY IF EXISTS "Locations are viewable by authenticated users" ON public.locations;
DROP POLICY IF EXISTS "Only admins can modify locations"             ON public.locations;

CREATE POLICY "Locations are viewable by authenticated users" ON public.locations
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify locations" ON public.locations
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── products ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Products are viewable by everyone"            ON public.products;
DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON public.products;
DROP POLICY IF EXISTS "Only admins can modify products"              ON public.products;

CREATE POLICY "Products are viewable by authenticated users" ON public.products
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can modify products" ON public.products
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── categories ───────────────────────────────────────────────
-- Taxonomy — kept readable without auth so the catalog can render
-- before the session resolves. Modifications stay admin-only.
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Only admins can modify categories"  ON public.categories;

CREATE POLICY "Categories are viewable by everyone" ON public.categories
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can modify categories" ON public.categories
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ─── profiles ─────────────────────────────────────────────────
-- NOTE: SELECT intentionally stays open to authenticated users.
-- It's required by the offboarding form's ProfileAutocomplete and
-- by admin user listing. The data exposed (first_name, last_name,
-- email, business_unit, avatar_url, role, is_active, job_title,
-- department, phone, azure_oid) is the same set Outlook's Global
-- Address List exposes to every employee, so the privacy boundary
-- is acceptable for an internal hub.
--
-- Migration path when we add a backend layer:
--   1. Expose /api/users/search returning only safe columns.
--   2. Tighten profiles.SELECT to admin-only.
--   3. Replace ProfileAutocomplete's direct .from('profiles') call
--      with a call to /api/users/search.

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"                 ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile"                ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any profile"                ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.profiles profiles_1
                WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin')
    );

CREATE POLICY "Admins can delete any profile" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM public.profiles profiles_1
                WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin')
    );


NOTIFY pgrst, 'reload schema';
