# Changelog

User-visible changes, newest first. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and [semver](https://semver.org/) versioning.

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
