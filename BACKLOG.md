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
| --- | --- | --- | --- | --- | --- |
| 112 | [Neighborhood onboarding checklist](#neighborhood-onboarding-checklist) | feature | M | H | — |
| 39 | [Neighborhood marketplace/licensing model](#neighborhood-marketplacelicensing-model) | feature | L | H | — |
| 84 | [Premium neighborhood tier: events and custom challenges](#premium-neighborhood-tier-events-and-custom-challenges) | feature | L | H | — |
| 55 | [Bulk removals: check all / uncheck all toggle](#bulk-removals-check-all-uncheck-all-toggle) | improvement | S | M | — |
| 60 | [Neighborhood photo strip from venues/POIs](#neighborhood-photo-strip-from-venuespois) | feature | S | M | — |
| 79 | [Real interactive map on the Locations tab](#real-interactive-map-on-the-locations-tab) | feature | S | M | — |
| 76 | [Self-serve neighborhood-admin invite/remove UI](#self-serve-neighborhood-admin-inviteremove-ui) | feature | M | M | — |
| 9 | [Neighborhood notifications](#neighborhood-notifications) | feature | M | M | 5 |
| 110 | [Two-step neighborhood creation: fields first, boundary required after](#two-step-neighborhood-creation-fields-first-boundary-required-after) | improvement | M | M | — |
| 111 | [Improve boundary polygon drawing UX](#improve-boundary-polygon-drawing-ux) | improvement | M | M | — |
| 77 | [Neighborhood-admin challenge authoring](#neighborhood-admin-challenge-authoring) | feature | L | M | — |
| 53 | [Venues tab: default to map view](#venues-tab-default-to-map-view) | improvement | S | L | — |
| 62 | ["New" badge for recently-launched neighborhoods](#new-badge-for-recently-launched-neighborhoods) | improvement | S | L | — |

### Business & Venue

| Ref | Item | Type | Effort | Value | Depends |
| --- | --- | --- | --- | --- | --- |
| 22 | [Category browsing & filtering](#category-browsing--filtering) | improvement | S | M | — |
| 7 | [QR check-in + POI curation + leaderboards](#qr-check-in--poi-curation--leaderboards) | feature | M | M | — |
| 18 | [Business-editable venue basic data](#business-editable-venue-basic-data) | feature | M | M | — |
| 38 | [Map on business page](#map-on-business-page) | feature | M | M | — |
| 12 | [Business QR-scan check-in & redemption](#business-qr-scan-check-in--redemption) | feature | M | M | — |
| 16 | [Business visitor history and in-person connect](#business-visitor-history-and-in-person-connect) | feature | M | M | — |
| 19 | [Monetization: credits & entitlements](#monetization-credits--entitlements) | feature | L | M | — |

### User

| Ref | Item | Type | Effort | Value | Depends |
| --- | --- | --- | --- | --- | --- |
| 2 | [Venue wishlist](#venue-wishlist) | feature | S | M | — |
| 52 | [Turn off founder badge auto-award at v1.0.0](#turn-off-founder-badge-auto-award-at-v100) | improvement | S | M | — |
| 17 | [Apple social sign-in (Sign in with Apple)](#apple-social-sign-in-sign-in-with-apple) | feature | M | M | — |
| 100 | [Event detail pages with check-in](#event-detail-pages-with-check-in) | feature | M | M | — |
| 101 | [Shareable badges with OG image previews](#shareable-badges-with-og-image-previews) | feature | M | M | — |
| 43 | [Leaderboard aggregation performance](#leaderboard-aggregation-performance) | improvement | S | L | — |

### Infrastructure & Design

| Ref | Item | Type | Effort | Value | Depends |
| --- | --- | --- | --- | --- | --- |
| 1 | [Native apps (React Native)](#native-apps-react-native) | feature | L | H | — |
| 95 | [Dev instance of the app (Netlify and Supabase)](#dev-instance-of-the-app-netlify-and-supabase) | improvement | L | H | — |
| 113 | [Trim Place Details field mask to a cheaper SKU tier](#trim-place-details-field-mask-to-a-cheaper-sku-tier) | improvement | S | M | — |
| 114 | [Migrate from Google Places API to Geoapify](#migrate-from-google-places-api-to-geoapify) | improvement | L | M | — |
| 105 | [Additional app themes within brand guidelines](#additional-app-themes-within-brand-guidelines) | feature | M | L | — |

### Marketing

No open feature items.

### Known issues

No open known issues.

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
**Depends:** —
**Why** — Venue-level content (business events, coupons) reaches only that business's own followers; there's no way for neighborhood-level staff (neighborhood admin roles shipped v0.12.0) to broadcast something to everyone in a neighborhood at once (e.g. an event, a service outage, a safety notice).
**Notes:** Business announcements (the venue-scoped precedent this item's original design leaned on for a reusable shape) were replaced by venue coupons (shipped v0.54.0, see CHANGELOG.md) and no longer exist as a table, so this needs a fresh `NeighborhoodNotification` table (`neighborhood_id`, message, timestamps) rather than reusing anything — authored via an admin tool gated the same way as other admin surfaces (`requireAdmin`, v0.12.0). Delivery channel (push vs. in-app feed) still open.

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

#### Neighborhood onboarding checklist

**Ref:** 112
**Type:** feature
**Depends:** —
**Why** — The neighborhood admin workflow is currently implicit — docs/project-plan.md §12.3 describes a sequence (draw boundary, sync venues, curate business claims, optionally add events/challenges, then flip to live), but there's no in-app checklist showing which steps are required vs. optional, which are done, or which are blocking the "Activate neighborhood" action (shipped v0.79.0). A visible checklist surfaces the workflow, prevents admins from forgetting steps, and clearly gates the "go live" action on specific prerequisites (boundary + locations sync are hard requirements; events and challenges are nice-to-have).
**Notes:** Add a checklist card/panel to the admin neighborhood Overview tab showing: **Required before live** (draw boundary, sync venues/run locations import), **Optional/anytime** (import events feed, create challenges, configure business claiming, set description/social links). Each item links to its configuration page and shows completion state (green check, gray pending, or red blocker if a required step failed). The existing "Activate neighborhood" button (v0.79.0) should only enable once all required items are complete — today it's enabled any time the neighborhood is still `onboarding`, with no check against actual readiness. Open questions: should optional items block anything, or are they purely informational? Should the checklist track sub-steps (e.g. "import events" → "verify feed URL is valid" → "check event count > 0")? Does completion state live in the DB or is it computed server-side from `neighborhood.boundary_geojson is not null`, `venue count > 0`, `ical_feed_url is set`, etc.?

#### Two-step neighborhood creation: fields first, boundary required after

**Ref:** 110
**Type:** improvement
**Depends:** —
**Why** — The "create neighborhood" form (`apps/web/src/app/admin/neighborhood/new/page.tsx`) currently bundles name/slug/city/state/country/timezone entry with drawing a boundary polygon into one all-or-nothing submit — the `Create neighborhood` button stays disabled until a polygon exists (`canSubmit` requires `polygon`). Splitting these into two required steps (create with just the basic fields, then land directly on the boundary tool as a mandatory next step) matches how the fields and the boundary are actually two different kinds of work — quick form-filling vs. careful map drawing — and lets an admin save their basic setup without losing it if they get interrupted mid-boundary-draw.
**Notes:** Backend implication: `create_neighborhood` (`supabase/migrations/20260708010000_neighborhood_boundary_admin_fns.sql`) always computes `boundary_geojson`/`center_lat`/`center_lng` from a required polygon centroid via PostGIS, and `center_lat`/`center_lng` are `not null` columns (`20260706024100_initial_schema.sql`) — making the boundary optional at creation means either those two columns become nullable (simplest) or get a placeholder default until the boundary step completes. The boundary *editing* tool already exists and works post-creation (`admin/neighborhood/[neighborhoodSlug]/boundary/page.tsx`, `updateNeighborhoodBoundary`) — this item is really "redirect straight there after step 1, and don't let the admin skip it," not new boundary-drawing functionality. Open question: how hard is "required" enforced — just a UX nudge (redirect + banner until a boundary exists), or an actual gate blocking other admin actions (locations sync, description, etc.) until the boundary step is done? A `neighborhood.boundary_geojson is null` check is the natural signal either way.

#### Improve boundary polygon drawing UX

**Ref:** 111
**Type:** improvement
**Depends:** —
**Why** — The neighborhood boundary-drawing tool (`/admin/neighborhood/[slug]/boundary`, `BoundaryMap.tsx`) is difficult to use — creating, moving, and deleting the polygon vertices (dots) on the Google Maps interface is fiddly and unintuitive. This tool is the gating step for neighborhood onboarding (Ref 110, project plan §12.3/§12.6) and directly impacts how quickly an admin can set up a neighborhood. Maps are lightly used in the app elsewhere (users only see the Locations tab's map view today), so any map library upgrade to improve admin UX could also apply to the user-facing map later.
**Notes:** Open questions flagged by the request: is Google Maps the right UI at all, or would a different interaction pattern (e.g., a text-based GeoJSON input with validation, a CSV address list that geofences, a pre-drawn region picker) be easier? Current implementation uses Google Maps JavaScript API via `BoundaryMap.tsx` (apps/web/src/app/admin/neighborhood/BoundaryMap.tsx) — minor UX tweaks (better visual feedback on hover, clearer add/delete gestures) could help, but a full redesign (e.g., replacing with Mapbox, Leaflet, or a non-map paradigm) might be warranted. Tying this to Ref 79 (real interactive map on Locations tab) makes sense: if the app commits to a better map library, both tools get the upgrade.

### Business & Venue

#### Category browsing & filtering

**Ref:** 22
**Type:** improvement
**Depends:** —
**Why** — The 39-category taxonomy (project plan §2, shipped v0.4.0) exists server-side, but the venue list only shows category as plain text next to the address — there's no way to filter or browse by category today.
**Notes:** Filter chips or a category picker on the venues list and map view (map view shipped v0.7.0, already color-codes markers by category group per project plan §1.7). Reuses the existing `Category`/`source_mapping_json` data, no new schema needed.

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
**Depends:** —
**Why** — project plan §13.3 already floats "requiring the business to tap a confirm button on their own device... a true two-sided confirmation" for high-value coupons; scanning the user's QR code is a concrete version of that, and gives businesses a way to check a customer in or redeem a coupon on their behalf as an alternative to the user's own GPS check-in or slide gesture — useful when a user's phone/GPS is having trouble, or simply as a faster front-counter flow.
**Notes:** Business portal (§10.1) gets camera-based QR scanning (`getUserMedia`, same technique as the mobile QR check-in webcam approach in §10.2) reading a per-user, per-session QR code (analogous to the signed-URL scheme already planned for venue/POI QR check-in — project plan §4 Phase 2 — but keyed to the user instead of the venue). Additive to, not a replacement for, the user-initiated slide/GPS flows and the venue coupon claim/redeem flow (shipped v0.54.0, see CHANGELOG.md) it can now build on top of.

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
**Notes:** `BusinessPlan`, `Entitlement`, `CreditBalance`, `CreditTransaction`, `CreditPack` schema (project plan §1.8, §11.3) plus Stripe billing integration for credit-pack purchases. Free-sample entitlement (1 POI, 1 Event, 1 Coupon) ships first; paid credits follow.

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

#### Apple social sign-in (Sign in with Apple)

**Ref:** 17
**Type:** feature
**Depends:** —
**Why** — Same rationale as Google social sign-in (shipped v0.10.0) — removes a signup step at the moments that flow is meant to make frictionless — but scoped separately since it's a materially bigger lift with its own setup dependencies and timeline.
**Notes:** Requires Apple Developer Program enrollment, creating a Services ID, and generating a rotating client-secret JWT (Apple secrets expire and must be regenerated, unlike Google's). Same completion flow on the app side as Google once configured — `supabase.auth.signInWithOAuth`, a redirect callback route, then the existing `/auth/complete-signup`/`/auth/complete-login`, since `verifyToken.ts` already reads the provider generically off `app_metadata`.

#### Leaderboard aggregation performance

**Ref:** 43
**Type:** improvement
**Depends:** —
**Why** — `GET /neighborhoods/:slug/leaderboard` (`apps/api/src/gamification/supabaseRepository.ts`) computes each user's total by fetching every `point_event` row for the neighborhood and summing in JS, rather than a DB-side aggregation. Fine at pilot scale (one small neighborhood), but this will slow down and burn memory as a neighborhood's check-in/favorite history grows.
**Notes:** Replace the client-side sum with a DB-side `GROUP BY`/`SUM` (a Postgres view, materialized view, or RPC function) so aggregation scales with the database rather than with rows pulled over the wire. Revisit once a neighborhood's `point_event` row count becomes large enough to notice — not urgent today.

#### Event detail pages with check-in

**Ref:** 100
**Type:** feature
**Depends:** —
**Why** — Events have no dedicated page today — `EventListItem` only expands its description inline wherever it's rendered (neighborhood Today/Upcoming tabs, venue page, account Events tab), and there's no `GET /events/:id` endpoint to fetch a single event by ID. That means events have no shareable/linkable URL, and unlike venues (GPS geofence check-in via `POST /locations/:id/checkins`, shipped README §4 Phase 1), there's no way to check in at an event specifically — attending an event isn't tracked or rewarded any differently than an ordinary venue visit.
**Notes:** Needs a new `GET /events/:id` route (`events/events.ts`/`supabaseRepository.ts` have no single-event lookup yet) and a new `apps/web/src/app/events/[id]/page.tsx`, mirroring `location/[id]/page.tsx`'s SSR + `generateMetadata` + JSON-LD pattern; `EventListItem`'s title would link to it instead of (or in addition to) the inline expand. Check-in reuses the existing GPS-geofence + cooldown flow (`checkins/checkin.ts`, `CHECKIN_RADIUS_METERS`/`CHECKIN_COOLDOWN_MS`) straightforwardly for venue-scoped events (`Event.venue_id` set — the venue's own lat/lng is already the geofence target). Open questions: (1) neighborhood-scoped events (`venue_id` null — a block party or feed import with only a free-text `location` string) have no coordinates to geofence against at all, so either need a lat/lng added at authoring time or must fall back to a non-GPS "I'm here" confirmation; (2) whether an event check-in should write a distinct `event_id`-tagged record (for event-specific attendance stats/history and badge rules) rather than just reusing a plain venue `checkin` row, and whether it's restricted to the event's `start_time`/`end_time` window rather than available any time the venue itself is checkinable.

#### Shareable badges with OG image previews

**Ref:** 101
**Type:** feature
**Depends:** —
**Why** — Badges have no shareable presence today: `/account/(tabs)/badges` (self-only) and the "Badges" section on `/profile/[username]` both just render a `Badge.icon` code through `BadgeIcon.tsx`'s emoji lookup table inline on the page — there's no per-badge URL, and `profile/[username]/page.tsx`'s `generateMetadata` sets no `openGraph.images` at all (unlike `location/[id]/page.tsx`, which already points its OG image at `/api/locations/:id/photo?index=0`). A link to a friend showing off a badge currently previews as a generic/blank card instead of the badge itself.
**Notes:** Preferred approach: a dynamic OG image (Next.js `ImageResponse`/`next/og`, `opengraph-image.tsx` convention) that server-renders the badge — icon glyph, name, Spored branding — since badges have no static image asset today, only the plain-text `icon` code `BadgeIcon.tsx` maps to an emoji client-side; that mapping table would need a server-side (non-DOM) equivalent for the image-generation route. Needs a shareable badge URL first, which doesn't exist yet — likely `/profile/[username]/badges/[badgeId]` as a proper sub-route (cleaner OG metadata scoping) rather than a query param on the existing profile page. **Fallback if the rendered-image route proves too costly:** skip the custom OG image and instead add a "Share" button (Web Share API `navigator.share`, with a copy-link fallback for unsupported browsers — no existing share pattern in the codebase to reuse) next to each earned badge on both pages, sharing a link + text (e.g. "I just earned the {name} badge on Spored 🍄") even without a rendered preview image.

### Infrastructure & Design

#### Native apps (React Native)

**Ref:** 1
**Type:** feature
**Depends:** —
**Why** — Mobile is the primary long-term surface (free/unlimited Google Maps SDK, push notifications, in-person coupon redemption) but follows the web app so the API/data model is proven out first, per the user's direction to prioritize web for rapid dev.
**Notes:** `apps/mobile` in the same monorepo, consuming the same `packages/api-client` and `packages/types` as web (project plan §10.3). Target feature parity with the web consumer experience (map, check-ins, announcements, challenges) once those web milestones land — this is a parity build, not a redesign.

#### Dev instance of the app (Netlify and Supabase)

**Ref:** 95
**Type:** improvement
**Depends:** —
**Why** — A persistent staging environment enables safe testing and debugging of changes before they reach production users, and a formal approval/promotion workflow prevents accidental releases and gives visibility into what's going live.
**Notes:** Set up parallel Netlify and Supabase instances (or use Supabase preview branches) mirroring the production setup. Hide the dev site from users and search engines via `robots.txt` disallow, meta tags, and/or a basic auth gate. Configure Netlify to auto-deploy commits to a dev branch (e.g. `main-dev` or `staging`) or trigger via GitHub Actions. Create a promotion mechanism — either a manual Netlify deployment trigger (promoting a dev build to prod) or a GitHub Actions workflow requiring explicit approval (via `workflow_dispatch` or a review/check) before promoting. Open questions: should this coexist with Netlify's per-PR preview deploys (different purposes — per-branch preview for each PR, vs. persistent shared dev for manual testing), or replace them? Should dev share a Supabase project/database or use a completely separate one for true isolation?

##### Trim Place Details field mask to a cheaper SKU tier

**Ref:** 113
**Type:** improvement
**Depends:** —
**Why** — `DETAIL_FIELD_MASK` (`apps/api/src/places/client.ts`) requests `reviews` and `photos` on every single `getPlaceDetails` call, which pushes every one of those calls into Google's priciest "Place Details Enterprise + Atmosphere" SKU tier ($25/1k) regardless of whether the caller actually needs reviews/photos that time. Places API content (rating, reviews, hours, phone, photos, etc.) has no caching exception under Google's ToS — only `place_id` (indefinite) and lat/lng (30 days) do — so unlike a typical cost problem, caching longer isn't an available lever here; requesting less per call is.
**Notes:** Check whether every consumer of `VenueEnrichmentCache` actually needs `reviews`/`photos` on every refresh, or whether a cheaper Basic/Contact-only mask would do for most cases, with the Enterprise+Atmosphere mask reserved for whichever specific call sites (if any) truly need it. Related work already shipped: the Places API cost guardrail (`apps/api/src/places/quotaGuard.ts`, `PLACES_API_PRICING` in `packages/types/src/index.ts`) caps `getPlaceDetails`/`fetchPhotoMedia` near the monthly free tier, and `MAX_GALLERY_PHOTOS` (`apps/api/src/enrichment/refresh.ts`) already caps photo count per venue for the same ToS-driven reason. Open question: does trimming the mask conditionally (some calls Basic-only, some Enterprise+Atmosphere) add enough complexity to justify itself, versus just accepting the current flat rate — worth a quick check of how much of `venue_enrichment_cache`'s data actually goes unused before committing to a split.

#### Migrate from Google Places API to Geoapify

**Ref:** 114
**Type:** improvement
**Depends:** —
**Why** — Google's Places ToS forbids caching the fields Spored actually needs (name, address, rating, hours, photos) at all — only `place_id` and lat/lng have caching exceptions — pure friction for a periodic bulk-sync pipeline (`places/sync.ts`) rather than live per-visitor lookups. Geoapify (OSM-based) permits indefinite storage with no per-field restriction, and Spored's real usage volume fits comfortably inside its free tier. Also removes ratings/reviews/photo-gallery features (no Geoapify equivalent; live-verified they're absent from real venue data) and moves map rendering off the separate Google Maps JS SDK onto MapLibre GL JS + Geoapify vector tiles, consolidating everything onto one vendor/key and opening up real map styling/customization that raster tiles don't support.
**Notes:** Full design, phased rollout, schema changes (rename `venue.google_place_id` → `geoapify_place_id`, trim `venue_enrichment_cache`), category-taxonomy remapping, and frontend removal inventory (rating stat tile, `EnrichmentReviews`/`EnrichmentPhotoGallery`, the `/reviews` tab) are documented in `docs/geoapify-migration-plan.md`. Provider comparison, caching/ToS research, and Geoapify cost estimate are in `docs/location-services-comparison.md`, including live-verification results against 5 real venues already in the `venue` table — confirmed real risks: stale/renamed business data (one venue resolved under a different name in OSM) and hours/phone/website coverage well below Google's. `investigate.ts` (admin "why isn't this venue found" diagnostic) and Monitoring's Places dashboard both need Geoapify-shaped equivalents, not mechanical swaps.

**Progress (9-phase plan, see `docs/geoapify-migration-plan.md` for full detail on each):**

- [x] Phase 1 — Geoapify-native client (`apps/api/src/places/geoapifyClient.ts`, `mockGeoapifyClient.ts`) — shipped v0.84.2, standalone/not yet wired in
- [x] Phase 2 — Category taxonomy remapping (`category.source_mapping_json.geoapify` per leaf category) — full replace of `.google` per leaf category (migration `20260828010000_geoapify_category_mapping.sql`), `categorize.ts` rewritten to prefix-match Geoapify's dot-hierarchical tags (single provider key, no more `sourceKey` branching), `categoryAdmin` stack (API + `/admin/super/category-taxonomy` UI) renamed `google_types` → `geoapify_categories`. **Accepted temporary regression**: `sync.ts`/`investigate.ts` still run against the live Google client (Phase 4 not done), so their category-matching calls now compare Google's flat type strings against Geoapify-shaped tags and never match — every place goes uncategorized, and the Nearby Search `includedTypes` restriction was dropped (search now runs unrestricted per tile) since Geoapify's tags aren't valid Google type strings. Both call sites and the affected tests carry comments pointing at Phase 4 as the fix.
- [ ] Phase 3 — Schema changes (rename `venue.google_place_id` → `geoapify_place_id`, trim `venue_enrichment_cache`)
- [ ] Phase 4 — `sync.ts`/`geo.ts` wiring (depends on 1–3)
- [ ] Phase 5 — Backfill existing venues via `locations/review.ts`'s admin diff flow (depends on 4)
- [ ] Phase 6 — Map rendering: MapLibre GL JS + Geoapify vector tiles, replacing Google Maps JS SDK
- [ ] Phase 7 — Monitoring: Geoapify-shaped `places_api_call_log`/cost tracking
- [ ] Phase 8 — Cleanup/removal: delete Google Places code, keys, `docs/google-places-setup.md`
- [ ] Phase 9 — Legal/docs: privacy page subprocessor entry, Geoapify/OSM attribution UI

### Additional app themes within brand guidelines

**Ref:** 105
**Type:** feature
**Depends:** —
**Why** — Today `ThemeToggle`/`theme.ts` only offer light/dark/system, each a fixed palette (`--brand-purple`, `--brand-orange`, etc. in `globals.css`). Additional theme options — e.g. alternate accent palettes that stay within Spored's brand guidelines rather than full custom theming — would give users a personalization option similar to what many consumer apps offer, without opening the door to arbitrary user-chosen colors that could clash with the brand.
**Notes:** `ThemePreference` (`apps/web/src/lib/theme.ts`) is currently a light/dark/system union stored under `data-theme` on `<html>`; extending this to a small fixed set of named themes (each its own CSS custom-property block, analogous to the existing light/dark blocks in `globals.css`) is additive rather than a rework. The inline pre-hydration script in `layout.tsx` (kept in sync with `theme.ts` to avoid a flash of the wrong theme) needs the same extension. Open questions: how many theme variants to ship at launch, and whether theme choice is local-only (localStorage, matching today's light/dark behavior) or synced to the account like other profile preferences.

### Marketing

No open feature items.

### Known issues

No open known issues.
