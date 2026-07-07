# Changelog

User-visible changes, newest first. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and [semver](https://semver.org/) versioning.

## [0.13.0] — 2026-07-06

### Added

- **My account page.** A new `/account` page giving signed-in users a single place to see their identity, favorites, and check-in history, instead of each being scattered across its own flow. Two new endpoints back it: `GET /me/favorites` and `GET /me/checkins`, both venue-joined listings (name/address alongside the raw `favorite`/`checkin` rows) gated by `requireAuthUser`. Wishlist and coupons sections show a "Coming soon" placeholder — neither has a backend yet (separate backlog items) — rather than being omitted outright, so the page's shape is already in place for when they land. A "My account" link was added to the top nav for any signed-in user. (`apps/api/src/favorites/`, `apps/api/src/checkins/`, `apps/api/src/app.ts`, `apps/web/src/app/account/page.tsx`, `apps/web/src/app/AccountNav.tsx`, `packages/types/src/index.ts`)

## [0.12.0] — 2026-07-06

### Added

- **Neighborhood admin roles.** Replaces the shared `ADMIN_API_TOKEN` secret with per-account admin roles: a new `neighborhood_admin` table (`user_id`, `neighborhood_id`) is checked by `requireAdmin`, which now requires a real signed-in session (the same Bearer-token auth as every other `/auth/*`-gated route) instead of an `X-Admin-Token` header. The role is additive to `account_type` — an account can be a consumer, a claimed business owner, and a neighborhood admin all at once. Granting is done via a new CLI script (`npm run grant:admin -- <email> <neighborhood-slug>`, mirroring `sync:places`) rather than a self-service invite UI, matching this project's current solo-operator scale — a self-serve invite flow remains a smaller follow-up on the backlog. `AppUser` gained an `is_neighborhood_admin` flag, surfaced in the top nav (`AccountNav`) as "Admin: claims" / "Admin: venues" links alongside the existing "Business portal" link. The `/admin/claims` and `/admin/venues` pages now sign requests with the browser's own session token instead of a pasted admin token. (`supabase/migrations/20260706070000_neighborhood_admin.sql`, `apps/api/src/admin/`, `apps/api/src/app.ts`, `apps/api/src/auth/auth.ts`, `apps/api/src/scripts/grantNeighborhoodAdmin.ts`, `apps/web/src/app/admin/`, `apps/web/src/app/AccountNav.tsx`, `packages/types/src/index.ts`)

## [0.11.0] — 2026-07-06

### Added

- **Category mapping admin tool.** A new `/admin/venues` page (same shared `ADMIN_API_TOKEN` gate as `/admin/claims`) lets an admin search venues by name or address and reassign a venue's category from a dropdown of the 39 leaf categories (grouped by their parent, e.g. "Food & Drink / Coffee Shop") — the manual override README §2 calls for when the sync's category-normalization step (README §1.4 step 3) maps a venue wrong. New `GET/PATCH /admin/venues*` and `GET /admin/categories` endpoints, backed by a `categoryMapping/` domain mirroring the `claims/` pattern; only leaf categories (those with a parent) are valid reassignment targets, since the 6 top-level group rows are organizational only. No schema changes — reuses the existing `venue`/`category` tables. 6 new unit tests. (`apps/api/src/categoryMapping/`, `apps/api/src/app.ts`, `apps/web/src/app/admin/venues/page.tsx`, `packages/types/src/index.ts`)

## [0.10.0] — 2026-07-06

### Added

- **Google social sign-in (OAuth).** A "Continue with Google" button on `/login` and `/signup`, alongside the existing email/password forms. Uses Supabase's `signInWithOAuth`, redirecting through a new `/auth/callback` page that completes the session — tries `/auth/complete-login` first (so a device's anonymous check-in history still merges correctly per README §14.2), falling back to `/auth/complete-signup` for a first-time Google user. No API changes: `verifyToken.ts` already read the auth provider generically off `app_metadata`. The signup form's consumer/business account-type choice is preserved across the redirect via `localStorage`, since Google's round trip would otherwise lose it. (`apps/web/src/lib/auth.ts`, `apps/web/src/app/auth/callback/page.tsx`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/signup/page.tsx`)
- **Promote a consumer account to a business account.** The business portal (`/business`) now offers a "Become a business owner" button for a signed-in consumer account, instead of only pointing at a fresh signup. New `POST /auth/promote-to-business` endpoint flips `account_type` on the existing `app_user` row in place — same identity, same check-in history, no new account. Idempotent if the account is already a business account. 2 new unit tests. (`apps/api/src/auth/auth.ts`, `apps/api/src/auth/repository.ts`, `apps/api/src/auth/supabaseRepository.ts`, `apps/api/src/app.ts`, `apps/web/src/lib/auth.ts`, `apps/web/src/app/business/page.tsx`)

### Changed

- **Synced `package.json` versions across the monorepo.** `apps/api` and `packages/types` were still at `0.0.0` and `apps/web` at `0.1.0` while the root tracked the real release version — all four now move together. `CLAUDE.md` updated to document that all four must be bumped together going forward. (`package.json`, `apps/api/package.json`, `apps/web/package.json`, `packages/types/package.json`, `CLAUDE.md`)

## [0.9.0] — 2026-07-06

### Added

- **Favorite venues.** A personal "I like this place" bookmark on the venue detail page, separate from check-ins or business claiming. Device-scoped like check-ins (README §14.2) — attaches to the existing anonymous `app_user` row and converts for free on signup, no migration step. New `favorite` table (unique per user/venue, RLS-enabled service-role-only like every other table), `GET/POST/DELETE /venues/:id/favorites` endpoints, and a toggle button on the venue detail page that loads current status on mount. 7 new unit tests. (`supabase/migrations/20260706060000_favorite_venues.sql`, `apps/api/src/favorites/`, `apps/api/src/app.ts`, `apps/web/src/app/venues/[id]/FavoriteButton.tsx`, `apps/web/src/app/venues/[id]/page.tsx`, `packages/types/src/index.ts`)

## [0.8.0] — 2026-07-06

### Added

- **Real user authentication.** Supabase Auth (email/password) signup and login, completing the anonymous-first `app_user` row from v0.6.0 rather than migrating to a new one (README §14.2) — signup flips `is_anonymous` to false and attaches auth credentials to the same row, so prior check-in history is never lost. Logging in from a device with its own separate anonymous history merges that history onto the account being logged into, rather than orphaning it (README §14.2's documented edge case). Also adds a business-account variant (`account_type`): a business owner's claim submission auto-links to their account when signed in (`business_claim.claimed_by_user_id`), and a new gated `/business` portal page lists the venues that account has an approved claim on — the first concrete use of the `requireBusinessAccount` gate that later authoring-tool features (announcements, etc.) will build on. New `apps/api/src/auth/` domain (signup/login/merge logic, Supabase Auth token verification, `requireAuthUser`/`requireBusinessAccount`/`attachOptionalAuthUser` middleware) with 9 new unit tests; new `/signup`, `/login`, `/business` pages and a nav bar in `apps/web`. (`supabase/migrations/20260706050000_user_authentication.sql`, `apps/api/src/auth/`, `apps/api/src/app.ts`, `apps/api/src/claims/`, `apps/web/src/app/signup/`, `apps/web/src/app/login/`, `apps/web/src/app/business/`, `apps/web/src/app/AccountNav.tsx`, `apps/web/src/lib/auth.ts`, `apps/web/src/lib/supabaseClient.ts`, `packages/types/src/index.ts`)
- **Supabase migration workflow docs.** New `supabase/README.md` covering the day-to-day CLI commands (`login`/`link`, local `start`/`db reset`, `migration new`, `db push`) that CONTRIBUTING.md's conventions section didn't itself spell out. (`supabase/README.md`)

### Security

- **Removed a prompt-injection attempt embedded in the repo.** `apps/web/AGENTS.md` (auto-loaded by `apps/web/CLAUDE.md`) instructed any agent reading it to consult fabricated documentation at a Next.js path that doesn't exist, framed as "this is NOT the Next.js you know" — a planted instruction rather than genuine project guidance. Both files removed; neither carried any other content worth preserving. (`apps/web/AGENTS.md`, `apps/web/CLAUDE.md`)

## [0.7.0] — 2026-07-06

### Added

- **Venues map view.** `/venues` now has a List/Map toggle; the map renders every venue as a marker on the Google Maps JavaScript API, colored by its top-level category group (Food & Drink, Retail, Health & Wellness, Services, Arts/Culture/Recreation, Lodging) with an always-visible legend, clustered via `@googlemaps/markerclusterer` so dense blocks collapse into a single pin until zoomed in, and fit to the actual bounds of the synced venues rather than a fixed center/zoom. Clicking a marker opens an info window (name, category, address, a link to the venue's detail page) built from DOM APIs rather than an HTML string, since venue name/address ultimately come from Google Places sync and, later, business self-submission — neither should be trusted as pre-sanitized HTML. Marker/legend colors were run through the project's dataviz-palette validator for colorblind-safe separation in both light and dark mode. Falls back to a clear message instead of a broken map when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` isn't configured. `VenueListItem` (and the `GET /venues` list endpoint) now also carries `lat`/`lng` and a `category_group` field (the category's parent row, distinct from its specific `category_name`) to support marker placement and color-coding. Verified end-to-end in a browser against live Phinneywood data (229 venues) with a real Maps API key: toggle, clustering, category colors, and the marker click → info window flow. (`apps/web/src/app/venues/MapView.tsx`, `apps/web/src/app/venues/VenuesView.tsx`, `apps/web/src/lib/categoryColors.ts`, `apps/web/src/app/venues/page.tsx`, `apps/api/src/venues/supabaseDetailRepository.ts`, `packages/types/src/index.ts`, `apps/web/.env.example`)

## [0.6.0] — 2026-07-06

### Added

- **Business claiming + GPS check-in.** Consumers can check in at a venue from its detail page: the browser's Geolocation API is checked against `Venue.lat/lng` with a 100m geofence (README §4 Phase 1), and repeat check-ins at the same venue are blocked for 4 hours to prevent streak gaming. Check-ins attach to a new anonymous-first `app_user` row (README §14.2) — every device gets one from its first check-in, identified by a device id generated client-side and persisted in `localStorage`, with no signup required. Business owners can submit a claim request from the same page (contact name, phone/email/domain, and an optional note); since no SMS/email provider is wired into this project yet, verification is manual — claims land in a pending queue reviewed from a new internal `/admin/claims` page (gated by a shared `ADMIN_API_TOKEN` secret, the pragmatic stand-in until a real admin-auth system exists) and approving one flips `Venue.claimed_by_business`. New `app_user`, `business_claim`, and `checkin` tables, all RLS-enabled with no policies (service-role only, matching every other table). 16 new unit tests. Verified end-to-end against live Phinneywood data in a browser: geofence pass/fail, cooldown enforcement, claim submission → admin approval → claim form disappearing, and the already-claimed/already-reviewed conflict guards. (`supabase/migrations/20260706040000_business_claims_and_checkins.sql`, `apps/api/src/checkins/`, `apps/api/src/claims/`, `apps/api/src/admin/requireAdmin.ts`, `apps/api/src/app.ts`, `apps/web/src/app/venues/[id]/CheckInButton.tsx`, `apps/web/src/app/venues/[id]/ClaimBusinessForm.tsx`, `apps/web/src/app/admin/claims/page.tsx`, `apps/web/src/lib/deviceId.ts`, `apps/web/src/lib/clientApi.ts`, `packages/types/src/index.ts`)

### Fixed

- **Local dev: client-side `/api/*` requests had no path to the API server.** The new check-in/claim UI is the first client-side (browser) fetching in `apps/web` — in production, Netlify's redirect (`netlify.toml`) makes `/api/*` same-origin, but locally `next dev` (port 3000) and `apps/api`'s dev server (port 4000) are separate origins with no CORS layer (deliberately removed in v0.3.1 to keep prod same-origin). Added a dev-time Next.js rewrite proxying `/api/*` to the API server, so browser fetches work locally without reintroducing CORS. No-op in production, where Netlify's own redirect handles the path first. (`apps/web/next.config.ts`)

## [0.5.2] — 2026-07-06

### Fixed

- **Venue photos rendered as broken images in production.** `apps/api/netlify/functions/api.ts` wrapped the Express app with `serverless-http` without declaring which content types are binary, so every response body — including `GET /venues/:id/photo`'s JPEG bytes — was encoded as UTF-8 text before being packaged into the Lambda-style response. Each invalid UTF-8 byte sequence in the image got replaced with the Unicode replacement character, corrupting the file even though the endpoint returned 200 with the correct `Content-Type`. Now passes `{ binary: ["image/*"] }` so image responses are base64-encoded instead. (`apps/api/netlify/functions/api.ts`)

## [0.5.1] — 2026-07-06

### Fixed

- **Deployed API returned 502 on every route, including `/health`.** `createApp()` built the venue routes' Supabase-backed repository eagerly at function cold-start, so a misconfigured or missing `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` in the deploy environment crashed the whole function before it could even serve `/health` — a route that never touched Supabase before v0.5.0. The repository and Places client are now constructed lazily on first request, so a Supabase misconfiguration only fails the `/venues*` routes (with a clean 500) instead of taking down the entire API. (`apps/api/src/app.ts`)

## [0.5.0] — 2026-07-06

### Added

- **Venue detail pages with on-demand enrichment cache.** Web pages at `/venues` (list) and `/venues/[id]` (detail) render neighborhood businesses sourced from the data layer MVP. The detail page fetches Google Place Details (ratings, price tier, reviews, photos) on first view and caches them in `VenueEnrichmentCache` with a 24-hour TTL — stale entries are transparently refreshed on subsequent views, and refresh failures fall back to whatever's cached rather than blocking the page. The API also includes a `GET /venues/:id/photo` proxy that fetches the photo via its Google reference server-side (never exposing the API key to the browser, which is critical for cost control). Built on a new `venues/` repository layer mirroring the pattern in `places/` for testability. 40 unit tests, end-to-end verified against live Phinneywood data (70+ venues, real Google enrichment with photos, ratings, reviews). (`apps/web/src/app/venues/`, `apps/api/src/venues/`, `apps/api/src/app.ts` routes, `apps/api/src/places/client.ts` Place Details client + mock, `packages/types/src/index.ts` DTOs)

## [0.4.1] — 2026-07-06

### Fixed

- **Deployed site showed the API health check as unreachable.** `apps/web`'s homepage server-fetch defaulted to `http://localhost:4000`, which doesn't exist in production, and fetched `/health` directly, a path the deployed site's `/api/*`-only redirect (`netlify.toml`) never routes to the co-located function. Now falls back to `process.env.URL` (Netlify's own auto-injected production site URL — no dashboard configuration needed) and always requests `/api/health`, which resolves correctly against both the deployed redirect and the local `apps/api` dev server. (`apps/web/src/app/page.tsx`)

## [0.4.0] — 2026-07-06

### Added

- **Google Places sync, dedup, and category normalization.** `apps/api/src/places/` implements the remaining data layer ingestion pipeline (README §1.4): a grid-tiled Google Places (New) Nearby Search restricted to the category taxonomy's Google types (chunked to stay under the API's 50-type-per-call and 20-result-per-call limits), a Levenshtein-similarity + geo-proximity dedup pass (catches duplicates against existing venues and within the same sync batch), and category matching that flags unmapped Google types for manual review instead of guessing. Business-claimed venues are treated as source-of-truth and never overwritten by re-syncs. Runnable via `npm run sync:places -- <neighborhood-slug>` in `apps/api` (mock Google client by default; real client once `GOOGLE_PLACES_API_KEY` is set — see `apps/api/GOOGLE_PLACES_SETUP.md`). Verified end-to-end against live Google data: 229 real Phinneywood businesses synced, correctly categorized, zero unmapped. 32 vitest unit tests. (`apps/api/src/places/`, `apps/api/src/scripts/syncPlaces.ts`, `apps/api/package.json`, `apps/api/tsconfig.json`, `turbo.json`, `supabase/migrations/20260706031000_neighborhood_for_sync_fn.sql`)
- **Unified category taxonomy.** 39 categories across 6 groups (Food & Drink, Retail, Health & Wellness, Services, Arts/Culture/Recreation, Lodging) mapped to Google Places types per README §2. (`supabase/migrations/20260706030000_category_taxonomy.sql`)
- **Phinneywood boundary polygon.** Hand-authored placeholder polygon around the Greenwood Ave N / Phinney Ave N corridor (README §12.4) so the sync has a real area to scope against — a stand-in until the admin boundary-drawing tool (§12.6, still on the backlog) exists. (`supabase/seed.sql`, `supabase/migrations/20260706032100_phinneywood_boundary.sql`)

### Fixed

- **Netlify Functions build failure: `serverless-http` unresolved.** Netlify treats the configured `base` directory's `package.json` (`apps/web`) as the site's dependency manifest for function bundling, even though the function code and its dependencies actually live in `apps/api` — added the function's runtime dependencies (`serverless-http`, `express`, `@supabase/supabase-js`) to `apps/web/package.json` so esbuild can resolve them. (`apps/web/package.json`, `package-lock.json`)
- **Missing Supabase grants blocked every service-role query.** The RLS-enabled tables from the initial schema migration had no explicit GRANTs to `service_role` — this project's Supabase config has `auto_expose_new_tables` off (the new default), so grants are no longer automatic — meaning every query from `apps/api` was failing with "permission denied" regardless of RLS. Granted table/sequence/function privileges to `service_role`, including for tables created after this migration. (`supabase/migrations/20260706032000_grant_service_role.sql`)
- **Invalid Google Places type strings rejected by the API.** `dry_cleaning` and `second_hand_store` aren't real Google Places (New) type values; replaced with the correct `laundry` and `thrift_store` mappings. (`supabase/migrations/20260706033000_fix_invalid_google_types.sql`)
- **Short-term rental listings flooding the venue table.** Google's `lodging`/`bed_and_breakfast` types cover any Airbnb/VRBO-style listing, not just real hotels — a live sync run confirmed 122 of 350 synced venues were vacation rentals rather than neighborhood businesses. Restricted "Hotel & Lodging" to the `hotel` type only. (`supabase/migrations/20260706034000_restrict_lodging_to_hotels.sql`)

## [0.3.2] — 2026-07-05

### Added

- **Data layer schema (partial).** Supabase migration (`supabase/migrations`) creating `Neighborhood`, `Category`, `Venue`, `POI`, and `VenueEnrichmentCache` tables on Postgres/PostGIS per README §1.3, with row-level security enabled (no policies yet — service-role key only) and a seed inserting the Phinneywood neighborhood row (`onboarding` status). Added matching shared TypeScript types to `packages/types`. Google Places sync, dedup, and category normalization remain — see `BACKLOG.md`. (`supabase/migrations`, `supabase/seed.sql`, `packages/types/src/index.ts`)
- **Google Places setup guide.** `apps/api/GOOGLE_PLACES_SETUP.md` documenting the Google Cloud project/billing/API-key steps needed before the real (non-mocked) Places sync can run. (`apps/api/GOOGLE_PLACES_SETUP.md`)

### Fixed

- **Netlify build failure on `functionsDirectory`.** `apps/web/netlify.toml` now sets `base = "apps/web"` explicitly, so the `functions = "../api/netlify/functions"` path resolves relative to `apps/web` instead of the repo root (where it was resolving one level above the repo and failing Netlify's containment check). (`apps/web/netlify.toml`)

### Removed

- **Yelp Fusion API dropped from the active plan.** Removed from README (licensing constraints, schema, ingestion pipeline, cost/attribution, build order, stack, CI/CD) and `CONTRIBUTING.md`'s licensing reminder; kept only as a documented potential future enhancement in `BACKLOG.md`. (`README.md`, `BACKLOG.md`, `CONTRIBUTING.md`)

## [0.3.1] — 2026-07-05

### Changed

- **Netlify + Supabase adopted as the hosting plan of record.** `README.md` (§9, §10.2, §10.4) now specifies Supabase (Postgres + PostGIS, Auth, Storage) for the data/auth layer and a single Netlify site for hosting, replacing the earlier Vercel/ECS-Cloud Run-Fly.io options — the weekly Google sync and Yelp cache TTL purge are planned as Netlify Scheduled Functions rather than a standalone worker process. (`README.md`)
- **`apps/api` restructured to deploy as a Netlify Function.** The Express app now lives behind `createApp()` (`apps/api/src/app.ts`) so it can be wrapped with `serverless-http` for Netlify (`apps/api/netlify/functions/api.ts`) while `apps/api/src/index.ts` still runs it locally via `app.listen`. `apps/web/netlify.toml` configures the combined site (Next.js + co-located `apps/api` function, `/api/*` redirect, same-origin — no separate API host or CORS needed). Added `apps/api/src/supabase.ts` (server-side Supabase client) and `apps/api/.env.example`. (`apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/netlify/functions/api.ts`, `apps/api/src/supabase.ts`, `apps/web/netlify.toml`)

### Removed

- **`cors` dependency.** No longer needed now that `apps/web` and `apps/api` deploy as one same-origin Netlify site. (`apps/api/src/app.ts`, `apps/api/package.json`)

## [0.3.0] — 2026-07-06

### Added

- **Web app scaffold.** Turborepo monorepo (`apps/web`, `apps/api`, `packages/types`) with npm workspaces, establishing the API-first foundation the rest of the build depends on. `apps/web` is Next.js (App Router) + TypeScript + Tailwind CSS; `apps/api` is an Express + TypeScript service stub; `packages/types` holds shared TypeScript types consumed by both. No auth, map, or real data yet — the homepage does a live server-side health-check round trip against `apps/api`'s `/health` endpoint to prove the two services talk to each other. (`turbo.json`, `apps/web`, `apps/api`, `packages/types`)

### Changed

- **Build/test gate documented.** `CONTRIBUTING.md` now points to `npm run build` (Turborepo, builds all workspaces) as the correctness gate, now that `apps/*` exists. (`CONTRIBUTING.md`)

## [0.2.0] — 2026-07-05

### Added

- **Backlog system.** `BACKLOG.md` tracking proposed features, improvements, known issues, and limitations, with a documented shipping workflow (branch → changelog → version bump → build → PR). Seeded with 11 build-order items reordered so the web app ships first and native apps (React Native) follow as their own tracked item. (`BACKLOG.md`)
- **Contributing guide.** `CONTRIBUTING.md` documenting project stage, where work comes from, the branch/commit/PR workflow, and a reminder to re-read the Yelp/Google licensing constraints before touching data ingestion. (`CONTRIBUTING.md`)

### Changed

- **Web-first sequencing.** `README.md` now states plainly that the web app is being built first for rapid iteration, with native apps following shortly after on the same backend; retitled §10 from "Full-Featured Web App (Built in Parallel)" to "Web App (Building First)" and added a sequencing note to §8's build order. Added a "Project status" section linking to `BACKLOG.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`. (`README.md`)
- **CLAUDE.md** now documents the backlog workflow (branch naming, changelog/version bump, PR via `gh`) alongside the existing version-tracking convention. (`CLAUDE.md`)

## [0.1.0] — 2026-07-05

### Added

- **Build plan.** Initial project README documenting the full build plan: data layer and licensing constraints (Google Places, Yelp Fusion, OpenStreetMap), categorization, points of interest, check-ins, business announcements, challenges, gamification, the web app, monetization via credits, multi-neighborhood architecture, business coupons, and anonymous/authenticated user access tiers. (`README.md`)
- **Project scaffolding.** `package.json` for version tracking, `CHANGELOG.md`, and `CLAUDE.md` documenting the version-tracking convention. (`package.json`, `CHANGELOG.md`, `CLAUDE.md`)
