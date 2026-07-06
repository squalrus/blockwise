## Version tracking

Version is tracked in `package.json` (the `"version"` field).

## Working with the backlog

[BACKLOG.md](./BACKLOG.md) tracks proposed work. Items are candidates, not commitments.

When shipping a backlog item: branch off `main` as `vX.Y.Z`, move the entry to CHANGELOG.md, bump `version` in package.json, build, commit, push, then open a PR with `gh pr create`. Requires [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`).
