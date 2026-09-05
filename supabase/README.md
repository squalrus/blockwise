# Supabase

This directory is the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) project: `migrations/` holds every schema change in commit order, `seed.sql` is local-only sample data (currently the Phinneywood neighborhood row), and `config.toml` is the local dev stack config.

For migration *conventions* (never editing an applied file, the `service_role` grant requirement, why `seed.sql` doesn't reach hosted projects), see [CONTRIBUTING.md's "Supabase migrations" section](../CONTRIBUTING.md#supabase-migrations) — this file is just the commands.

There are two hosted projects: **`spored-dev`** (day-to-day development — starts empty, no seed data by design) and **`spored`** (production — real user data). See [docs/plans/20260905-dev-environment-plan.md](../docs/plans/20260905-dev-environment-plan.md) for the full dev-environment architecture. Local development links to `spored-dev` by default; only link to `spored` when you deliberately mean to touch production.

## One-time setup

```sh
npx supabase login                              # opens a browser to authenticate
npx supabase link --project-ref <spored-dev-ref>   # links this checkout to spored-dev
```

No global install needed — `npx` fetches the CLI on demand. The project ref comes from Project Settings > General in that project's dashboard — not a secret, it's the same id embedded in its `SUPABASE_URL`.

## Local development

```sh
npx supabase start     # boots the local Postgres/Auth/Storage stack (Docker)
npx supabase db reset  # drops the local DB, replays every migration, then runs seed.sql
```

Local Postgres runs on `54322`, Studio (a Postgres GUI) on `54323` — see `config.toml` for the full port list. Point `apps/api`'s `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` at the local instance (`supabase status` prints both) to develop against it instead of a hosted project. Otherwise, `.env.local` should already point at `spored-dev` (see `apps/api/.env.example` / `apps/web/.env.example`).

## Adding a migration

```sh
npx supabase migration new <short_description>
```

Creates an empty, timestamp-prefixed file in `migrations/`. Write the schema change there, then either `npx supabase db reset` (local) or `npx supabase db push` (hosted) to apply it — see below.

## Pushing to a hosted project

```sh
npx supabase db push   # applies all pending migrations in order to whichever project is currently linked
```

Applies any migration files not yet recorded as run on the linked hosted project. Still a manual step for both projects today — there's no CI pipeline that runs it yet ([docs/plans/20260905-dev-environment-plan.md](../docs/plans/20260905-dev-environment-plan.md) plans to automate `spored-dev`'s push on every merge and gate production's behind an explicit promotion workflow). Until that lands:

- Pushing to **`spored-dev`** is routine and low-stakes — do it whenever your local migrations are ahead.
- Pushing to **`spored`** (production) needs the matching app code ready to go live at the same time — run it as part of that release, not as an afterthought.

Check which project is currently linked (or switch with `npx supabase link --project-ref <ref>`) before pushing — especially before pushing to production.
