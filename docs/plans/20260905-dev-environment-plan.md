# Dev environment & migration automation plan

BACKLOG.md Ref 95. Architecture is locked in and every open question is
resolved — "Rollout checklist" is ready to execute against.

## Context: what exists today

- **One Supabase project** (`zneendotoyvngytrjczn`), used for everything.
  `apps/api/.env.local` points straight at it — local development runs
  against the same database as production. There is no isolation between
  "a developer testing a change on their laptop" and "a real user's data."
- **Two Netlify sites**, `apps/web` (`app.tryspored.com`) and
  `apps/marketing` (`tryspored.com`), each with its own `netlify.toml`.
  Netlify's GitHub integration auto-deploys on push to `main` — there is no
  staging context today; `main` *is* production.
- **Migrations are manual.** `supabase/migrations/*.sql` is applied to the
  hosted project by hand (`supabase db push`), documented in
  `supabase/README.md` and `CONTRIBUTING.md` as "remember to run it after
  merging a schema change, before the app code that depends on it reaches
  production." Nothing enforces the ordering — a merged PR can go live on
  Netlify (automatically) well before someone remembers to push the
  matching migration.
- **CI** (`.github/workflows/ci.yml`) runs lint/typecheck/test on every PR
  and on push to `main`. It doesn't deploy anything or touch Supabase.

Two problems this plan is meant to fix: no safe place to try things against
real infrastructure without touching production data, and no guarantee
that a schema change and the code that depends on it arrive together.

## Target architecture

### Supabase: a second, real project (not a preview branch)

Create a second hosted Supabase project — call it `spored-dev` — rather
than using Supabase's preview-branching feature. Preview branches are
built for short-lived, per-PR/per-feature databases that get torn down;
what's wanted here is the opposite: a **persistent** environment that
sticks around across many changes. A second full project is also simpler
to reason about: its own dashboard, its own `project-ref`, its own
migration history, no branch-lifecycle rules to learn.

- Same `supabase/migrations/` directory serves both projects — link
  `supabase link --project-ref <dev-ref>` locally, or pass
  `SUPABASE_PROJECT_ID` per-environment in CI (see automation section
  below). One migration history, two targets.
- **Starts empty, deliberately — no seeding.** `supabase/seed.sql` only
  runs on a local `supabase db reset`, never on `supabase db push` to a
  hosted project (confirmed in `supabase/README.md`), so pushing
  migrations to the fresh `spored-dev` project leaves it with zero rows
  and no extra step needed to keep it that way. The plan is to create
  neighborhoods, businesses, and everything else by hand through the
  app's own flows — starting with the new-neighborhood creation flow
  itself (the thing Ref 116 is about opening up more broadly), which
  doubles as real testing of that flow rather than a chore to script
  around.
- Local development points at `spored-dev`'s URL/keys by default
  (update `apps/api/.env.example` and this project's own `.env.local` —
  the current setup, where local dev's `.env.local` points at the
  production project directly, goes away). Anyone can still run
  `supabase start` for a fully local Postgres instance when they want zero
  network dependency; `spored-dev` is for testing against a shared,
  persistent instance that accumulates real usage over time instead.

### Netlify: a second site per app for dev; build-on-promote for prod

Two ordinary Netlify sites per app, both tracking `main` — not one site
with deploy contexts, and no second git branch:

- **A new Netlify site, `spored-dev`** (same name as the Supabase project
  below, but a separate thing — repo/base unchanged, same `apps/web`
  directory): Production branch = `main`, auto-build and auto-publish on —
  completely default Netlify behavior, nothing special configured. Its own
  domain (`app-dev.tryspored.com`) and its own site-level env vars,
  pointed at the `spored-dev` Supabase project's URL/keys and a dev
  Geoapify key. Every push to `main` goes live here automatically and
  immediately, exactly like `app.tryspored.com` does today — this is the
  "auto-deployed dev" half.
- **The existing `app.tryspored.com` site**: Production branch stays
  `main` — completely unchanged — but flip on Netlify's **"Stop builds"**
  setting, which pauses the git-triggered build entirely. A push to `main`
  doesn't touch this site at all; it only builds (and publishes, in the
  same step) when the "Promote to production" workflow explicitly deploys
  a specific commit via the Netlify CLI. No SSG/ISR data fetching happens
  at build time anywhere in `apps/web` (verified — no
  `generateStaticParams`/`revalidate` usage), so there's no correctness
  reason to build on every push; building only when actually promoting is
  strictly cheaper with no downside there. The one trade-off: nothing in
  CI today verifies a build succeeds (`ci.yml` only lints/typechecks/
  tests) — dev's auto-build was the only build-success signal, and a
  prod-specific failure (almost always a missing/misconfigured env var,
  since dev and prod share the same build command) now surfaces at
  promotion time instead of at merge time. Low-stakes: nothing goes live,
  the previous deploy keeps serving, fix and re-run the promotion.
- Same two-site treatment could apply to `apps/marketing` if a dev
  marketing site is wanted, though it's static/no-DB and lower priority —
  fine to leave `tryspored.com` as a single auto-deploying site for now.
- Net effect: `main` stays the only branch anyone ever pushes to or opens
  a PR against — no `production` ref, no context-scoped env var
  indirection to learn. Each site's config is just ordinary, non-contextual
  site settings, matching how the single existing site works today. Build
  minutes: dev builds on every push as before; prod now builds only when
  actually promoted, which should be less total build volume than today's
  single always-building site, not more.
- Carry forward the original backlog note: hide `app-dev.tryspored.com`
  from search engines and casual visitors (`X-Robots-Tag: noindex` header
  or `robots.txt` disallow on that site). Netlify's password-protection
  add-on, considered as a belt-and-suspenders option on top of that, turned
  out to require a paid plan upgrade — skipped; `noindex`/robots is the
  whole plan for hiding the dev site, not a fallback.

### Migration automation: sequencing db and code together

To answer the "can this run as part of a build" question directly: yes.
The Supabase CLI is fully non-interactive when given `SUPABASE_ACCESS_TOKEN`
(a personal or CI access token in place of the interactive `supabase login`)
and a project ref, so `supabase db push` can run unattended in GitHub
Actions.

The subtlety is ordering, not capability, and it matters differently for
the two sites:

- **Dev** (`spored-dev`) auto-publishes the instant a build
  finishes, same as today. Add a plain GitHub Actions job (extending
  `.github/workflows/ci.yml`, gated on the existing lint/typecheck/test
  job) that runs `supabase db push` against `spored-dev` on every push
  to `main`. It races Netlify's own auto-build rather than gating it — and
  that's an accepted tradeoff, not an oversight: dev is a low-stakes
  playground, both the migration and the build typically finish within
  seconds of each other, and the worst case is a few seconds of a stale
  schema against new code on a database nobody depends on. Keeping dev's
  deploy fully automatic (no build-hook indirection, no held publishes) is
  worth that small, self-resolving risk.
- **Production** is where the ordering actually has to be guaranteed: a
  `workflow_dispatch` workflow ("Promote to production"), restricted to
  Chad and triggered deliberately, that:
  1. checks out the target commit
  2. runs `supabase db push` against the **production** Supabase project
  3. runs `netlify deploy --prod` (Netlify CLI, authenticated via a site
     token) against that checkout — this builds and publishes to
     `app.tryspored.com` in one step, since the site's own auto-build is
     paused ("Stop builds")

  Sequencing is just "don't run step 3 unless step 2 succeeds."

Either way, every migration must stay backward-compatible with the
*previous* release's code for the (now very short, for prod; a few
seconds, for dev) window between "migration applied" and "new code live"
— additive changes, expand/contract for anything destructive. Worth
calling that out explicitly in `CONTRIBUTING.md`'s migration conventions
once this ships, since it's implicit today but becomes load-bearing once
this is automated.

### API keys per environment

- **Supabase**: automatic — a second project means an entirely separate
  URL, anon key, and service-role key. No shared state with production by
  construction.
- **Geoapify**: use a **separate key for dev**, not the production one.
  Geoapify's free tier is a shared 3,000-credit/day pool per key
  (`docs/plans/20260828-location-services-comparison.md`), and BACKLOG.md Ref 115/120
  already flag that admin-triggered calls (boundary syncs, investigate
  tooling) can eat meaningfully into that pool — dev/testing traffic
  competing with production's daily budget is exactly the kind of
  silent-degradation risk those items describe. A second free-tier
  Geoapify project/key sidesteps it entirely.
- **VAPID (web push)**: generate a separate dev keypair. Low-stakes either
  way since dev's `push_subscriptions` table starts empty, but it's a
  30-second `npx web-push generate-vapid-keys` and removes any chance of
  a dev subscription confusion.
- **GA4**: leave dev's `NEXT_PUBLIC_GA_MEASUREMENT_ID` blank (the
  component is already a documented no-op when unset) rather than
  standing up a second GA property nobody will look at — revisit only if
  dev traffic actually needs to be analyzed.

## Rollout checklist

Check items off in order — each roughly depends on the ones before it in
its group. Groups themselves are mostly sequential too (Supabase before
Netlify env vars, everything before the dry run), but the two "Netlify"
sites can be set up in either order relative to each other.

### Supabase

- [x] Check the Supabase org's free-tier project limit and free-project
      pause-after-inactivity behavior — decide whether `spored-dev`
      needs a paid tier to stay always-on as a persistent playground.
      **Resolved:** the existing org's free-tier project limit didn't
      leave room for a second project, so a new Supabase org was created
      under `dev@tryspored.com`, and the production `spored` project was
      migrated into it (`spored-dev` created there too). Both projects
      now live in the same org — worth folding into the "who can promote
      to production" decision below, since org membership on
      `dev@tryspored.com` is a third permission surface (alongside GitHub
      and Netlify) that controls prod's Supabase project directly.
- [x] Create the `spored-dev` project in the Supabase dashboard
- [x] `supabase link --project-ref <dev-ref>` locally and run migrations
      against it (`supabase db push` or equivalent for a fresh project) —
      leave it unseeded, empty by design
- [x] Configure `spored-dev`'s Auth settings (Site URL / Redirect URLs,
      in that project's dashboard) to point at the dev domain
- [x] Update `apps/api/.env.example` / `apps/web/.env.example` and local
      `.env.local` files to point at `spored-dev` by default
- [x] Update `supabase/README.md` and `CONTRIBUTING.md`'s "Supabase
      migrations" section to describe the two targets (dev vs. prod)

### Netlify — dev site

- [x] Check whether Netlify's password-protection add-on is available on
      the current plan (on top of `noindex`/robots either way). **Resolved:**
      behind a paid tier upgrade — skipping it, `noindex`/robots handling
      alone is the plan for hiding the dev site.
- [x] Create the new `spored-dev` site (same repo, `main`,
      default auto-build + auto-publish settings)
- [x] Point it at `app-dev.tryspored.com`
- [x] Set its site-level env vars: `spored-dev`'s Supabase URL/keys,
      a dev Geoapify key, a dev VAPID keypair, blank GA4 id
- [x] Add `noindex`/robots handling so the dev site isn't indexed —
      `apps/web/src/app/robots.ts` now disallows everything for any
      deploy whose `SITE_URL` isn't exactly `https://app.tryspored.com`
      (covers `app-dev.tryspored.com` and any future non-prod deploy)
- [x] Add `app-dev.tryspored.com` as an authorized redirect URI on the
      Google OAuth client (same client or a new dev-only one)

### Netlify — prod site

- [x] Confirm whether PR deploy previews are currently enabled on
      `app.tryspored.com` — if so, decide whether to move them to
      `spored-dev` before proceeding. **Resolved:** they were — moved to
      `spored-dev`, so open-PR previews now build against dev's Supabase
      project instead of production's.
- [x] Turn on "Stop builds" on `app.tryspored.com` (Production branch
      stays `main`, unchanged). Done via Netlify's auto-deploy toggle on
      the prod site — pushes to `main` no longer trigger a build there.

### GitHub Actions / secrets

- [x] Generate a `SUPABASE_ACCESS_TOKEN` (CI-scoped, not a personal login)
- [x] Generate a Netlify auth token scoped to `app.tryspored.com`, and
      note its site ID
- [x] Store both as GitHub Actions secrets; scope the Netlify/prod
      Supabase secrets to a `production` environment
- [x] Create the `production` GitHub environment with Chad as the
      required reviewer
- [x] Add two repo-level GitHub Actions **variables** (not secrets — project
      refs aren't sensitive, same as `supabase/README.md` already treats
      them): `SUPABASE_DEV_PROJECT_REF` (`cbqthngsrdzlkhsrfkwm`) and
      `SUPABASE_PROD_PROJECT_REF` (`zneendotoyvngytrjczn`, unchanged by the
      org migration). Surfaced while writing the two workflows below, which
      both read from these rather than hardcoding a ref inline.
- [x] Add the dev migration job to `.github/workflows/ci.yml` (push to
      `main` → `supabase db push` against `spored-dev`, gated on
      existing checks passing)
- [x] Add the `workflow_dispatch` "Promote to production" workflow
      (`.github/workflows/promote-production.yml`) — checkout target
      commit → migrate prod → `netlify deploy --prod --build`, gated on
      the `production` environment, fails closed by GitHub Actions'
      default stop-on-first-failure behavior (no extra `if:` needed).
      Two assumptions flagged inline in the workflow to verify on the
      first real dry run: whether `netlify deploy --build` actually
      fetches the site's dashboard env vars before building, and whether
      running it from `apps/web` (matching `netlify.toml`'s own `base`)
      is the right invocation for this monorepo layout.

### Verify

- [ ] Push a low-stakes change to `main` and confirm it appears on
      `app-dev.tryspored.com` automatically
- [ ] Run a full promotion end to end for that same change and confirm it
      reaches `app.tryspored.com`
- [ ] Confirm Google sign-in works on the dev domain (OAuth redirect URI
      + `spored-dev`'s Auth settings both configured)
- [ ] Create the first neighborhood on `spored-dev` by hand through the
      app's own new-neighborhood flow — first real data in the empty
      database, and a live test of that flow at the same time

## Decisions

- **Who can promote to production: just Chad, for now.** Three permission
  surfaces need to actually enforce this, not just the workflow's default
  path:
  - A GitHub Actions `environment` (e.g. `production`) with a required
    reviewer restricted to Chad's GitHub account, gating the "Promote to
    production" `workflow_dispatch` job.
  - Netlify's collaborator role on `app.tryspored.com` — anyone with
    deploy rights there could still trigger a manual deploy by hand (CLI
    or dashboard), bypassing the GitHub workflow entirely. Worth an audit
    at implementation time of who currently has that role on the site and
    trimming it to match.
  - Membership on the Supabase org under `dev@tryspored.com` — since
    `spored` (prod) and `spored-dev` both live in that one org now,
    anyone in it can reach production's database directly (run migrations,
    read/edit data, rotate keys) regardless of what the GitHub workflow
    or Netlify roles say. Worth the same audit: who's actually a member
    today, and trim to match.

## Design notes (not decisions — these resolve on their own)

- **Release cadence isn't a policy to pick.** The existing
  `ship-from-backlog` flow (branch off `main` as `vX.Y.Z`, PR back into
  `main`) doesn't change — `main` stays the trunk everything merges into.
  What changes is what happens *after* a merge lands: today it silently
  becomes production; under this plan `app.tryspored.com` doesn't build at
  all until Chad decides to promote, whether that's a minute later or a
  week later. Promoting less often doesn't cost anything extra either —
  if anything it means fewer prod builds overall, not more. The only thing
  cadence actually affects is the migration compatibility window below.
- **Migration backward-compatibility window scales with how long you wait
  to promote.** Every migration must stay safe to run against whatever
  code is *currently live* in production — already the standing rule in
  `CONTRIBUTING.md`'s migration conventions (additive changes,
  expand/contract for anything destructive). Promoting after every merge
  keeps that window to one release; batching several merges before
  promoting stretches it to however many migrations piled up in between.
  Not a new rule, just a reminder that it matters more the less often
  promotion happens.

## Open questions

None left — everything surfaced during planning is now either a settled
design note above or a checklist item in "Rollout checklist" (Supabase
pause/limits, OAuth redirects, PR deploy previews, password-protection,
fail-closed promotion ordering). Dev data hygiene is resolved: `spored-dev`
starts empty and stays hand-populated through the app's own flows, no seed
script.
