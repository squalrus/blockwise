# Backlog

Tracks future features, improvements, and known bugs. Items here are not committed work — they're candidates.

## Shipping a backlog item

1. Branch off `main` named for the target version (`vX.Y.Z`). Never commit directly to `main`.
2. Move the entry to CHANGELOG.md with a version block (date, classification, user-facing summary). Remove it from here.
3. Update docs where reality changed (README, CONTRIBUTING, etc.).
4. Pick the version by semver: feature → minor; bug / improvement / cleanup → patch; breaking → major.
5. Bump the version in whichever location CLAUDE.md documents (package.json, VERSION file, or CHANGELOG.md only).
6. Run the build as the correctness gate.
7. Commit and push the branch, then open a PR with `gh pr create`. Requires [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`).

## Suggested execution order

- **Effort**: S = single turn, M = full session, L = multi-session
- **Value**: H = high user impact, M = moderate, L = polish / upkeep

### Features

| Item | Effort | Value |
|---|---|---|
| [Web app scaffold](#web-app-scaffold) | M | H |
| [Data layer MVP](#data-layer-mvp) | L | H |
| [Venue detail pages with Yelp enrichment](#venue-detail-pages-with-yelp-enrichment) | M | H |
| [Business claiming + GPS check-in](#business-claiming--gps-check-in) | M | H |
| [Business announcements](#business-announcements) | M | M |
| [Native apps (React Native)](#native-apps-react-native) | L | H |
| [Challenges + badges/points](#challenges--badgespoints) | M | M |
| [Monetization: credits & entitlements](#monetization-credits--entitlements) | L | M |
| [QR check-in + POI curation + leaderboards](#qr-check-in--poi-curation--leaderboards) | M | M |
| [Admin portal: neighborhood boundary drawing](#admin-portal-neighborhood-boundary-drawing) | M | M |
| [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem) | M | L |

### Improvements

No open improvement items.

### Known issues

No open known issues.

### Limitations

No open limitations.

---

## Open

### Web app scaffold
**Type:** feature
**Why** — Establishes the monorepo and API-first foundation everything else builds on; the web app is the fastest path to a working end-to-end slice, so it comes before any native work.
**Notes:** Next.js + TypeScript + Tailwind (`apps/web`), a backend service stub (`apps/api`), and a shared `packages/types` package per README §10.3. Turborepo or Nx for the monorepo. No auth, map, or real data yet — just the shell and a health-check round trip between web and api.

### Data layer MVP
**Type:** feature
**Why** — The data layer is the foundation everything else depends on (README §1); getting schema and licensing-safe ingestion right first avoids expensive retrofits later.
**Notes:** `Neighborhood` + `Venue` + `Category` schema on Postgres/PostGIS, Google Places Basic-field sync scoped to Phinneywood's boundary, dedup pass (name similarity + geo proximity), category normalization into the unified taxonomy. See README §1.3–§1.6 and §12.4.

### Venue detail pages with Yelp enrichment
**Type:** feature
**Why** — First user-facing payoff of the data layer; also the first place the Yelp 24-hour TTL rule has to be enforced in real code rather than by convention.
**Notes:** Web venue detail page reading from `Venue`, on-demand fetch into `VenueEnrichmentCache` with TTL enforcement per README §1.3–§1.4. Depends on [Data layer MVP](#data-layer-mvp).

### Business claiming + GPS check-in
**Type:** feature
**Why** — Unlocks the business portal and the first gamification primitive (check-ins); required before announcements, challenges, or monetization can exist.
**Notes:** Web business portal claiming flow (phone/email or domain verification, README §5) plus consumer-facing GPS geofence check-in (README §4 Phase 1) with cooldown logic to prevent streak gaming.

### Business announcements
**Type:** feature
**Why** — First monetizable content type and the reason business claiming exists; also the base that coupons (§13) later attach to.
**Notes:** Claimed-business authoring tool + follower feed, with a basic moderation queue per README §5. Depends on [Business claiming + GPS check-in](#business-claiming--gps-check-in).

### Native apps (React Native)
**Type:** feature
**Why** — Mobile is the primary long-term surface (free/unlimited Google Maps SDK, push notifications, in-person coupon redemption) but follows the web app so the API/data model is proven out first, per the user's direction to prioritize web for rapid dev.
**Notes:** `apps/mobile` in the same monorepo, consuming the same `packages/api-client` and `packages/types` as web (README §10.3). Target feature parity with the web consumer experience (map, check-ins, announcements, challenges) once those web milestones land — this is a parity build, not a redesign.

### Challenges + badges/points
**Type:** feature
**Why** — Core gamification loop that drives repeat engagement; template-driven so new challenges are a data change, not a code change.
**Notes:** Template-driven challenges (README §6), points/badges (README §7), neighborhood-scoped opt-in leaderboards. Reads off existing `Venue`/`Category`/check-in tables, no new core schema needed.

### Monetization: credits & entitlements
**Type:** feature
**Why** — Revenue model for the business side; deliberately built after business claiming is proven out, not before, per README §11.4.
**Notes:** `BusinessPlan`, `Entitlement`, `CreditBalance`, `CreditTransaction`, `CreditPack` schema (README §1.8, §11.3) plus Stripe billing integration for credit-pack purchases. Free-sample entitlement (1 POI, 1 Event, 1 Announcement) ships first; paid credits follow.

### QR check-in + POI curation + leaderboards
**Type:** feature
**Why** — Solves GPS accuracy issues for multi-POI venues (markets, food halls) and rounds out the check-in system started earlier.
**Notes:** QR code generation per Venue/POI linking to a signed check-in URL (README §4 Phase 2), POI curation tooling for admins/businesses (README §3), public leaderboards.

### Admin portal: neighborhood boundary drawing
**Type:** feature
**Why** — Makes onboarding a second neighborhood after Phinneywood a data workflow instead of a code change (README §12.3, §12.5).
**Notes:** Interactive polygon-drawing tool (Mapbox GL Draw or Google Maps Drawing Library) gated to internal staff, with a dry-run Places query preview before committing the boundary, per README §12.6.

### Business coupons + slide-to-redeem
**Type:** feature
**Why** — Extends announcements into a concrete redemption/revenue mechanic for businesses, using physical friction (not cryptography) to discourage reuse.
**Notes:** `Coupon` as an attachment to `Announcement`, `CouponRedemption` with server-authoritative timestamps and atomic check-and-increment against redemption caps, per README §13. Depends on [Business announcements](#business-announcements).
