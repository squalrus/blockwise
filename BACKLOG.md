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
| 59 | [POI enrichment parity with venues](#poi-enrichment-parity-with-venues) | feature | M | H | — |
| 30 | [iCal/webcal event feed import](#icalwebcal-event-feed-import) | feature | M | H | 27 |
| 39 | [Neighborhood marketplace/licensing model](#neighborhood-marketplacelicensing-model) | feature | L | H | — |
| 55 | [Bulk removals: check all / uncheck all toggle](#bulk-removals-check-all-uncheck-all-toggle) | improvement | S | M | — |
| 56 | [Locations tab: category filter and hide-hidden-by-default](#locations-tab-category-filter-and-hide-hidden-by-default) | improvement | S | M | — |
| 60 | [Neighborhood photo strip from venues/POIs](#neighborhood-photo-strip-from-venuespois) | feature | S | M | — |
| 45 | [POIs merged into the venue list/map](#pois-merged-into-the-venue-listmap) | improvement | M | M | — |
| 9 | [Neighborhood notifications](#neighborhood-notifications) | feature | M | M | 5 |
| 27 | [What's happening now](#whats-happening-now) | feature | M | M | 5 |
| 31 | [SimCity-style UI redesign for neighborhood management](#simcity-style-ui-redesign-for-neighborhood-management) | improvement | L | M | — |
| 53 | [Venues tab: default to map view](#venues-tab-default-to-map-view) | improvement | S | L | — |

### Business & Venue

| Ref | Item | Type | Effort | Value | Depends |
|---|---|---|---|---|---|
| 32 | [Business claim requires existing account](#business-claim-requires-existing-account) | improvement | S | H | — |
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
| 61 | [Badge catalog endpoint](#badge-catalog-endpoint) | feature | S | M | — |
| 17 | [Apple social sign-in (Sign in with Apple)](#apple-social-sign-in-sign-in-with-apple) | feature | M | M | — |
| 40 | [Anonymous user quotas](#anonymous-user-quotas) | feature | M | M | — |
| 14 | [Connect with other users](#connect-with-other-users) | feature | M | M | — |
| 15 | [Activity feed of recent check-ins](#activity-feed-of-recent-check-ins) | feature | M | M | 14 |
| 33 | [Friends/neighbors on profile](#friendsneighbors-on-profile) | feature | L | M | — |
| 43 | [Leaderboard aggregation performance](#leaderboard-aggregation-performance) | improvement | S | L | — |

### Infrastructure & Design

| Ref | Item | Type | Effort | Value | Depends |
|---|---|---|---|---|---|
| 1 | [Native apps (React Native)](#native-apps-react-native) | feature | L | H | — |
| 25 | [CI/CD pipeline](#cicd-pipeline) | improvement | L | M | — |
| 26 | [Attribution & compliance checklist](#attribution--compliance-checklist) | improvement | S | L | — |

### Known issues

| Ref | Item | Type | Effort | Value | Depends |
|---|---|---|---|---|---|
| 51 | [Woodland Park POI missing coordinates](#woodland-park-poi-missing-coordinates) | known issue | S | M | — |
| 57 | [Category dropdowns: dark-mode option contrast and alphabetization](#category-dropdowns-dark-mode-option-contrast-and-alphabetization) | known issue | S | M | — |

### Limitations

No open limitations.

---

## Open

### Neighborhood

#### iCal/webcal event feed import

**Ref:** 30
**Type:** feature
**Depends:** [27](#whats-happening-now)
**Why** — Per the "leverage existing content" principle (see below), neighborhoods and businesses already publish events elsewhere (e.g. The Events Calendar plugin's `webcal://.../?post_type=tribe_events&ical=1&eventDisplay=list` feed, as phinneywood.com does) — pulling those in automatically means an admin/owner does zero manual data entry and the neighborhood's event list stays current for free, instead of relying on someone to re-key events into Blockwise.
**Notes:** Add an optional `ical_feed_url` on `neighborhood` and (separately) on `venue`/business profile. A scheduled sync job fetches and parses each feed (a standard `.ics`/iCalendar format despite the `webcal://` scheme — same as `http(s)://`) and upserts into the existing `event` table (`apps/api/src/events/repository.ts`) as `neighborhoodId`- or `venueId`-scoped rows, keyed by the feed's `UID` so re-syncs update rather than duplicate. Manual event entry (already supported via `createEvent`) remains the fallback for neighborhoods/businesses without an external calendar. Feeds directly into [What's happening now](#whats-happening-now) as the primary source of neighborhood event content.

#### Neighborhood marketplace/licensing model

**Ref:** 39
**Type:** feature
**Depends:** —
**Why** — Today Blockwise is free to set up a neighborhood. Supporting an upfront licensing fee (or tiered options for larger neighborhoods, more venues, higher API quotas per project plan §1.5) makes it viable to cover infrastructure/support costs as the platform scales. Limiting boundary syncs to every 24 hours is the primary cost control.
**Notes:** Add a `neighborhood.tier` column (free|starter|pro, or similar) and corresponding quota limits (e.g., free = 100 venues, starter = 1000, pro = 10k). Rate-limit boundary re-syncs and Google Places queries per tier. Integrate Stripe for tier upgrades. Open question: launch with free-only, or start with tiers from day one?

#### POIs merged into the venue list/map

**Ref:** 45
**Type:** improvement
**Depends:** —
**Why** — Neighborhood-owned POIs (parks, transit, landmarks) currently live in a separate "Points of interest" section, disconnected from the venues map/list where users actually browse and check in — folding them into the same browsable surface (with a distinct marker/card style so a park doesn't read as a business) makes POIs discoverable the same way venues are, and surfaces the POI check-in challenge (BACKLOG.md, shipped v0.22.0) naturally instead of requiring a user to scroll past everything else to find it.
**Notes:** `GET /neighborhoods/:id/venues` and the map/list components (`VenuesView.tsx`) would need to accept a combined venue+POI list, tagged with a discriminator (`kind: "venue" | "poi"`) the UI uses for distinct styling (icon/color/badge). The neighborhood page's Venues tab (shipped v0.24.1) is the landing spot for this once it exists.

#### POI enrichment parity with venues

**Ref:** 59
**Type:** feature
**Depends:** —
**Why** — POIs and businesses are often the same underlying Google Place — `Poi.google_place_id` (`packages/types/src/index.ts`) already exists for exactly this (e.g. via "convert venue to POI", Ref 11) — but only venues get rating/hours/photos/reviews via `venue_enrichment_cache` + `enrichment.ts`; a POI with a `google_place_id` shows none of it today. A neighborhood park's or landmark's POI page should have at least the same enrichment a business page gets, since it comes from the identical Google Places source.
**Notes:** Generalize `venue_enrichment_cache` (and `enrichment.ts`'s `getVenueDetailWithFreshEnrichment`) to key on either `venue_id` or `poi_id`, mirroring the nullable `checkin.venue_id`/`checkin.poi_id` pattern already in use. `PoiDetail` (`packages/types`) would gain an `enrichment` field alongside `VenueDetail`'s. The expanded Google Places field mask (hours, contact, multi-photo/review) shipped in v0.32.1, so this now picks up the full field set from day one.

#### Neighborhood photo strip from venues/POIs

**Ref:** 60
**Type:** feature
**Depends:** —
**Why** — Neighborhood pages are otherwise all text/map, no imagery — a photo strip or mosaic pulled from the neighborhood's own venues/POIs would give it visual life for free, since it's sourced from data already fetched and cached rather than a new content type someone has to author.
**Notes:** Query a handful of venues (and, once [POI enrichment parity](#poi-enrichment-parity-with-venues) (Ref 59) ships, POIs too) in the neighborhood with a non-empty cached photo list, and render them via the existing `GET /venues/:id/photo?index=` proxy pattern (no new Places API calls — reuses `venue_enrichment_cache` rows already populated by detail-page views). The expanded field mask (multi-photo mapping) shipped in v0.32.1, so more venues now have a cached photo, and more photos per venue, than before. Open question: curation order (top-rated vs. most recent vs. simple "first N active with a cached photo") — start with the simplest option and revisit if it looks thin.

#### Neighborhood notifications

**Ref:** 9
**Type:** feature
**Depends:** [5](#business-announcements)
**Why** — Business announcements are per-venue and reach only that business's followers; there's no way for neighborhood-level staff (neighborhood admin roles shipped v0.12.0) to broadcast something to everyone in a neighborhood at once (e.g. an event, a service outage, a safety notice).
**Notes:** Likely a `NeighborhoodNotification` (or reuse `Announcement` with a nullable `venue_id` for neighborhood-wide scope) authored via an admin tool gated the same way as other admin surfaces (`requireAdmin`, v0.12.0); delivery channel (push vs. in-app feed) probably follows whatever [Business announcements](#business-announcements) settles on.

#### What's happening now

**Ref:** 27
**Type:** feature
**Depends:** [5](#business-announcements)
**Why** — Users need a single place to discover what events and announcements are happening right now in their neighborhood; businesses want to surface their announcements and social media alongside each other in one stream.
**Notes:** User-facing "what's happening now" feed aggregating in-app announcements and events. Businesses can optionally link Instagram or Twitter accounts to surface social media updates alongside their announcements. Open question: should this pull external events (Facebook Events, Eventbrite, RSS, etc.), or focus on in-app announcements + business social links for initial launch? See [iCal/webcal event feed import](#icalwebcal-event-feed-import) for one concrete answer to that open question.

#### SimCity-style UI redesign for neighborhood management

**Ref:** 31
**Type:** improvement
**Depends:** —
**Why** — The neighborhood management interface (admin dashboard, map-based POI curation, boundary drawing) is functional but text-heavy and utilitarian. A more playful, visual "SimCity" aesthetic (colorful neighborhoods as zoned regions, venues as draggable/filterable objects, pixel-art or stylized map) would make the admin experience more engaging and reinforce the neighborhood-as-a-place concept for users browsing from the landing page.
**Notes:** Primarily a design/CSS/component refactor; no schema or API changes. Could include custom map styling (already supported by Mapbox), themed icons/colors per category, card-based layout with visual hierarchy, interactive dragging/filtering. Likely pairs well with the Locations tab's Places review/curation UI (shipped v0.28.0/v0.29.0). Scope: from polish (tweaks to existing components) to full redesign (new neighborhood detail cards, animated transitions, etc.) — worth scoping early with the user.

#### Bulk removals: check all / uncheck all toggle

**Ref:** 55
**Type:** improvement
**Depends:** —
**Why** — The Locations review wizard's Removals step (shipped v0.29.0) surfaces every active venue/POI that falls outside a redrawn boundary as a checklist for admin approval. For neighborhoods with many removals, manually checking/unchecking each one is tedious — a "Select all / Clear all" button pair would speed up the workflow when an admin wants to approve or skip the entire removal batch.
**Notes:** Add a button pair at the top of the removals list (or inline with the count summary) that toggles all checkboxes in that step. Already using `approvedRemovals` state (`Set<string>` of removal keys) in `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/review/page.tsx`, so the UI change is just two buttons + a `setApprovedRemovals` call to either copy the full removal list or clear it. No API/schema changes.

#### Locations tab: category filter and hide-hidden-by-default

**Ref:** 56
**Type:** improvement
**Depends:** —
**Why** — The Locations tab (shipped v0.28.0) only filters by kind (All/Businesses/POIs/Hidden) — there's no way to filter by category, and the default "All" view mixes active and hidden rows together. For a neighborhood with a lot of venues, an admin scanning for a specific category has to read every row, and hidden rows (already-omitted businesses, already-hidden POIs) clutter a view an admin usually wants to be active-only.
**Notes:** Two independent additions to `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/page.tsx`'s client-side filtering (no API/schema changes needed — `LocationListItem` already carries `category_id`/`category_or_type` and `status`): (1) a category dropdown (reusing the same `categories` list already fetched for the reassign-category action) that filters the merged list by `category_id`; (2) default the "All" chip to excluding `status === "hidden"` rows, with the existing "Hidden" chip remaining the way to see them. Open question: should the category filter also apply to POI rows via their free-text `type` field, or stay business-only since POIs don't use the category taxonomy?

#### Venues tab: default to map view

**Ref:** 53
**Type:** improvement
**Depends:** —
**Why** — The neighborhood page's subnav split (shipped v0.24.1) carried the Venues tab's List/Map toggle over as-is, defaulting to List; the original subnav proposal floated Map as a more natural "what's near me" default, but that part didn't ship with the split.
**Notes:** `VenuesView.tsx` already has the List/Map toggle (shipped v0.7.0/v0.23.0); just flip its initial `useState` to `"map"`. Small, self-contained — no schema or API changes.

### Business & Venue

#### Business claim requires existing account

**Ref:** 32
**Type:** improvement
**Depends:** —
**Why** — Currently, any visitor can submit a venue claim without being signed in (`business_claim.user_id` is nullable). This creates friction for businesses (a claim submitted anonymously is never tied to a specific account for follow-up) and allows spam/false claims. Requiring sign-up before claiming also gates the flow behind account verification.
**Notes:** Make `POST /venues/:id/claims` require `requireAuthUser` instead of allowing optional auth. Set `business_claim.user_id` to NOT NULL and backfill existing rows with a special "orphaned" user ID or delete them. Update the claiming form to redirect to sign-up if signed out.

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
**Notes:** Only public/opted-in check-ins (the profile visibility flag, shipped v0.20.0) should be visible to other visitors. Pairs with [Connect with other users](#connect-with-other-users) (Ref 14) for the actual connect action — likely a "people here now" list on the venue detail page (recent `checkin` rows within a short window) with a connect button per person. Consider whether this needs a tighter privacy control than the general activity feed, since "currently at this specific location" is more sensitive than general recent activity.

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

#### Badge catalog endpoint

**Ref:** 61
**Type:** feature
**Depends:** —
**Why** — The account page (`GET /me/badges`, `UserBadge[]`) only returns badges a user has already earned — there's no endpoint listing every badge that exists, so the account page can't show "locked" badges a user hasn't earned yet as a preview of what's achievable. This came up restyling the account page's badges section: the mockup showed locked placeholder badges alongside earned ones, but there was no real data to back them, so locked slots were dropped rather than fabricated.
**Notes:** Add `GET /badges` (or similar) returning all `Badge` rows (`packages/types`'s `Badge` interface already has `id`/`code`/`name`/`description`/`icon`). The account page cross-references this against `state.badges` (`UserBadge[]`) to render earned vs. locked badge cards — locked ones dimmed/outlined per the existing `BadgeIcon` fallback treatment.

#### Apple social sign-in (Sign in with Apple)

**Ref:** 17
**Type:** feature
**Depends:** —
**Why** — Same rationale as Google social sign-in (shipped v0.10.0) — removes a signup step at the moments that flow is meant to make frictionless — but scoped separately since it's a materially bigger lift with its own setup dependencies and timeline.
**Notes:** Requires Apple Developer Program enrollment, creating a Services ID, and generating a rotating client-secret JWT (Apple secrets expire and must be regenerated, unlike Google's). Same completion flow on the app side as Google once configured — `supabase.auth.signInWithOAuth`, a redirect callback route, then the existing `/auth/complete-signup`/`/auth/complete-login`, since `verifyToken.ts` already reads the provider generically off `app_metadata`.

#### Anonymous user quotas

**Ref:** 40
**Type:** feature
**Depends:** —
**Why** — Anonymous users today can favorite and wishlist unlimited venues, filling the database with noise and potentially being abused (e.g., scripted requests). Limiting anonymous users to 5 favorites and 5 wishlist items protects the system while still giving explorers a meaningful experience.
**Notes:** Enforce quotas on `POST /venues/:id/favorites` and `POST /venues/:id/wishlist` (backlog Ref 2 covers wishlist) by checking (user_id IS NULL AND SELECT COUNT(*) FROM favorites WHERE user_id IS NULL AND device_id = ?) before allowing the insert. After signup, migrate anonymous favorites/wishlist to the new account.

#### Connect with other users

**Ref:** 14
**Type:** feature
**Depends:** —
**Why** — The requested "friend"-equivalent relationship, using neighborhood-flavored language instead of "friend" per the user's ask — lets two users see each other's activity ([Activity feed of recent check-ins](#activity-feed-of-recent-check-ins)) regardless of the public/private default, and is the mechanism behind "connect while at the business" in [Business visitor history and in-person connect](#business-visitor-history-and-in-person-connect).
**Notes:** User profiles with visibility (something to send a request to/from) shipped in v0.20.0. Likely a `user_connection` table (requester/recipient/status: pending|accepted|declined), symmetric once accepted. Naming is still open — user wants a neighborhood-appropriate term rather than "friend" (e.g. "neighbor"); worth deciding before writing UI copy.

#### Activity feed of recent check-ins

**Ref:** 15
**Type:** feature
**Depends:** [14](#connect-with-other-users)
**Why** — Lets a user see what people they're connected to (or public profiles) have been checking into recently — the social payoff for connecting at all, and a natural discovery surface ("what's popular right now among people I know").
**Notes:** Respect the profile visibility flag (shipped v0.20.0) and likely build on Ref 14 — open question: is the feed public-profiles-only, connections-only, or both (with connections seeing more)? Resolve before scoping. Reads off the existing `checkin` table (project plan §4/§14.2) — no new check-in schema needed, just a query surface and visibility filtering.

#### Friends/neighbors on profile

**Ref:** 33
**Type:** feature
**Depends:** —
**Why** — Users today can see profiles and activity, but have no way to explicitly connect with people they've met at venues or events. A friend/follower model lets users build a social graph and see what their friends are up to, especially the venues they've checked in to.
**Notes:** Add a `user_connection` table with (user_id, connected_user_id, status: 'pending'|'accepted'|'blocked', created_at) and a partial unique index. Endpoints: `POST /users/:id/connect` (send request), `POST /users/:id/connect/:connectionId/accept` (accept), `DELETE /users/:id/connect/:connectionId` (remove). Show "Friends" section on public profiles. Open question: model this as one-way "follows" or mutual "friends"? Geolocation-based "nearby users" suggestion is separate scope.

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

#### Attribution & compliance checklist

**Ref:** 26
**Type:** improvement
**Depends:** —
**Why** — project plan §1.6 lists two required attribution items ("Powered by Google" per Maps Platform terms, ODbL attribution if OpenStreetMap is used) as unchecked checkboxes — neither has shipped, and it's a licensing-compliance requirement rather than optional polish.
**Notes:** Google attribution needed wherever Places-sourced data or a Google map renders (map view, venue detail pages). OSM attribution only applies once/if the optional OSM backup source (project plan §1.2) is actually used — otherwise that half can be skipped.

### Known issues

#### Woodland Park POI missing coordinates

**Ref:** 51
**Type:** known issue
**Depends:** —
**Why** — The seeded "Woodland Park" POI (Phinneywood) has `lat`/`lng` = `null`. It predates the v0.22.0 migration that added location columns to `poi` — the row was created manually before POI had coordinates at all, and the seed migration's `where not exists` dedup guard correctly found it already there and skipped re-inserting it, so it never got backfilled with real coordinates. `POST /pois/:id/checkins` requires a non-null `lat`/`lng` to resolve the check-in target, so checking in to Woodland Park currently 404s — meaning the seeded "Explore Woodland Park" challenge is permanently uncompletable as-is.
**Notes:** One-row `UPDATE poi SET lat = ..., lng = ... WHERE name = 'Woodland Park'` (e.g. to the neighborhood's center point, same value the seed migration would have used). Related to but distinct from "Backfill points for existing check-ins/favorites" (Ref 49, shipped v0.24.0) — that was missing `point_event` rows, this is a missing location on one `poi` row.

#### Category dropdowns: dark-mode option contrast and alphabetization

**Ref:** 57
**Type:** known issue
**Depends:** —
**Why** — The category `<select>` dropdowns (venue category reassignment in the Locations tab, and the business classification picker in the Locations review wizard, shipped v0.28.0/v0.29.0) use `dark:bg-transparent` on the `<select>` element with plain, unstyled `<option>` children. In dark mode, the browser falls back to OS-native popup styling for the option list instead of inheriting the page's dark background, which on several platforms renders dark text on a dark background — the options are effectively invisible until the user mouses over one. Separately, the dropdown lists categories sorted by the leaf category's bare `name` (`category.supabaseRepository.ts`'s `.order("name")`), but the label actually shown is `"{group_name} / {name}"` — so the on-screen order doesn't read as alphabetical once categories from different groups interleave.
**Notes:** Contrast fix: give the `<select>` (and/or `<option>` elements) an explicit solid background color for dark mode (e.g. `dark:bg-zinc-900`) instead of `dark:bg-transparent`, so native option-list rendering has a real color to inherit rather than falling back to system defaults. Alphabetization fix: sort client-side (or server-side in `listAssignableCategories`/`toCategoryOption`) by the same composed label the UI displays (`group_name` then `name`), not just the bare leaf `name`. Affects `apps/web/src/app/neighborhood-admin/[neighborhoodSlug]/locations/page.tsx` and `.../locations/review/page.tsx`, both of which build their category `<option>` list from the same `GET /admin/categories` response.
