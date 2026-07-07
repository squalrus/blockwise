# Blockwise

A hyperlocal neighborhood discovery app: browse local venues on a map, check in, follow business announcements and events, join challenges, and earn badges — launching with **Phinneywood, Seattle**, built to onboard additional neighborhoods without a code change.

The app is always free for end users; monetization is entirely on the business side (claimed listings, credits for POIs/events/announcements/coupons). See [docs/project-plan.md](./docs/project-plan.md) for the full rationale.

## Status

Moving from planning into implementation, web app first. See [CHANGELOG.md](./CHANGELOG.md) for what's shipped and [BACKLOG.md](./BACKLOG.md) for what's proposed next.

## Repo structure

```
apps/
  web/            Next.js (App Router) — consumer app + business/neighborhood-admin portals
  api/            Express API — wrapped as a Netlify Function in production
packages/
  types/          Shared TypeScript types used by both apps
supabase/
  migrations/     Schema changes, in commit order
  seed.sql        Local-only sample data
docs/             Architecture, route map, and setup guides (see below)
```

## Getting started

Requires Node.js and npm (npm workspaces manage the monorepo — no separate package manager needed).

```bash
npm install
```

**Environment variables** — copy each app's `.env.example` and fill in real values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

- `apps/api/.env` needs a Supabase project's URL + service-role key, and (optionally) a Google Places API key — see [docs/google-places-setup.md](./docs/google-places-setup.md) if you don't have one yet.
- `apps/web/.env.local` needs the same Supabase project's URL + anon key (browser-side auth only), plus a Google Maps JavaScript API key for the map view.
- See [supabase/README.md](./supabase/README.md) for linking to the hosted project or running a local Postgres/Auth/Storage stack instead.

**Run both apps in dev mode** (Turborepo):

```bash
npm run dev
```

`apps/web` runs on `:3000`, `apps/api` on `:4000` by default.

**Build and test:**

```bash
npm run build              # builds every workspace (Turborepo)
cd apps/api && npm test     # unit tests (vitest) — apps/api only, for now
```

## Documentation

| Doc | What's in it |
|---|---|
| [docs/project-plan.md](./docs/project-plan.md) | The original architecture/build plan — data model, licensing constraints, monetization model, multi-neighborhood design, and every other numbered section (`§1`–`§14`) referenced elsewhere in this repo |
| [docs/url-map.md](./docs/url-map.md) | Current inventory of every web route and API endpoint — keep it in sync when routes change (see [CONTRIBUTING.md](./CONTRIBUTING.md)) |
| [docs/google-places-setup.md](./docs/google-places-setup.md) | One-time Google Cloud Console setup for the real (non-mocked) Places sync |
| [BACKLOG.md](./BACKLOG.md) | Proposed features, improvements, and known issues — candidates, not commitments |
| [CHANGELOG.md](./CHANGELOG.md) | Shipped, user-visible changes, newest first |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Branching, versioning, and PR workflow for landing a change |
| [supabase/README.md](./supabase/README.md) | Day-to-day Supabase CLI commands (linking, local dev stack, migrations) |
