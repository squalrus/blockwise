# Contributing

## Project stage

Blockwise is moving from a build plan ([docs/plans/20260705-project-plan.md](./docs/plans/20260705-project-plan.md)) into implementation, starting with the web app — see [Project status](./docs/plans/20260705-project-plan.md#project-status). Expect the monorepo structure described in project plan §10.3 (`apps/web`, `apps/api`, `apps/mobile`, `packages/*`) to take shape incrementally rather than all at once; check `BACKLOG.md` for what's actually being worked on next.

## Where work comes from

- [BACKLOG.md](./BACKLOG.md) lists proposed features, improvements, and known issues — these are candidates, not commitments. Pick an item, or propose a new one, before starting non-trivial work.
- Larger architectural decisions (schema, licensing constraints, monetization model, etc.) are documented in [docs/plans/20260705-project-plan.md](./docs/plans/20260705-project-plan.md). If a change conflicts with what's written there, update it as part of the same change rather than letting it drift out of sync.

## Workflow

1. Branch off `main`, named for the target version (`vX.Y.Z`). Never commit directly to `main`.
2. Make the change. Update `docs/plans/20260705-project-plan.md`, `BACKLOG.md`, or other docs if reality has changed — in particular, **update [docs/url-map.md](./docs/url-map.md) whenever a route is added, removed, renamed, or re-scoped** (web page or API endpoint). It's a living inventory, not a point-in-time snapshot; a stale map is worse than no map.
3. Move the relevant backlog entry into `CHANGELOG.md` under a new version block (date, classification, user-facing summary), and remove it from `BACKLOG.md`.
4. Bump `version` in `package.json` per [semver](https://semver.org/): feature → minor, bug/improvement/cleanup → patch, breaking change → major.
5. Run the build/tests as the correctness gate: `npm run build` at the repo root (Turborepo builds all workspaces). A GitHub Actions workflow (`.github/workflows/ci.yml`) also runs `npm run lint`, `npm run typecheck`, and `npm run test` on every pull request and push to `main` — Playwright E2E and feature flags remain unbuilt; error tracking shipped in v0.71.0 (rolled on Postgres rather than Sentry — see project plan §10.4).
6. Commit, push the branch, and open a PR with `gh pr create`. Requires the [GitHub CLI](https://cli.github.com), authenticated via `gh auth login`.

## Commit and PR conventions

- Commit messages: short, imperative, focused on *why* over *what* (the diff already shows what changed).
- PRs: keep them scoped to one backlog item or fix where practical. Link the backlog item or issue being addressed.

## Supabase migrations

Schema changes live in `supabase/migrations` and must be pushed to a hosted project explicitly — `supabase db push` (after `supabase login` and `supabase link --project-ref <ref>` once per machine). Nothing applies automatically; there's no CI step for this yet. There are two hosted projects sharing this one migration history: `spored-dev` (day-to-day development, starts empty, no seed data) and `spored` (production, real user data) — see [docs/plans/20260905-dev-environment-plan.md](./docs/plans/20260905-dev-environment-plan.md) for the full architecture. `supabase link --project-ref <ref>` determines which one a given `db push` targets, so double-check which project is currently linked before pushing, especially before pushing to production.

- Never edit an already-applied migration file — add a new one instead, even to fix a mistake in a previous one.
- Every migration's `YYYYMMDDHHMMSS` filename prefix must be unique — two files sharing a timestamp corrupts the hosted database's migration history (`supabase_migrations.schema_migrations` tracks one row per version) and can make `supabase db push` fail with "relation already exists" on a table that's already there. Check `ls supabase/migrations | tail` (or `supabase migration list`) for the latest version before naming a new file, especially when multiple migrations land close together in time.
- `supabase/seed.sql` only runs on a local `supabase db reset`, not on `db push` to a hosted project. If a change needs to reach an already-seeded live row, write it as a migration (e.g. an idempotent `update ... where ... is null`), not just a `seed.sql` edit.
- Every new table needs an explicit `grant` to `service_role` (see `20260706032000_grant_service_role.sql`). This project's Supabase config has `auto_expose_new_tables` off (the current default), so RLS-enabled tables get **no** privileges for any role, including `service_role`, until granted — `apps/api` will fail with "permission denied" otherwise, regardless of RLS policies.
- A migration pushed to `spored-dev` must stay safe to run against whatever code is *currently live in production* — the two projects share one migration history, but not a release schedule, so a migration can reach dev well before the code that depends on it reaches prod. Additive changes and expand/contract for anything destructive, per usual.

## Licensing constraints (read before touching data ingestion)

If your change touches Geoapify Places data, re-read [project plan](./docs/plans/20260705-project-plan.md) §1.1 first — its field-mask billing model was written for Google Places but the same discipline (request only what a caller actually needs, respect the daily credit pool) carries over to Geoapify's per-endpoint credit weights (`apps/api/src/places/quotaGuard.ts`), not by convention. Don't bypass it to "simplify" a data path. (Yelp Fusion integration was dropped from the plan — see [BACKLOG.md](./BACKLOG.md) — but if it's ever picked back up, re-read §1.1 for its stricter 24-hour content TTL before touching that data path.)
