## Version tracking

Version is tracked in `package.json` (the `"version"` field). The repo has six `package.json` files -- root, `apps/web`, `apps/api`, `apps/marketing`, `packages/types`, `packages/ui` -- and their `"version"` fields must always match. Bump all six together, never just the root.

## Keeping the URL map current

[docs/url-map.md](./docs/url-map.md) is a living inventory of every web route and API endpoint, not a point-in-time snapshot. Whenever a change adds, removes, renames, or re-scopes a route (a new `page.tsx`/`layout.tsx` under `apps/web/src/app` or `apps/marketing/src/app`, or a new/changed `app.get|post|patch|delete(...)` in `apps/api/src/app.ts`), update the matching tree in `docs/url-map.md` as part of that same change.

## Working with the backlog

[BACKLOG.md](./BACKLOG.md) tracks proposed work. Items are candidates, not commitments.

When shipping a backlog item: branch off `main` as `vX.Y.Z`, move the entry to CHANGELOG.md, bump `version` in all six `package.json` files, build, commit, push, then open a PR with `gh pr create`. Requires [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`).
