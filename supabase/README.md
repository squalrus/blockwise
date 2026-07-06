# Supabase

This directory is the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) project: `migrations/` holds every schema change in commit order, `seed.sql` is local-only sample data (currently the Phinneywood neighborhood row), and `config.toml` is the local dev stack config.

For migration *conventions* (never editing an applied file, the `service_role` grant requirement, why `seed.sql` doesn't reach hosted projects), see [CONTRIBUTING.md's "Supabase migrations" section](../CONTRIBUTING.md#supabase-migrations) — this file is just the commands.

## One-time setup

```sh
npx supabase login                                # opens a browser to authenticate
npx supabase link --project-ref zneendotoyvngytrjczn   # links this checkout to the hosted project
```

No global install needed — `npx` fetches the CLI on demand. (`zneendotoyvngytrjczn` is this project's ref, from Project Settings > General in the dashboard — not a secret, it's the same id embedded in `SUPABASE_URL`.)

## Local development

```sh
npx supabase start     # boots the local Postgres/Auth/Storage stack (Docker)
npx supabase db reset  # drops the local DB, replays every migration, then runs seed.sql
```

Local Postgres runs on `54322`, Studio (a Postgres GUI) on `54323` — see `config.toml` for the full port list. Point `apps/api`'s `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` at the local instance (`supabase status` prints both) to develop against it instead of the hosted project.

## Adding a migration

```sh
npx supabase migration new <short_description>
```

Creates an empty, timestamp-prefixed file in `migrations/`. Write the schema change there, then either `npx supabase db reset` (local) or `npx supabase db push` (hosted) to apply it — see below.

## Pushing to the hosted project

```sh
npx supabase db push   # applies all pending migrations in order
```

Applies any migration files not yet recorded as run on the linked hosted project. This is a manual step — there's no CI pipeline that runs it yet (see `BACKLOG.md`'s "CI/CD pipeline" item), so remember to run it after merging a schema change, before the app code that depends on it reaches production.
