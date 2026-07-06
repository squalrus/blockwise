# Changelog

User-visible changes, newest first. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and [semver](https://semver.org/) versioning.

## [0.2.0] — 2026-07-05

### Added

- **Backlog system.** `BACKLOG.md` tracking proposed features, improvements, known issues, and limitations, with a documented shipping workflow (branch → changelog → version bump → build → PR). Seeded with 11 build-order items reordered so the web app ships first and native apps (React Native) follow as their own tracked item. (`BACKLOG.md`)
- **Contributing guide.** `CONTRIBUTING.md` documenting project stage, where work comes from, the branch/commit/PR workflow, and a reminder to re-read the Yelp/Google licensing constraints before touching data ingestion. (`CONTRIBUTING.md`)

### Changed

- **Web-first sequencing.** `README.md` now states plainly that the web app is being built first for rapid iteration, with native apps following shortly after on the same backend; retitled §10 from "Full-Featured Web App (Built in Parallel)" to "Web App (Building First)" and added a sequencing note to §8's build order. Added a "Project status" section linking to `BACKLOG.md`, `CHANGELOG.md`, and `CONTRIBUTING.md`. (`README.md`)
- **CLAUDE.md** now documents the backlog workflow (branch naming, changelog/version bump, PR via `gh`) alongside the existing version-tracking convention. (`CLAUDE.md`)

## [0.1.0] — 2026-07-05

### Added

- **Build plan.** Initial project README documenting the full build plan: data layer and licensing constraints (Google Places, Yelp Fusion, OpenStreetMap), categorization, points of interest, check-ins, business announcements, challenges, gamification, the web app, monetization via credits, multi-neighborhood architecture, business coupons, and anonymous/authenticated user access tiers. (`README.md`)
- **Project scaffolding.** `package.json` for version tracking, `CHANGELOG.md`, and `CLAUDE.md` documenting the version-tracking convention. (`package.json`, `CHANGELOG.md`, `CLAUDE.md`)
