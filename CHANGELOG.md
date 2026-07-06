# Changelog

User-visible changes, newest first. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and [semver](https://semver.org/) versioning.

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
