## Version tracking

Version is tracked in `package.json` (the `"version"` field). The repo has four `package.json` files -- root, `apps/web`, `apps/api`, `packages/types` -- and their `"version"` fields must always match. Bump all four together, never just the root.

## Working with the backlog

[BACKLOG.md](./BACKLOG.md) tracks proposed work. Items are candidates, not commitments.

When shipping a backlog item: branch off `main` as `vX.Y.Z`, move the entry to CHANGELOG.md, bump `version` in all four `package.json` files, build, commit, push, then open a PR with `gh pr create`. Requires [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`).
