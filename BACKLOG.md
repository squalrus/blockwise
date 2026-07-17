# Backlog

Tracks future features, improvements, and known bugs. Items here are not committed work — they're candidates.

## Shipping a backlog item

1. Branch off `main` named for the target version (`vX.Y.Z`). Never commit directly to `main`.
2. Move the entry to CHANGELOG.md with a version block (date, classification, user-facing summary). Remove it from here.
3. Update docs where reality changed (docs/project-plan.md, CONTRIBUTING, etc.).
4. Pick the version by semver: feature → minor; bug / improvement / cleanup → patch; breaking → major.
5. Bump the version in whichever location CLAUDE.md documents (package.json, VERSION file, or CHANGELOG.md only).
6. Run the build as the correctness gate.
7. Commit and push the branch, then open a PR with `gh pr create`. Requires [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`).
8. If the shipped item was a `Depends` target for anything still open below, drop that reference (or replace it with a note that the prerequisite shipped) when you remove the entry.

## Suggested execution order

Items are grouped by primary domain — **Neighborhood** (admin/community-level), **Business & Venue** (claimed listings, venue data, monetization), **User** (profile, social, personal features), and **Infrastructure & Design** (platform, tooling, compliance, cross-cutting polish) — each with one table covering every item type, rather than separate tables per type.

- **Ref**: a permanent ID assigned in the order items were added. Never renumber existing items — new items get the next unused integer.
- **Type**: feature | improvement | known issue | limitation
- **Effort**: S = single turn, M = full session, L = multi-session
- **Value**: H = high user impact, M = moderate, L = polish / upkeep
- **Depends**: Ref(s) of other **open backlog** items that must ship first. Prerequisites that have already shipped are not listed here (see item body for that history).
- **Sort rule**: value (desc) → effort (asc, lower effort first) → dependency count (asc, dependency-free items first). Applied independently within each domain table. Re-sort a table whenever an item is added, removed, or its Depends list changes.

### Neighborhood

| Ref | Item | Type | Effort | Value | Depends |
|---|---|---|---|---|---|
| 39 | [Neighborhood marketplace/licensing model](#neighborhood-marketplacelicensing-model) | feature | L | H | — |
| 84 | [Premium neighborhood tier: events and custom challenges](#premium-neighborhood-tier-events-and-custom-challenges) | feature | L | H | — |
| 55 | [Bulk removals: check all / uncheck all toggle](#bulk-removals-check-all-uncheck-all-toggle) | improvement | S | M | — |
| 60 | [Neighborhood photo strip from venues/POIs](#neighborhood-photo-strip-from-venuespois) | feature | S | M | — |
| 79 | [Real interactive map on the Locations tab](#real-interactive-map-on-the-locations-tab) | feature | S | M | — |
| 80 | [Missing location suggestion UI](#missing-location-suggestion-ui) | feature | S | M | — |
| 76 | [Self-serve neighborhood-admin invite/remove UI](#self-serve-neighborhood-admin-inviteremove-ui) | feature | M | M | — |
| 9 | [Neighborhood notifications](#neighborhood-notifications) | feature | M | M | 5 |
| 77 | [Neighborhood-admin challenge authoring](#neighborhood-admin-challenge-authoring) | feature | L | M | — |
| 53 | [Venues tab: default to map view](#venues-tab-default-to-map-view) | improvement | S | L | — |
| 62 | ["New" badge for recently-launched neighborhoods](#new-badge-for-recently-launched-neighborhoods) | improvement | S | L | — |

### Business & Venue

| Ref | Item | Type | Effort | Value | Depends |
|---|---|---|---|---|---|
| 32 | [Business claim requires existing account](#business-claim-requires-existing-account) | improvement | S | H | — |
| 83 | [Venue coupons replace announcements](#venue-coupons-replace-announcements) | feature | L | H | — |
| 22 | [Category browsing & filtering](#category-browsing--filtering) | improvement | S | M | — |
| 3 | [Coupon redemption also checks you in](#coupon-redemption-also-checks-you-in) | feature | S | M | 20 |
| 5 | [Business announcements](#business-announcements) | feature | M | M | — |
| 7 | [QR check-in + POI curation + leaderboards](#qr-check-in--poi-curation--leaderboards) | feature | M | M | — |
| 18 | [Business-editable venue basic data](#business-editable-venue-basic-data) | feature | M | M | — |
| 38 | [Map on business page](#map-on-business-page) | feature | M | M | — |
| 12 | [Business QR-scan check-in & redemption](#business-qr-scan-check-in--redemption) | feature | M | M | 20 |
| 16 | [Business visitor history and in-person connect](#business-visitor-history-and-in-person-connect) | feature | M | M | — |
| 19 | [Monetization: credits & entitlements](#monetization-credits--entitlements) | feature | L | M | — |
| 21 | [Yelp Fusion enrichment (future)](#yelp-fusion-enrichment-future) | feature | M | L | — |
| 20 | [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem) | feature | M | L | 5 |

### User

| Ref | Item | Type | Effort | Value | Depends |
|---|---|---|---|---|---|
| 2 | [Venue wishlist](#venue-wishlist) | feature | S | M | — |
| 52 | [Turn off founder badge auto-award at v1.0.0](#turn-off-founder-badge-auto-award-at-v100) | improvement | S | M | — |
| 72 | [Additional low-complexity auth providers](#additional-low-complexity-auth-providers) | feature | S | M | — |
| 17 | [Apple social sign-in (Sign in with Apple)](#apple-social-sign-in-sign-in-with-apple) | feature | M | M | — |
| 15 | [Activity feed of recent check-ins](#activity-feed-of-recent-check-ins) | feature | M | M | — |
| 43 | [Leaderboard aggregation performance](#leaderboard-aggregation-performance) | improvement | S | L | — |

### Infrastructure & Design

| Ref | Item | Type | Effort | Value | Depends |
|---|---|---|---|---|---|
| 1 | [Native apps (React Native)](#native-apps-react-native) | feature | L | H | — |
| 25 | [CI/CD pipeline](#cicd-pipeline) | improvement | L | M | — |
| 85 | [Super admin interface for app-level badges, challenges, and config](#super-admin-interface-for-app-level-badges-challenges-and-config) | feature | L | M | — |

### Marketing

No open feature items.

### Known issues

| Ref | Item | Type | Effort | Value | Depends |
|---|---|---|---|---|---|
| 82 | [Email/password login fails after email confirmation](#emailpassword-login-fails-after-email-confirmation) | known issue | S | H | — |

### Limitations

No open limitations.

---

## Open

### Neighborhood

#### Neighborhood marketplace/licensing model

**Ref:** 39
**Type:** feature
**Depends:** —
**Why** — Today Blockwise is free to set up a neighborhood. Supporting an upfront licensing fee (or tiered options for larger neighborhoods, more venues, higher API quotas per project plan §1.5) makes it viable to cover infrastructure/support costs as the platform scales. Limiting boundary syncs to every 24 hours is the primary cost control.
**Notes:** Add a `neighborhood.tier` column (free|starter|pro, or similar) and corresponding quota limits (e.g., free = 100 venues, starter = 1000, pro = 10k). Rate-limit boundary re-syncs and Google Places queries per tier. Integrate Stripe for tier upgrades. Open question: launch with free-only, or start with tiers from day one?

#### Premium neighborhood tier: events and custom challenges

**Ref:** 84
**Type:** feature
**Depends:** —
**Why** — Creating a neighborhood should stay free, but interactive features — events, custom challenge authoring, and other more involved functionality — should require a small per-neighborhood paid upgrade, giving the platform a lightweight monetization path on the neighborhood side (distinct from the business/venue side's coupon/credits monetization) without paywalling a neighborhood's basic existence.
**Notes:** Overlaps with [Neighborhood marketplace/licensing model](#neighborhood-marketplacelicensing-model) (Ref 39), which already proposes a `neighborhood.tier` column with quota-based limits — this ask is feature-gating (specific functionality locked/unlocked) rather than quota-tiering (more of the same thing, faster), so the same `neighborhood.tier` field could likely drive both, or this becomes the concrete feature-flag half of Ref 39's broader tiering plan. Needs entitlement checks in front of: the Events tab/iCal import (already shipped free as of v0.51.0 — gating this retroactively means either grandfathering existing neighborhoods' access or communicating a feature change) and [Neighborhood-admin challenge authoring](#neighborhood-admin-challenge-authoring) (Ref 77, not yet built — could ship already gated from day one, avoiding the grandfathering problem entirely). Needs Stripe integration for the upgrade purchase itself. Open question: the exact feature list behind the paywall beyond events/challenges ("other more interactive features" per the request) needs to be nailed down before scoping.

#### Neighborhood photo strip from venues/POIs

**Ref:** 60
**Type:** feature
**Depends:** —
**Why** — Neighborhood pages are otherwise all text/map, no imagery — a photo strip or mosaic pulled from the neighborhood's own venues/POIs would give it visual life for free, since it's sourced from data already fetched and cached rather than a new content type someone has to author.
**Notes:** Query a handful of venues (and POIs — both now get enrichment as of v0.38.0) in the neighborhood with a non-empty cached photo list, and render them via the existing `GET /locations/:id/photo?index=` proxy pattern (no new Places API calls — reuses `venue_enrichment_cache` rows already populated by detail-page views). The expanded field mask (multi-photo mapping) shipped in v0.32.1, so more venues now have a cached photo, and more photos per venue, than before. Open question: curation order (top-rated vs. most recent vs. simple "first N active with a cached photo") — start with the simplest option and revisit if it looks thin.

#### Neighborhood notifications

**Ref:** 9
**Type:** feature
**Depends:** [5](#business-announcements)
**Why** — Business announcements are per-venue and reach only that business's followers; there's no way for neighborhood-level staff (neighborhood admin roles shipped v0.12.0) to broadcast something to everyone in a neighborhood at once (e.g. an event, a service outage, a safety notice).
**Notes:** Likely a `NeighborhoodNotification` (or reuse `Announcement` with a nullable `venue_id` for neighborhood-wide scope) authored via an admin tool gated the same way as other admin surfaces (`requireAdmin`, v0.12.0); delivery channel (push vs. in-app feed) probably follows whatever [Business announcements](#business-announcements) settles on.

#### Bulk removals: check all / uncheck all toggle

**Ref:** 55
**Type:** improvement
**Depends:** —
**Why** — The Locations review wizard's Removals step (shipped v0.29.0) surfaces every active venue/POI that falls outside a redrawn boundary as a checklist for admin approval. For neighborhoods with many removals, manually checking/unchecking each one is tedious — a "Select all / Clear all" button pair would speed up the workflow when an admin wants to approve or skip the entire removal batch.
**Notes:** Add a button pair at the top of the removals list (or inline with the count summary) that toggles all checkboxes in that step. Already using `approvedRemovals` state (`Set<string>` of removal keys) in `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/review/page.tsx`, so the UI change is just two buttons + a `setApprovedRemovals` call to either copy the full removal list or clear it. No API/schema changes.

#### Venues tab: default to map view

**Ref:** 53
**Type:** improvement
**Depends:** —
**Why** — The neighborhood page's subnav split (shipped v0.24.1) carried the Venues tab's List/Map toggle over as-is, defaulting to List; the original subnav proposal floated Map as a more natural "what's near me" default, but that part didn't ship with the split.
**Notes:** `VenuesView.tsx` already has the List/Map toggle (shipped v0.7.0/v0.23.0); just flip its initial `useState` to `"map"`. Small, self-contained — no schema or API changes.

#### "New" badge for recently-launched neighborhoods

**Ref:** 62
**Type:** improvement
**Depends:** —
**Why** — The Spored Mockups design (Screen 5: All Neighborhoods) shows a low-traction neighborhood with a muted "🌱 New" pill in place of Join/Joined, and the card at reduced opacity — a visual cue that a neighborhood is newly launched and still building momentum. Skipped when the All Neighborhoods browse list was rebuilt (v0.35.0, search box + business/member counts) because there's no "new" concept in the data model today.
**Notes:** `neighborhood.created_at` isn't currently exposed via `NeighborhoodRecord`/`NeighborhoodSummary` (`apps/api/src/neighborhoods/repository.ts`, `packages/types/src/index.ts`) — open question: define "new" by age (e.g. created within the last N days) or by low traction (member_count/business_count below some floor, both already returned by `GET /neighborhoods` as of v0.35.0)? Age needs a new exposed field; a traction floor needs none. Once decided, the pill/opacity treatment is a small addition to `NeighborhoodCard` in `apps/web/src/app/neighborhoods/NeighborhoodsSection.tsx`.

#### Self-serve neighborhood-admin invite/remove UI

**Ref:** 76
**Type:** feature
**Depends:** —
**Why** — Granting neighborhood-admin access today is a one-off CLI script (`apps/api/src/scripts/grantNeighborhoodAdmin.ts`) run against the `neighborhood_admin` table (`user_id`, `neighborhood_id`, no role column) — there is no self-serve way for an existing admin to bring on a co-admin. Split out of the neighborhood-admin sidebar redesign (v0.44.1), whose imported mockup showed an "Admins" card on the Overview tab (invite by email with a role picker, active/invited list, remove action) that was deliberately left out since it needs real backend, not just restyling.
**Notes:** `neighborhood_admin` has no pending/invited state today, only accepted rows — needs either an invite-token/email flow (requires email delivery infra, and handling an invitee with no account yet) or a simpler invite-by-existing-username flow (no email infra, but the invitee must already have signed up) — open question which to build first. Also needs a `GET .../neighborhoods/:id/admins` list endpoint and a remove endpoint (`DELETE .../neighborhoods/:id/admins/:userId`), both `neighborhoodAdminGate`-scoped like the rest of `/neighborhood-admin/*`. No role column exists on `neighborhood_admin` — the mockup's Owner/Admin role picker would need one added, or could be dropped in favor of a flat "admin" concept matching what actually exists.

#### Neighborhood-admin challenge authoring

**Ref:** 77
**Type:** feature
**Depends:** —
**Why** — Challenges today are template-driven and read-only from the admin's perspective (`GET /neighborhoods/:slug/challenges` is the only challenge route; badge rule engine shipped v0.40.0) — there is no admin CRUD or "launch a challenge" concept at all. Split out of the neighborhood-admin sidebar redesign (v0.44.1), whose imported mockup showed a full Challenges tab (a live challenge card with joined/completed/check-ins-driven stats and pause/edit actions, ready-to-launch template cards with an eligible-venue count and a Launch button, and a "Build your own" custom challenge creator) that was left out entirely since it's materially new schema and API, not a restyle.
**Notes:** Likely needs a `neighborhood_challenge` instance table distinct from whatever backs the existing badge-rule-engine templates — an admin "launching" a template creates a live, trackable instance (joined/completed/check-ins-driven counts, pause state) rather than just referencing the static template. The "Build your own" flow (pick category, set a target count, name the badge) implies the badge rule engine needs to accept admin-authored rules, not just seeded ones. Largest of the redesign's deferred pieces — worth its own scoping pass before starting (template launch vs. build-your-own could ship as two separate cuts).

#### Real interactive map on the Locations tab

**Ref:** 79
**Type:** feature
**Depends:** —
**Why** — The Locations tab (`apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/page.tsx`) is list-only today. Split out of the neighborhood-admin sidebar redesign (v0.44.1), whose imported mockup showed a split list+map layout (color-coded markers per category, click-to-select syncing between list row and marker, a category legend) that was deliberately left out of the visual-only redesign pending a real map integration decision.
**Notes:** No schema/API changes needed — `LocationListItem` already carries `lat`/`lng` for every row. Most likely adapts `BoundaryMap.tsx`'s existing Google Maps setup (already a dependency for the Boundary tab) for marker display instead of polygon editing, rather than introducing a second mapping library. Marker color should reuse the same category-group color mapping the redesigned list rows already use (`GROUP_COLORS` in `locations/page.tsx`).

#### Missing location suggestion UI

**Ref:** 80
**Type:** feature
**Depends:** —
**Why** — Users checking in via /checkin may spot a nearby venue the app doesn't yet have in the neighborhood's database, with no way to report it except leaving the app. A suggestion form at the bottom of the check-in page captures venue name/category/address and sends it to neighborhood admins, turning a friction point into a database contribution and improving discovery for future users without requiring the user to file a GitHub issue or email support.
**Notes:** Add a "Missing a venue?" section at the bottom of NearestVenues with a compact form collecting venue name (required) and optional category/address/notes fields. POST to a new `/me/venue-suggestions` endpoint (or `/neighborhoods/:id/venue-suggestions`) writing to a new `venue_suggestion` table (`user_id`, `neighborhood_id`, `name`, `category`, `address`, `notes`, `created_at`, `status`). Neighborhood admins see incoming suggestions in an admin surface (separate backlog item covering the review/action UI and triage workflow); initial spec can be "email admins on new suggestion" or a simple unreviewed list. Open questions: should photos be attachable? Should this live on other pages (just /checkin, or also /neighborhoods/:slug/venues)? Should the form geo-locate and prepopulate address? Should users get notified if their suggestion becomes a real venue?

### Business & Venue

#### Business claim requires existing account

**Ref:** 32
**Type:** improvement
**Depends:** —
**Why** — Currently, any visitor can submit a venue claim without being signed in (`business_claim.user_id` is nullable). This creates friction for businesses (a claim submitted anonymously is never tied to a specific account for follow-up) and allows spam/false claims. Requiring sign-up before claiming also gates the flow behind account verification.
**Notes:** Make `POST /venues/:id/claims` require `requireAuthUser` instead of allowing optional auth. Set `business_claim.user_id` to NOT NULL and backfill existing rows with a special "orphaned" user ID or delete them. Update the claiming form to redirect to sign-up if signed out.

#### Venue coupons replace announcements

**Ref:** 83
**Type:** feature
**Depends:** —
**Why** — A dedicated "coupon" concept is likely sufficient in place of generic venue announcements: limited quantity, a date range (including a future start date for coupons not yet live), unlocked only by checking in at the venue, then redeemed in front of the business with a slide-to-redeem gesture — and if reopened after redemption, it clearly shows it's already been redeemed along with the date/time. Neighborhoods keep the general "announcements" concept; venues get coupons instead.
**Notes:** Effectively replaces/refines the venue-facing half of [Business announcements](#business-announcements) (Ref 5 — already partially implemented per `apps/web/src/app/location/[id]/page.tsx`'s Announcements section) and supersedes the "attach coupon to Announcement" shape proposed in [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem) (Ref 20) — coupons become a first-class venue content type, decoupled from announcements. [Coupon redemption also checks you in](#coupon-redemption-also-checks-you-in) (Ref 3) stays compatible/relevant. Needs a `Coupon` table (`venue_id`, `quantity`/`quantity_remaining`, `start_date`, `end_date`, description, terms) and a way to track per-user unlock eligibility (a check-in at this venue, likely scoped to the coupon's active window), plus `CouponRedemption` (`user_id`, `coupon_id`, `redeemed_at`) with atomic check-and-increment against `quantity_remaining` and a server-authoritative timestamp. Redemption UI reuses the existing slide-gesture pattern (see `SlideToCheckIn` in `apps/web/src/app/dev/components`) as slide-to-redeem; reopening an already-redeemed coupon shows the stored `redeemed_at` instead of the slide control. Neighborhoods' own Announcements (the [Neighborhood notifications](#neighborhood-notifications) side, Ref 9) are unaffected. **Open question (from the report):** how does a coupon interact with a user already checked in at the venue before the coupon existed/started — does a check-in need to happen after the coupon's `start_date` to count as an unlock, or does any check-in within the coupon's active window count retroactively?

#### Category browsing & filtering

**Ref:** 22
**Type:** improvement
**Depends:** —
**Why** — The 39-category taxonomy (project plan §2, shipped v0.4.0) exists server-side, but the venue list only shows category as plain text next to the address — there's no way to filter or browse by category today.
**Notes:** Filter chips or a category picker on the venues list and map view (map view shipped v0.7.0, already color-codes markers by category group per project plan §1.7). Reuses the existing `Category`/`source_mapping_json` data, no new schema needed.

#### Coupon redemption also checks you in

**Ref:** 3
**Type:** feature
**Depends:** [20](#business-coupons--slide-to-redeem)
**Why** — Redeeming a coupon already proves the user is physically at the venue (project plan §13.3's whole rationale for the slide gesture is in-person, witnessed confirmation) — that's strictly stronger evidence of presence than a GPS geofence, so it should count as a check-in too rather than requiring a separate, redundant action from the user.
**Notes:** On `CouponRedemption` write, also write a `Checkin` row for that `venue_id`/`user_id` (server-side, same transaction) — subject to the existing cooldown logic so it doesn't create a duplicate/conflicting check-in if the user already checked in recently.

#### Business announcements

**Ref:** 5
**Type:** feature
**Depends:** —
**Why** — First monetizable content type and the reason business claiming exists; also the base that coupons (§13) later attach to.
**Notes:** Claimed-business authoring tool + follower feed, with a basic moderation queue per project plan §5. Both prerequisites have now shipped — business claiming + GPS check-in (v0.6.0) and real user authentication (v0.8.0) — so this item is fully unblocked.

#### QR check-in + POI curation + leaderboards

**Ref:** 7
**Type:** feature
**Depends:** —
**Why** — Solves GPS accuracy issues for multi-POI venues (markets, food halls) and rounds out the check-in system started earlier.
**Notes:** QR code generation per Venue/POI linking to a signed check-in URL (project plan §4 Phase 2), POI curation tooling for admins/businesses (project plan §3), public leaderboards.

#### Business-editable venue basic data

**Ref:** 18
**Type:** feature
**Depends:** —
**Why** — Google-sourced venue data (name, description, hours, photos) is only as current as the last sync pipeline run — a claimed business owner has no way to correct or supplement it themselves (e.g. updated hours, a better description, their own photos) between syncs.
**Notes:** Builds on the business owner venue dashboard (shipped v0.14.0), which is the surface this editing UI would live in. Needs a way to distinguish owner-edited fields from sync-pipeline-written ones so a future sync run doesn't silently overwrite an owner's edits (e.g. an `overridden_by_owner` flag per field, or a separate `VenueOverride` table the read path merges on top of the synced `Venue` row).

#### Map on business page

**Ref:** 38
**Type:** feature
**Depends:** —
**Why** — Business pages show the address as text, but a map view of the location and nearby venues (category-filtered) would give customers a visual orientation — especially useful on mobile for navigation.
**Notes:** Embed a Mapbox GL JS or Google Maps JavaScript API map on `/business/:venueId` or `/venues/:id` showing the venue's location. Optional: show nearby venues of the same category, or the venue's POIs (project plan §3) as markers if the business has defined them.

#### Business QR-scan check-in & redemption

**Ref:** 12
**Type:** feature
**Depends:** [20](#business-coupons--slide-to-redeem)
**Why** — project plan §13.3 already floats "requiring the business to tap a confirm button on their own device... a true two-sided confirmation" for high-value coupons; scanning the user's QR code is a concrete version of that, and gives businesses a way to check a customer in or redeem a coupon on their behalf as an alternative to the user's own GPS check-in or slide gesture — useful when a user's phone/GPS is having trouble, or simply as a faster front-counter flow.
**Notes:** Business portal (§10.1) gets camera-based QR scanning (`getUserMedia`, same technique as the mobile QR check-in webcam approach in §10.2) reading a per-user, per-session QR code (analogous to the signed-URL scheme already planned for venue/POI QR check-in — project plan §4 Phase 2 — but keyed to the user instead of the venue). Additive to, not a replacement for, the user-initiated slide/GPS flows. The check-in half can reuse existing check-in logic without waiting on the redemption dependency.

#### Business visitor history and in-person connect

**Ref:** 16
**Type:** feature
**Depends:** —
**Why** — Two related asks: showing who is/was recently at a business (social proof, "who's here right now"), and letting users connect with each other while physically co-located at a venue — turns a shared check-in into a natural, low-friction moment to start a connection.
**Notes:** Only public/opted-in check-ins (the profile visibility flag, shipped v0.20.0) should be visible to other visitors. Neighbor connections (the actual connect action, formerly Ref 14) shipped in v0.42.0 — this item is now the "people here now" list on the venue detail page (recent `checkin` rows within a short window) with a connect button per person, reusing that mechanism. Consider whether this needs a tighter privacy control than the general activity feed, since "currently at this specific location" is more sensitive than general recent activity.

#### Monetization: credits & entitlements

**Ref:** 19
**Type:** feature
**Depends:** —
**Why** — Revenue model for the business side; deliberately built after business claiming is proven out, not before, per project plan §11.4.
**Notes:** `BusinessPlan`, `Entitlement`, `CreditBalance`, `CreditTransaction`, `CreditPack` schema (project plan §1.8, §11.3) plus Stripe billing integration for credit-pack purchases. Free-sample entitlement (1 POI, 1 Event, 1 Announcement) ships first; paid credits follow.

#### Yelp Fusion enrichment (future)

**Ref:** 21
**Type:** feature
**Depends:** —
**Why** — Dropped from the initial plan (project plan §1.1) to avoid Yelp's stricter 24-hour content TTL and licensing overhead before the core Google-sourced data layer even ships. Revisit only if ratings/reviews/photos become a clear user ask that Google's own fields don't already cover.
**Notes:** Would add a `yelp_business_id` column to `Venue` and a `'yelp'` entry to `VenueEnrichmentCache.source` (project plan §1.3), fetched on-demand and never persisted past 24 hours per Yelp's ToS — including the Yelp attribution/compliance checklist items that were removed from project plan §1.6. Not currently planned; no other backlog item depends on it.

#### Business coupons + slide-to-redeem

**Ref:** 20
**Type:** feature
**Depends:** [5](#business-announcements)
**Why** — Extends announcements into a concrete redemption/revenue mechanic for businesses, using physical friction (not cryptography) to discourage reuse.
**Notes:** `Coupon` as an attachment to `Announcement`, `CouponRedemption` with server-authoritative timestamps and atomic check-and-increment against redemption caps, per project plan §13. Real user authentication (project plan §14.3), needed for redemption itself, has already shipped (v0.8.0); the remaining blocker is Business announcements.

### User

#### Venue wishlist

**Ref:** 2
**Type:** feature
**Depends:** —
**Why** — "Want to visit" intent is distinct from "already like this place" (shipped as Favorite venues in v0.9.0) — useful for challenge/exploration framing later (e.g. surfacing wishlisted venues that also count toward an active challenge).
**Notes:** Same anonymous-first, device-scoped pattern as the shipped `favorite` table (`supabase/migrations/20260706060000_favorite_venues.sql`) — likely shares a schema shape (e.g. a `list_type` of `favorite` | `wishlist` on the same table) and UI treatment, just a different label/intent per venue.

#### Turn off founder badge auto-award at v1.0.0

**Ref:** 52
**Type:** improvement
**Depends:** —
**Why** — Every account currently auto-awards a "founder" badge at signup (shipped v0.24.0), which is correct while the app is pre-launch but wrong forever — once v1.0.0 actually ships, a signup after that point isn't a founder and shouldn't get the badge.
**Notes:** Remove (or gate behind a cutoff date check against `created_at`/`now()`) the `awardFounderBadge` call in the `/auth/complete-signup` handler (`apps/api/src/app.ts`). Simplest version is deleting the call entirely once v1.0.0 ships, since by then every pre-launch account already holds the badge via the v0.24.0 migration backfill and auto-award.

#### Additional low-complexity auth providers

**Ref:** 72
**Type:** feature
**Depends:** —
**Why** — Beyond Google (shipped v0.10.0) and Apple ([Apple social sign-in](#apple-social-sign-in-sign-in-with-apple), Ref 17, deliberately scoped separately for its heavier Apple Developer Program/rotating-secret overhead), other OAuth providers Supabase supports out of the box (e.g. Microsoft, GitHub, Facebook, Discord) would add sign-in options with setup comparable to Google's — no rotating secrets or paid developer program required — before taking on Apple's bigger lift.
**Notes:** `verifyToken.ts` already reads the provider generically off `app_metadata` (per Ref 17's notes), so the server-side path likely needs no changes — this is mostly `supabase.auth.signInWithOAuth` provider registration plus a button on the sign-in page. Open question: which provider(s) actually match Blockwise's user base — worth picking one (e.g. Microsoft, given broad consumer email adoption) rather than adding all of them speculatively.

#### Apple social sign-in (Sign in with Apple)

**Ref:** 17
**Type:** feature
**Depends:** —
**Why** — Same rationale as Google social sign-in (shipped v0.10.0) — removes a signup step at the moments that flow is meant to make frictionless — but scoped separately since it's a materially bigger lift with its own setup dependencies and timeline.
**Notes:** Requires Apple Developer Program enrollment, creating a Services ID, and generating a rotating client-secret JWT (Apple secrets expire and must be regenerated, unlike Google's). Same completion flow on the app side as Google once configured — `supabase.auth.signInWithOAuth`, a redirect callback route, then the existing `/auth/complete-signup`/`/auth/complete-login`, since `verifyToken.ts` already reads the provider generically off `app_metadata`.

#### Activity feed of recent check-ins

**Ref:** 15
**Type:** feature
**Depends:** —
**Why** — Lets a user see what people they're connected to (or public profiles) have been checking into recently — the social payoff for connecting at all, and a natural discovery surface ("what's popular right now among people I know").
**Notes:** Respect the profile visibility flag (shipped v0.20.0). Prerequisite (neighbor connections) shipped in v0.42.0 — open question: is the feed public-profiles-only, connections-only, or both (with connections seeing more)? Resolve before scoping. Reads off the existing `checkin` table (project plan §4/§14.2) — no new check-in schema needed, just a query surface and visibility filtering.

#### Leaderboard aggregation performance

**Ref:** 43
**Type:** improvement
**Depends:** —
**Why** — `GET /neighborhoods/:slug/leaderboard` (`apps/api/src/gamification/supabaseRepository.ts`) computes each user's total by fetching every `point_event` row for the neighborhood and summing in JS, rather than a DB-side aggregation. Fine at pilot scale (one small neighborhood), but this will slow down and burn memory as a neighborhood's check-in/favorite history grows.
**Notes:** Replace the client-side sum with a DB-side `GROUP BY`/`SUM` (a Postgres view, materialized view, or RPC function) so aggregation scales with the database rather than with rows pulled over the wire. Revisit once a neighborhood's `point_event` row count becomes large enough to notice — not urgent today.

### Infrastructure & Design

#### Native apps (React Native)

**Ref:** 1
**Type:** feature
**Depends:** —
**Why** — Mobile is the primary long-term surface (free/unlimited Google Maps SDK, push notifications, in-person coupon redemption) but follows the web app so the API/data model is proven out first, per the user's direction to prioritize web for rapid dev.
**Notes:** `apps/mobile` in the same monorepo, consuming the same `packages/api-client` and `packages/types` as web (project plan §10.3). Target feature parity with the web consumer experience (map, check-ins, announcements, challenges) once those web milestones land — this is a parity build, not a redesign.

#### CI/CD pipeline

**Ref:** 25
**Type:** improvement
**Depends:** —
**Why** — project plan §10.4 specifies a CI/CD pipeline (GitHub Actions, lint/typecheck/unit tests on every PR, Playwright E2E for web, Sentry error tracking, feature flags for gradual mobile rollout) as part of the build plan, but the only correctness gate that exists today is a manual `npm run build` (per CONTRIBUTING.md) — no `.github/workflows`, E2E tests, or error tracking exist yet.
**Notes:** Scope conservatively for current project size — GitHub Actions running lint/typecheck/unit tests plus Netlify preview deploys is the near-term win; Playwright E2E, Sentry, and feature flags can follow once there's more surface area (multiple developers, mobile app) to justify them. Detox/Maestro (mobile E2E) isn't relevant until [Native apps (React Native)](#native-apps-react-native) (Ref 1) exists.

#### Super admin interface for app-level badges, challenges, and config

**Ref:** 85
**Type:** feature
**Depends:** —
**Why** — Neighborhood-admin and business-admin surfaces manage neighborhood/venue-scoped resources, but there's no dashboard for app-level (global) configuration — badge definitions, challenge templates, and other platform-wide settings that exist independent of any single neighborhood. The super admin role (shipped v0.48.0) currently only gates neighborhood creation (`superAdminGate` on `POST /admin/neighborhoods`) — it has no actual interface of its own yet.
**Notes:** Likely a new `/admin/super` (or similar) route, gated by the existing `superAdminGate`. Scope: read/manage the global badge rule engine definitions (shipped v0.40.0) and challenge templates (referenced by [Neighborhood-admin challenge authoring](#neighborhood-admin-challenge-authoring) Ref 77's "launch a template" flow) that today only exist as seeded/backend data with no UI. A natural precursor to Ref 77, which needs admin-authored templates to exist somewhere before a neighborhood admin can "launch" one.

### Marketing

No open feature items.

### Known issues

#### Email/password login fails after email confirmation

**Ref:** 82
**Type:** known issue
**Depends:** —
**Why** — A user reported signing up with email/password, confirming via the confirmation email, and then getting "No account found for this login -- complete signup first" when trying to log in (screenshot on file) — a hard block on the core email/password auth path for at least this account, not just an edge case.
**Notes:** Reproduce end-to-end: signup with email/password → Supabase sends confirmation email → click confirm link → attempt log in with the same credentials. The error text ("No account found for this login -- complete signup first") comes from the app-side check for an existing account row, which suggests either `/auth/complete-signup` isn't creating that row before/around the confirmation redirect, or `/auth/complete-login` is checking for it before Supabase's own email-confirmation state has propagated. Check the confirmation callback handling in `apps/web/src/app/auth/callback/page.tsx` and the `apps/api` `/auth/complete-signup`/`/auth/complete-login` handlers for a timing/ordering gap. Worth confirming with the reporting user whether this is reproducible on a fresh signup or specific to their account's history (e.g. a retried signup, an expired confirmation link).
