# Contributing

## Project stage

Blockwise is moving from a build plan ([docs/project-plan.md](./docs/project-plan.md)) into implementation, starting with the web app — see [Project status](./docs/project-plan.md#project-status). Expect the monorepo structure described in project plan §10.3 (`apps/web`, `apps/api`, `apps/mobile`, `packages/*`) to take shape incrementally rather than all at once; check `BACKLOG.md` for what's actually being worked on next.

## Where work comes from

- [BACKLOG.md](./BACKLOG.md) lists proposed features, improvements, and known issues — these are candidates, not commitments. Pick an item, or propose a new one, before starting non-trivial work.
- Larger architectural decisions (schema, licensing constraints, monetization model, etc.) are documented in [docs/project-plan.md](./docs/project-plan.md). If a change conflicts with what's written there, update it as part of the same change rather than letting it drift out of sync.

## Workflow

1. Branch off `main`, named for the target version (`vX.Y.Z`). Never commit directly to `main`.
2. Make the change. Update `docs/project-plan.md`, `BACKLOG.md`, or other docs if reality has changed — in particular, **update [docs/url-map.md](./docs/url-map.md) whenever a route is added, removed, renamed, or re-scoped** (web page or API endpoint). It's a living inventory, not a point-in-time snapshot; a stale map is worse than no map.
3. Move the relevant backlog entry into `CHANGELOG.md` under a new version block (date, classification, user-facing summary), and remove it from `BACKLOG.md`.
4. Bump `version` in `package.json` per [semver](https://semver.org/): feature → minor, bug/improvement/cleanup → patch, breaking change → major.
5. Run the build/tests as the correctness gate: `npm run build` at the repo root (Turborepo builds all workspaces). No automated CI pipeline exists yet — see project plan §10.4 for the intended pipeline once the app surface justifies it.
6. Commit, push the branch, and open a PR with `gh pr create`. Requires the [GitHub CLI](https://cli.github.com), authenticated via `gh auth login`.

## Commit and PR conventions

- Commit messages: short, imperative, focused on *why* over *what* (the diff already shows what changed).
- PRs: keep them scoped to one backlog item or fix where practical. Link the backlog item or issue being addressed.

## Supabase migrations

Schema changes live in `supabase/migrations` and must be pushed to the hosted project explicitly — `supabase db push` (after `supabase login` and `supabase link --project-ref <ref>` once per machine). Nothing applies automatically; there's no CI step for this yet.

- Never edit an already-applied migration file — add a new one instead, even to fix a mistake in a previous one.
- `supabase/seed.sql` only runs on a local `supabase db reset`, not on `db push` to a hosted project. If a change needs to reach an already-seeded live row, write it as a migration (e.g. an idempotent `update ... where ... is null`), not just a `seed.sql` edit.
- Every new table needs an explicit `grant` to `service_role` (see `20260706032000_grant_service_role.sql`). This project's Supabase config has `auto_expose_new_tables` off (the current default), so RLS-enabled tables get **no** privileges for any role, including `service_role`, until granted — `apps/api` will fail with "permission denied" otherwise, regardless of RLS policies.

## Licensing constraints (read before touching data ingestion)

If your change touches Google Places data, re-read [project plan](./docs/project-plan.md) §1.1 first — its field-mask billing model is enforced in schema and code (see `VenueEnrichmentCache`'s TTL logic), not by convention. Don't bypass it to "simplify" a data path. (Yelp Fusion integration was dropped from the plan — see [BACKLOG.md](./BACKLOG.md) — but if it's ever picked back up, re-read §1.1 for its stricter 24-hour content TTL before touching that data path.) See [docs/google-places-setup.md](./docs/google-places-setup.md) for the one-time Google Cloud Console setup itself.
