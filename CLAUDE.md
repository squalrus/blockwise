## Version tracking

Version is tracked in `package.json` (the `"version"` field). The repo has six `package.json` files -- root, `apps/web`, `apps/api`, `apps/marketing`, `packages/types`, `packages/ui` -- and their `"version"` fields must always match. Bump all six together, never just the root.

## Keeping the URL map current

[docs/url-map.md](./docs/url-map.md) is a living inventory of every web route and API endpoint, not a point-in-time snapshot. Whenever a change adds, removes, renames, or re-scopes a route (a new `page.tsx`/`layout.tsx` under `apps/web/src/app` or `apps/marketing/src/app`, or a new/changed `app.get|post|patch|delete(...)` in `apps/api/src/app.ts`), update the matching tree in `docs/url-map.md` as part of that same change.

## Keeping Terms/Privacy current

[apps/marketing/src/app/terms/page.tsx](./apps/marketing/src/app/terms/page.tsx) and [privacy/page.tsx](./apps/marketing/src/app/privacy/page.tsx) describe specific, current product behavior (what data is collected, which third parties it's shared with, how check-ins/location work, etc.), not evergreen boilerplate. Whenever a change alters any of that -- a new data collection point, a new third-party processor/subprocessor (auth provider, analytics tool, hosting), a change to what's shared with other users or how account deletion works -- update the matching section of both pages (and bump the "Last updated" date) as part of that same change.

## Working with the backlog

[BACKLOG.md](./BACKLOG.md) tracks proposed work. Items are candidates, not commitments.

When shipping a backlog item: branch off `main` as `vX.Y.Z`, move the entry to CHANGELOG.md, bump `version` in all six `package.json` files, build, commit, push, then open a PR with `gh pr create`. Requires [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`).
