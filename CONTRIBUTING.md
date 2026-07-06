# Contributing

## Project stage

Blockwise is moving from a build plan (`README.md`) into implementation, starting with the web app — see [Project status](./README.md#project-status). Expect the monorepo structure described in README §10.3 (`apps/web`, `apps/api`, `apps/mobile`, `packages/*`) to take shape incrementally rather than all at once; check `BACKLOG.md` for what's actually being worked on next.

## Where work comes from

- [BACKLOG.md](./BACKLOG.md) lists proposed features, improvements, and known issues — these are candidates, not commitments. Pick an item, or propose a new one, before starting non-trivial work.
- Larger architectural decisions (schema, licensing constraints, monetization model, etc.) are documented in `README.md`. If a change conflicts with what's written there, update the README as part of the same change rather than letting it drift out of sync.

## Workflow

1. Branch off `main`, named for the target version (`vX.Y.Z`). Never commit directly to `main`.
2. Make the change. Update `README.md`, `BACKLOG.md`, or other docs if reality has changed.
3. Move the relevant backlog entry into `CHANGELOG.md` under a new version block (date, classification, user-facing summary), and remove it from `BACKLOG.md`.
4. Bump `version` in `package.json` per [semver](https://semver.org/): feature → minor, bug/improvement/cleanup → patch, breaking change → major.
5. Run the build/tests as the correctness gate: `npm run build` at the repo root (Turborepo builds all workspaces). No automated CI pipeline exists yet — see README §10.4 for the intended pipeline once the app surface justifies it.
6. Commit, push the branch, and open a PR with `gh pr create`. Requires the [GitHub CLI](https://cli.github.com), authenticated via `gh auth login`.

## Commit and PR conventions

- Commit messages: short, imperative, focused on *why* over *what* (the diff already shows what changed).
- PRs: keep them scoped to one backlog item or fix where practical. Link the backlog item or issue being addressed.

## Licensing constraints (read before touching data ingestion)

If your change touches Google Places data, re-read README §1.1 first — its field-mask billing model is enforced in schema and code (see `VenueEnrichmentCache`'s TTL logic), not by convention. Don't bypass it to "simplify" a data path. (Yelp Fusion integration was dropped from the plan — see [BACKLOG.md](./BACKLOG.md) — but if it's ever picked back up, re-read §1.1 for its stricter 24-hour content TTL before touching that data path.)
