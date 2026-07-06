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
| [Native apps (React Native)](#native-apps-react-native) | L | H |
| [Category mapping admin tool](#category-mapping-admin-tool) | S | M |
| [Favorite venues](#favorite-venues) | S | M |
| [Venue wishlist](#venue-wishlist) | S | M |
| [Coupon redemption also checks you in](#coupon-redemption-also-checks-you-in) | S | M |
| [Business announcements](#business-announcements) | M | M |
| [Challenges + badges/points](#challenges--badgespoints) | M | M |
| [QR check-in + POI curation + leaderboards](#qr-check-in--poi-curation--leaderboards) | M | M |
| [Admin portal: neighborhood boundary drawing](#admin-portal-neighborhood-boundary-drawing) | M | M |
| [Neighborhood admin invites](#neighborhood-admin-invites) | M | M |
| [Business omission & venue merging](#business-omission--venue-merging) | M | M |
| [Business QR-scan check-in & redemption](#business-qr-scan-check-in--redemption) | M | M |
| [Google and Apple social sign-in (OAuth)](#google-and-apple-social-sign-in-oauth) | M | M |
| [Monetization: credits & entitlements](#monetization-credits--entitlements) | L | M |
| [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem) | M | L |
| [Yelp Fusion enrichment (future)](#yelp-fusion-enrichment-future) | M | L |

### Improvements

| Item | Effort | Value |
|---|---|---|
| [Category browsing & filtering](#category-browsing--filtering) | S | M |
| [Slide-to-check-in](#slide-to-check-in) | S | M |
| [CI/CD pipeline](#cicd-pipeline) | L | M |
| [Attribution & compliance checklist](#attribution--compliance-checklist) | S | L |

### Known issues

No open known issues.

### Limitations

No open limitations.

---

## Open

### Native apps (React Native)
**Type:** feature
**Why** — Mobile is the primary long-term surface (free/unlimited Google Maps SDK, push notifications, in-person coupon redemption) but follows the web app so the API/data model is proven out first, per the user's direction to prioritize web for rapid dev.
**Notes:** `apps/mobile` in the same monorepo, consuming the same `packages/api-client` and `packages/types` as web (README §10.3). Target feature parity with the web consumer experience (map, check-ins, announcements, challenges) once those web milestones land — this is a parity build, not a redesign.

### Category mapping admin tool
**Type:** feature
**Why** — README §2 calls for "manual override capability in the admin tool for anything auto-mapped incorrectly," but the only admin surface that exists today is `/admin/claims` (v0.6.0) — there's no way to fix a venue the sync's category-normalization step mapped wrong without a direct DB edit.
**Notes:** Small admin page mirroring the existing `/admin/claims` pattern (same `ADMIN_API_TOKEN` gate) — search/filter venues, reassign `category_id`. Also a natural home for reviewing the sync pipeline's "unmapped Google type" flags (README §1.4 step 3) instead of them only showing up in logs.

### Favorite venues
**Type:** feature
**Why** — Personal "I like this place" bookmark, distinct from a notification subscription (`VenueSubscription`, covered under [Real user authentication](#real-user-authentication)) — a low-stakes action that doesn't need to reach the user later, so it doesn't need the same durable-identity requirement.
**Notes:** Device-scoped like check-ins (README §14.2) — attaches to the existing anonymous `app_user` row, converts for free on signup with no migration step. Separate from [Venue wishlist](#venue-wishlist) (already-like vs. want-to-visit are different intents).

### Venue wishlist
**Type:** feature
**Why** — "Want to visit" intent is distinct from "already like this place" (see [Favorite venues](#favorite-venues)) — useful for challenge/exploration framing later (e.g. surfacing wishlisted venues that also count toward an active challenge).
**Notes:** Same anonymous-first, device-scoped pattern as [Favorite venues](#favorite-venues) — likely shares a schema shape (e.g. one join table with a `list_type` of `favorite` | `wishlist`) and UI treatment, just a different label/intent per venue.

### Coupon redemption also checks you in
**Type:** feature
**Why** — Redeeming a coupon already proves the user is physically at the venue (README §13.3's whole rationale for the slide gesture is in-person, witnessed confirmation) — that's strictly stronger evidence of presence than a GPS geofence, so it should count as a check-in too rather than requiring a separate, redundant action from the user.
**Notes:** On `CouponRedemption` write, also write a `Checkin` row for that `venue_id`/`user_id` (server-side, same transaction) — subject to the existing cooldown logic so it doesn't create a duplicate/conflicting check-in if the user already checked in recently. Depends on [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem).

### Business announcements
**Type:** feature
**Why** — First monetizable content type and the reason business claiming exists; also the base that coupons (§13) later attach to.
**Notes:** Claimed-business authoring tool + follower feed, with a basic moderation queue per README §5. Business claiming + GPS check-in has shipped (v0.6.0), so this is now unblocked. Depends on [Real user authentication](#real-user-authentication) for the business-side login.

### Challenges + badges/points
**Type:** feature
**Why** — Core gamification loop that drives repeat engagement; template-driven so new challenges are a data change, not a code change.
**Notes:** Template-driven challenges (README §6), points/badges (README §7), neighborhood-scoped opt-in leaderboards. Reads off existing `Venue`/`Category`/check-in tables, no new core schema needed. Persistent-named leaderboard presence depends on [Real user authentication](#real-user-authentication) (README §14.3); anonymous check-ins can still count toward progress without it.

### QR check-in + POI curation + leaderboards
**Type:** feature
**Why** — Solves GPS accuracy issues for multi-POI venues (markets, food halls) and rounds out the check-in system started earlier.
**Notes:** QR code generation per Venue/POI linking to a signed check-in URL (README §4 Phase 2), POI curation tooling for admins/businesses (README §3), public leaderboards.

### Admin portal: neighborhood boundary drawing
**Type:** feature
**Why** — Makes onboarding a second neighborhood after Phinneywood a data workflow instead of a code change (README §12.3, §12.5).
**Notes:** Interactive polygon-drawing tool (Mapbox GL Draw or Google Maps Drawing Library) gated to internal staff, with a dry-run Places query preview before committing the boundary, per README §12.6. Also covers re-editing an existing neighborhood's boundary (not create-only), per the same section.

### Neighborhood admin invites
**Type:** feature
**Why** — Every admin action shipped so far (claims review, and the planned boundary-drawing and category tools) is gated by a single shared `ADMIN_API_TOKEN` secret (v0.6.0) rather than individual accounts — there's no way to add or remove one person's admin access without rotating the shared secret for everyone. This becomes a real gap once a second neighborhood (README §12.3) has its own local staff who shouldn't have blanket access to every neighborhood.
**Notes:** Likely needs [Real user authentication](#real-user-authentication) first (a per-person identity to attach a role to). Scope: a join table between `User` and `Neighborhood` carrying a role, plus an invite flow (email link) for internal staff — replaces or layers on top of the current shared-token gate.

### Business omission & venue merging
**Type:** feature
**Why** — The sync pipeline's dedup pass (README §1.4 step 2) only catches fuzzy name/geo matches automatically; it has no way to handle cases a human needs to judge — a venue that shouldn't be listed at all (e.g. closed, or a residential false-positive from Google), or multiple Google Places entries that are actually sub-units of one physical building (the market/food-hall multi-POI case §3 already anticipates for check-ins).
**Notes:** Two related capabilities: (a) an explicit hide/omit flag on `Venue` so admin curation can suppress a listing without deleting the row (preserves check-in/history integrity), and (b) an admin merge action that collapses duplicate `Venue` rows into one, reparenting their `POI`/`checkin`/enrichment-cache records — worth having before [QR check-in + POI curation + leaderboards](#qr-check-in--poi-curation--leaderboards) is exercised at scale on multi-POI venues.

### Business QR-scan check-in & redemption
**Type:** feature
**Why** — README §13.3 already floats "requiring the business to tap a confirm button on their own device... a true two-sided confirmation" for high-value coupons; scanning the user's QR code is a concrete version of that, and gives businesses a way to check a customer in or redeem a coupon on their behalf as an alternative to the user's own GPS check-in or slide gesture — useful when a user's phone/GPS is having trouble, or simply as a faster front-counter flow.
**Notes:** Business portal (§10.1) gets camera-based QR scanning (`getUserMedia`, same technique as the mobile QR check-in webcam approach in §10.2) reading a per-user, per-session QR code (analogous to the signed-URL scheme already planned for venue/POI QR check-in — README §4 Phase 2 — but keyed to the user instead of the venue). Additive to, not a replacement for, the user-initiated slide/GPS flows. Depends on [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem) for the redemption half; the check-in half can reuse existing check-in logic.

### Google and Apple social sign-in (OAuth)
**Type:** feature
**Why** — Follow-up to [Real user authentication](#real-user-authentication), which only wired up email/password. Social sign-in removes a signup step (no password to create/remember) at exactly the moments that flow is meant to make frictionless — redeeming a coupon, subscribing to a venue.
**Notes:** Google is the smaller half: enable the provider in the Supabase dashboard, add a "Sign in with Google" button calling `supabase.auth.signInWithOAuth`, and a redirect callback route that calls the existing `/auth/complete-signup`/`/auth/complete-login` with the resulting session token — same completion flow as email/password today, no API changes needed since `verifyToken.ts` already reads the provider generically off `app_metadata`. Apple is a bigger lift and should probably be scoped/estimated separately even though it's listed here alongside Google: it requires Apple Developer Program enrollment, a Services ID, and generating a rotating client-secret JWT.

### Monetization: credits & entitlements
**Type:** feature
**Why** — Revenue model for the business side; deliberately built after business claiming is proven out, not before, per README §11.4.
**Notes:** `BusinessPlan`, `Entitlement`, `CreditBalance`, `CreditTransaction`, `CreditPack` schema (README §1.8, §11.3) plus Stripe billing integration for credit-pack purchases. Free-sample entitlement (1 POI, 1 Event, 1 Announcement) ships first; paid credits follow.

### Business coupons + slide-to-redeem
**Type:** feature
**Why** — Extends announcements into a concrete redemption/revenue mechanic for businesses, using physical friction (not cryptography) to discourage reuse.
**Notes:** `Coupon` as an attachment to `Announcement`, `CouponRedemption` with server-authoritative timestamps and atomic check-and-increment against redemption caps, per README §13. Depends on [Business announcements](#business-announcements) and, for redemption itself, [Real user authentication](#real-user-authentication) (README §14.3).

### Yelp Fusion enrichment (future)
**Type:** feature
**Why** — Dropped from the initial plan (README §1.1) to avoid Yelp's stricter 24-hour content TTL and licensing overhead before the core Google-sourced data layer even ships. Revisit only if ratings/reviews/photos become a clear user ask that Google's own fields don't already cover.
**Notes:** Would add a `yelp_business_id` column to `Venue` and a `'yelp'` entry to `VenueEnrichmentCache.source` (README §1.3), fetched on-demand and never persisted past 24 hours per Yelp's ToS — including the Yelp attribution/compliance checklist items that were removed from README §1.6. Not currently planned; no other backlog item depends on it.

### Category browsing & filtering
**Type:** improvement
**Why** — The 39-category taxonomy (README §2, shipped v0.4.0) exists server-side, but the venue list only shows category as plain text next to the address — there's no way to filter or browse by category today.
**Notes:** Filter chips or a category picker on the venues list and map view (map view shipped v0.7.0, already color-codes markers by category group per README §1.7). Reuses the existing `Category`/`source_mapping_json` data, no new schema needed.

### Slide-to-check-in
**Type:** improvement
**Why** — Check-in today (v0.6.0, `CheckInButton.tsx`) is a plain tap button. Once [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem) ships its physical-friction slide gesture (README §13.2), reusing the same control for check-in gives one consistent "commit to this action" interaction across the app instead of two different patterns for conceptually similar moments.
**Notes:** Extract the slide gesture as a shared component used by both flows — whichever of check-in or coupons is built first should design it as reusable rather than coupon-specific. Check-in's version doesn't need the "server writes the authoritative timestamp, locked after use" redemption semantics from §13.2 — just the slide-to-confirm interaction itself.

### CI/CD pipeline
**Type:** improvement
**Why** — README §10.4 specifies a CI/CD pipeline (GitHub Actions, lint/typecheck/unit tests on every PR, Playwright E2E for web, Sentry error tracking, feature flags for gradual mobile rollout) as part of the build plan, but the only correctness gate that exists today is a manual `npm run build` (per CONTRIBUTING.md) — no `.github/workflows`, E2E tests, or error tracking exist yet.
**Notes:** Scope conservatively for current project size — GitHub Actions running lint/typecheck/unit tests plus Netlify preview deploys is the near-term win; Playwright E2E, Sentry, and feature flags can follow once there's more surface area (multiple developers, mobile app) to justify them. Detox/Maestro (mobile E2E) isn't relevant until [Native apps (React Native)](#native-apps-react-native) exists.

### Attribution & compliance checklist
**Type:** improvement
**Why** — README §1.6 lists two required attribution items ("Powered by Google" per Maps Platform terms, ODbL attribution if OpenStreetMap is used) as unchecked checkboxes — neither has shipped, and it's a licensing-compliance requirement rather than optional polish.
**Notes:** Google attribution needed wherever Places-sourced data or a Google map renders (map view, venue detail pages). OSM attribution only applies once/if the optional OSM backup source (README §1.2) is actually used — otherwise that half can be skipped.
