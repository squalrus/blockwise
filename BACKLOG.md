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
8. If the shipped item was a `Depends` target for anything still open below, drop that reference (or replace it with a note that the prerequisite shipped) when you remove the entry.

## Suggested execution order

- **Ref**: a permanent ID assigned in the order items were added. Never renumber existing items — new items get the next unused integer.
- **Effort**: S = single turn, M = full session, L = multi-session
- **Value**: H = high user impact, M = moderate, L = polish / upkeep
- **Depends**: Ref(s) of other **open backlog** items that must ship first. Prerequisites that have already shipped are not listed here (see item body for that history).
- **Sort rule**: value (desc) → effort (asc, lower effort first) → dependency count (asc, dependency-free items first). Re-sort both tables whenever an item is added, removed, or its Depends list changes.

### Features

| Ref | Item | Effort | Value | Depends |
|---|---|---|---|---|
| 29 | [Google Maps POI import and neighborhood curation](#google-maps-poi-import-and-neighborhood-curation) | M | H | — |
| 1 | [Native apps (React Native)](#native-apps-react-native) | L | H | — |
| 30 | [Instagram links and social media integration](#instagram-links-and-social-media-integration) | M | M | — |
| 2 | [Venue wishlist](#venue-wishlist) | S | M | — |
| 3 | [Coupon redemption also checks you in](#coupon-redemption-also-checks-you-in) | S | M | 20 |
| 5 | [Business announcements](#business-announcements) | M | M | — |
| 6 | [Challenges + badges/points](#challenges--badgespoints) | M | M | — |
| 7 | [QR check-in + POI curation + leaderboards](#qr-check-in--poi-curation--leaderboards) | M | M | — |
| 8 | [Admin portal: neighborhood boundary drawing](#admin-portal-neighborhood-boundary-drawing) | M | M | — |
| 11 | [Business omission & venue merging](#business-omission--venue-merging) | M | M | — |
| 13 | [User profiles with public or private visibility](#user-profiles-with-public-or-private-visibility) | M | M | — |
| 17 | [Apple social sign-in (Sign in with Apple)](#apple-social-sign-in-sign-in-with-apple) | M | M | — |
| 18 | [Business-editable venue basic data](#business-editable-venue-basic-data) | M | M | — |
| 9 | [Neighborhood notifications](#neighborhood-notifications) | M | M | 5 |
| 12 | [Business QR-scan check-in & redemption](#business-qr-scan-check-in--redemption) | M | M | 20 |
| 14 | [Connect with other users](#connect-with-other-users) | M | M | 13 |
| 16 | [Business visitor history and in-person connect](#business-visitor-history-and-in-person-connect) | M | M | 13 |
| 27 | [What's happening now](#whats-happening-now) | M | M | 5 |
| 15 | [Activity feed of recent check-ins](#activity-feed-of-recent-check-ins) | M | M | 13, 14 |
| 19 | [Monetization: credits & entitlements](#monetization-credits--entitlements) | L | M | — |
| 21 | [Yelp Fusion enrichment (future)](#yelp-fusion-enrichment-future) | M | L | — |
| 20 | [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem) | M | L | 5 |

### Improvements

| Ref | Item | Effort | Value | Depends |
|---|---|---|---|---|
| 22 | [Category browsing & filtering](#category-browsing--filtering) | S | M | — |
| 23 | [Sort venues by proximity](#sort-venues-by-proximity) | S | M | — |
| 24 | [Slide-to-check-in](#slide-to-check-in) | S | M | — |
| 25 | [CI/CD pipeline](#cicd-pipeline) | L | M | — |
| 31 | [SimCity-style UI redesign for neighborhood management](#simcity-style-ui-redesign-for-neighborhood-management) | L | M | — |
| 26 | [Attribution & compliance checklist](#attribution--compliance-checklist) | S | L | — |

### Known issues

No open known issues.

### Limitations

No open limitations.

---

## Open

### Google Maps POI import and neighborhood curation

**Ref:** 29
**Type:** feature
**Depends:** —
**Why** — Neighborhood admins currently can only manually create POIs one at a time via the admin dashboard. Blockwise already ingests Google Places data at sync time; exposing that full entity list (parks, transit stops, landmarks, etc.) within the neighborhood's boundary lets admins bulk-import, filter, or selectively approve entries as POIs, greatly speeding up neighborhood setup and ongoing curation without leaving the tool.
**Notes:** Extend the `GET /neighborhoods/:id/events` data fetch pattern to also query Google Places for all entities matching the neighborhood's boundary, presenting them in a filterable list (by category, etc.). Allow admins to bulk-select and convert matching entries to `poi` rows, or individually delete/hide entries. Touches `supabase/migrations`, `apps/api/src/pois/`, `apps/api/src/places/`, `apps/web/src/app/neighborhood-admin/`. Open question: should this also surface a "hide" flag for venues (the user saw this in Ref 11 "Business omission") so admins can suppress a Google Places entry without deleting it?

### Instagram links and social media integration
**Ref:** 30
**Type:** feature
**Depends:** —
**Why** — Business profile pages and neighborhood profile pages are read-only today. Linking to business/neighborhood social media (Instagram, Twitter, etc.) gives visitors context and drives external engagement; embedding posts/images (as new announcement content types) could enhance discovery without requiring the business to re-post into Blockwise itself.
**Notes:** Add social media URL fields to `business_claim` and `neighborhood` (Instagram, Twitter, TikTok, etc., or a generic `social_links` JSON field). Profile pages show these as outbound links. Stretch: explore Instagram Graph API or Twitter API for public feed embedding (though APIs may have strict terms around display/attribution), or consider RSS feeds as a simpler alternative. Schema: `supabase/migrations`, `packages/types/`, `apps/api/src/businesses/`, `apps/api/src/neighborhoods/`. UI: business owner dashboard and neighborhood admin dashboard forms + public profile pages.

### SimCity-style UI redesign for neighborhood management
**Ref:** 31
**Type:** improvement
**Depends:** —
**Why** — The neighborhood management interface (admin dashboard, map-based POI curation, boundary drawing) is functional but text-heavy and utilitarian. A more playful, visual "SimCity" aesthetic (colorful neighborhoods as zoned regions, venues as draggable/filterable objects, pixel-art or stylized map) would make the admin experience more engaging and reinforce the neighborhood-as-a-place concept for users browsing from the landing page.
**Notes:** Primarily a design/CSS/component refactor; no schema or API changes. Could include custom map styling (already supported by Mapbox), themed icons/colors per category, card-based layout with visual hierarchy, interactive dragging/filtering. Likely pairs well with Ref 29's POI curation UI. Scope: from polish (tweaks to existing components) to full redesign (new neighborhood detail cards, animated transitions, etc.) — worth scoping early with the user.

### Native apps (React Native)
**Ref:** 1
**Type:** feature
**Depends:** —
**Why** — Mobile is the primary long-term surface (free/unlimited Google Maps SDK, push notifications, in-person coupon redemption) but follows the web app so the API/data model is proven out first, per the user's direction to prioritize web for rapid dev.
**Notes:** `apps/mobile` in the same monorepo, consuming the same `packages/api-client` and `packages/types` as web (README §10.3). Target feature parity with the web consumer experience (map, check-ins, announcements, challenges) once those web milestones land — this is a parity build, not a redesign.

### Venue wishlist
**Ref:** 2
**Type:** feature
**Depends:** —
**Why** — "Want to visit" intent is distinct from "already like this place" (shipped as Favorite venues in v0.9.0) — useful for challenge/exploration framing later (e.g. surfacing wishlisted venues that also count toward an active challenge).
**Notes:** Same anonymous-first, device-scoped pattern as the shipped `favorite` table (`supabase/migrations/20260706060000_favorite_venues.sql`) — likely shares a schema shape (e.g. a `list_type` of `favorite` | `wishlist` on the same table) and UI treatment, just a different label/intent per venue.

### Coupon redemption also checks you in
**Ref:** 3
**Type:** feature
**Depends:** [20](#business-coupons--slide-to-redeem)
**Why** — Redeeming a coupon already proves the user is physically at the venue (README §13.3's whole rationale for the slide gesture is in-person, witnessed confirmation) — that's strictly stronger evidence of presence than a GPS geofence, so it should count as a check-in too rather than requiring a separate, redundant action from the user.
**Notes:** On `CouponRedemption` write, also write a `Checkin` row for that `venue_id`/`user_id` (server-side, same transaction) — subject to the existing cooldown logic so it doesn't create a duplicate/conflicting check-in if the user already checked in recently.

### Business announcements
**Ref:** 5
**Type:** feature
**Depends:** —
**Why** — First monetizable content type and the reason business claiming exists; also the base that coupons (§13) later attach to.
**Notes:** Claimed-business authoring tool + follower feed, with a basic moderation queue per README §5. Both prerequisites have now shipped — business claiming + GPS check-in (v0.6.0) and real user authentication (v0.8.0) — so this item is fully unblocked.

### Challenges + badges/points
**Ref:** 6
**Type:** feature
**Depends:** —
**Why** — Core gamification loop that drives repeat engagement; template-driven so new challenges are a data change, not a code change.
**Notes:** Template-driven challenges (README §6), points/badges (README §7), neighborhood-scoped opt-in leaderboards. Reads off existing `Venue`/`Category`/check-in tables, no new core schema needed. Persistent-named leaderboard presence needs real user authentication, which shipped in v0.8.0; anonymous check-ins can still count toward progress independent of that.

### QR check-in + POI curation + leaderboards
**Ref:** 7
**Type:** feature
**Depends:** —
**Why** — Solves GPS accuracy issues for multi-POI venues (markets, food halls) and rounds out the check-in system started earlier.
**Notes:** QR code generation per Venue/POI linking to a signed check-in URL (README §4 Phase 2), POI curation tooling for admins/businesses (README §3), public leaderboards.

### Admin portal: neighborhood boundary drawing
**Ref:** 8
**Type:** feature
**Depends:** —
**Why** — Makes onboarding a second neighborhood after Phinneywood a data workflow instead of a code change (README §12.3, §12.5).
**Notes:** Interactive polygon-drawing tool (Mapbox GL Draw or Google Maps Drawing Library) gated to internal staff, with a dry-run Places query preview before committing the boundary, per README §12.6. Also covers re-editing an existing neighborhood's boundary (not create-only), per the same section.

### Neighborhood notifications
**Ref:** 9
**Type:** feature
**Depends:** [5](#business-announcements)
**Why** — Business announcements are per-venue and reach only that business's followers; there's no way for neighborhood-level staff (neighborhood admin roles shipped v0.12.0) to broadcast something to everyone in a neighborhood at once (e.g. an event, a service outage, a safety notice).
**Notes:** Likely a `NeighborhoodNotification` (or reuse `Announcement` with a nullable `venue_id` for neighborhood-wide scope) authored via an admin tool gated the same way as other admin surfaces (`requireAdmin`, v0.12.0); delivery channel (push vs. in-app feed) probably follows whatever [Business announcements](#business-announcements) settles on.

### Business omission & venue merging
**Ref:** 11
**Type:** feature
**Depends:** —
**Why** — The sync pipeline's dedup pass (README §1.4 step 2) only catches fuzzy name/geo matches automatically; it has no way to handle cases a human needs to judge — a venue that shouldn't be listed at all (e.g. closed, or a residential false-positive from Google), or multiple Google Places entries that are actually sub-units of one physical building (the market/food-hall multi-POI case §3 already anticipates for check-ins).
**Notes:** Two related capabilities: (a) an explicit hide/omit flag on `Venue` so admin curation can suppress a listing without deleting the row (preserves check-in/history integrity), and (b) an admin merge action that collapses duplicate `Venue` rows into one, reparenting their `POI`/`checkin`/enrichment-cache records — worth having before [QR check-in + POI curation + leaderboards](#qr-check-in--poi-curation--leaderboards) is exercised at scale on multi-POI venues.

### Business QR-scan check-in & redemption
**Ref:** 12
**Type:** feature
**Depends:** [20](#business-coupons--slide-to-redeem)
**Why** — README §13.3 already floats "requiring the business to tap a confirm button on their own device... a true two-sided confirmation" for high-value coupons; scanning the user's QR code is a concrete version of that, and gives businesses a way to check a customer in or redeem a coupon on their behalf as an alternative to the user's own GPS check-in or slide gesture — useful when a user's phone/GPS is having trouble, or simply as a faster front-counter flow.
**Notes:** Business portal (§10.1) gets camera-based QR scanning (`getUserMedia`, same technique as the mobile QR check-in webcam approach in §10.2) reading a per-user, per-session QR code (analogous to the signed-URL scheme already planned for venue/POI QR check-in — README §4 Phase 2 — but keyed to the user instead of the venue). Additive to, not a replacement for, the user-initiated slide/GPS flows. The check-in half can reuse existing check-in logic without waiting on the redemption dependency.

### User profiles with public or private visibility
**Ref:** 13
**Type:** feature
**Depends:** —
**Why** — Foundation for [Connect with other users](#connect-with-other-users), [Activity feed of recent check-ins](#activity-feed-of-recent-check-ins), and [Business visitor history and in-person connect](#business-visitor-history-and-in-person-connect) — all three need a per-user visibility setting before showing anyone else's activity, since a signed-in identity (shipped v0.8.0) doesn't by itself imply the user wants their presence visible to others.
**Notes:** A `user_profile` extension on `app_user` (display name, optional avatar, `visibility` of `public` | `private`, default `private`) gated behind real user authentication (shipped v0.8.0) — anonymous devices have no profile to show. Private-by-default is the safe choice; the other three items below should all check this flag before surfacing a user's activity to anyone else.

### Connect with other users
**Ref:** 14
**Type:** feature
**Depends:** [13](#user-profiles-with-public-or-private-visibility)
**Why** — The requested "friend"-equivalent relationship, using neighborhood-flavored language instead of "friend" per the user's ask — lets two users see each other's activity ([Activity feed of recent check-ins](#activity-feed-of-recent-check-ins)) regardless of the public/private default, and is the mechanism behind "connect while at the business" in [Business visitor history and in-person connect](#business-visitor-history-and-in-person-connect).
**Notes:** Needs [User profiles with public or private visibility](#user-profiles-with-public-or-private-visibility) first (something to send a request to/from). Likely a `user_connection` table (requester/recipient/status: pending|accepted|declined), symmetric once accepted. Naming is still open — user wants a neighborhood-appropriate term rather than "friend" (e.g. "neighbor"); worth deciding before writing UI copy.

### Activity feed of recent check-ins
**Ref:** 15
**Type:** feature
**Depends:** [13](#user-profiles-with-public-or-private-visibility), [14](#connect-with-other-users)
**Why** — Lets a user see what people they're connected to (or public profiles) have been checking into recently — the social payoff for connecting at all, and a natural discovery surface ("what's popular right now among people I know").
**Notes:** Respect the visibility flag from Ref 13 and likely build on Ref 14 — open question: is the feed public-profiles-only, connections-only, or both (with connections seeing more)? Resolve before scoping. Reads off the existing `checkin` table (README §4/§14.2) — no new check-in schema needed, just a query surface and visibility filtering.

### Business visitor history and in-person connect
**Ref:** 16
**Type:** feature
**Depends:** [13](#user-profiles-with-public-or-private-visibility)
**Why** — Two related asks: showing who is/was recently at a business (social proof, "who's here right now"), and letting users connect with each other while physically co-located at a venue — turns a shared check-in into a natural, low-friction moment to start a connection.
**Notes:** Only public/opted-in check-ins (Ref 13's visibility flag) should be visible to other visitors. Pairs with [Connect with other users](#connect-with-other-users) (Ref 14) for the actual connect action — likely a "people here now" list on the venue detail page (recent `checkin` rows within a short window) with a connect button per person. Consider whether this needs a tighter privacy control than the general activity feed, since "currently at this specific location" is more sensitive than general recent activity.

### Apple social sign-in (Sign in with Apple)
**Ref:** 17
**Type:** feature
**Depends:** —
**Why** — Same rationale as Google social sign-in (shipped v0.10.0) — removes a signup step at the moments that flow is meant to make frictionless — but scoped separately since it's a materially bigger lift with its own setup dependencies and timeline.
**Notes:** Requires Apple Developer Program enrollment, creating a Services ID, and generating a rotating client-secret JWT (Apple secrets expire and must be regenerated, unlike Google's). Same completion flow on the app side as Google once configured — `supabase.auth.signInWithOAuth`, a redirect callback route, then the existing `/auth/complete-signup`/`/auth/complete-login`, since `verifyToken.ts` already reads the provider generically off `app_metadata`.

### Business-editable venue basic data
**Ref:** 18
**Type:** feature
**Depends:** —
**Why** — Google-sourced venue data (name, description, hours, photos) is only as current as the last sync pipeline run — a claimed business owner has no way to correct or supplement it themselves (e.g. updated hours, a better description, their own photos) between syncs.
**Notes:** Builds on the business owner venue dashboard (shipped v0.14.0), which is the surface this editing UI would live in. Needs a way to distinguish owner-edited fields from sync-pipeline-written ones so a future sync run doesn't silently overwrite an owner's edits (e.g. an `overridden_by_owner` flag per field, or a separate `VenueOverride` table the read path merges on top of the synced `Venue` row).

### Monetization: credits & entitlements
**Ref:** 19
**Type:** feature
**Depends:** —
**Why** — Revenue model for the business side; deliberately built after business claiming is proven out, not before, per README §11.4.
**Notes:** `BusinessPlan`, `Entitlement`, `CreditBalance`, `CreditTransaction`, `CreditPack` schema (README §1.8, §11.3) plus Stripe billing integration for credit-pack purchases. Free-sample entitlement (1 POI, 1 Event, 1 Announcement) ships first; paid credits follow.

### Business coupons + slide-to-redeem
**Ref:** 20
**Type:** feature
**Depends:** [5](#business-announcements)
**Why** — Extends announcements into a concrete redemption/revenue mechanic for businesses, using physical friction (not cryptography) to discourage reuse.
**Notes:** `Coupon` as an attachment to `Announcement`, `CouponRedemption` with server-authoritative timestamps and atomic check-and-increment against redemption caps, per README §13. Real user authentication (README §14.3), needed for redemption itself, has already shipped (v0.8.0); the remaining blocker is Business announcements.

### Yelp Fusion enrichment (future)
**Ref:** 21
**Type:** feature
**Depends:** —
**Why** — Dropped from the initial plan (README §1.1) to avoid Yelp's stricter 24-hour content TTL and licensing overhead before the core Google-sourced data layer even ships. Revisit only if ratings/reviews/photos become a clear user ask that Google's own fields don't already cover.
**Notes:** Would add a `yelp_business_id` column to `Venue` and a `'yelp'` entry to `VenueEnrichmentCache.source` (README §1.3), fetched on-demand and never persisted past 24 hours per Yelp's ToS — including the Yelp attribution/compliance checklist items that were removed from README §1.6. Not currently planned; no other backlog item depends on it.

### Category browsing & filtering
**Ref:** 22
**Type:** improvement
**Depends:** —
**Why** — The 39-category taxonomy (README §2, shipped v0.4.0) exists server-side, but the venue list only shows category as plain text next to the address — there's no way to filter or browse by category today.
**Notes:** Filter chips or a category picker on the venues list and map view (map view shipped v0.7.0, already color-codes markers by category group per README §1.7). Reuses the existing `Category`/`source_mapping_json` data, no new schema needed.

### Sort venues by proximity
**Ref:** 23
**Type:** improvement
**Depends:** —
**Why** — The venues list orders results alphabetically by name (`supabaseDetailRepository.ts`'s `.order("name")`) regardless of where the user is standing — in a walkable neighborhood app, "what's closest to me" is a more useful default ordering than alphabetical for finding somewhere to go right now.
**Notes:** Sort by distance from the device's current lat/lng (already collected for GPS check-in, README §4) using the existing `Venue.lat`/`lng` columns — no new schema needed, just a distance calculation (haversine) applied client- or server-side and a toggle if alphabetical should remain an option.

### Slide-to-check-in
**Ref:** 24
**Type:** improvement
**Depends:** —
**Why** — Check-in today (v0.6.0, `CheckInButton.tsx`) is a plain tap button. Once [Business coupons + slide-to-redeem](#business-coupons--slide-to-redeem) (Ref 20) ships its physical-friction slide gesture (README §13.2), reusing the same control for check-in gives one consistent "commit to this action" interaction across the app instead of two different patterns for conceptually similar moments.
**Notes:** Extract the slide gesture as a shared component used by both flows — whichever of check-in or coupons is built first should design it as reusable rather than coupon-specific, so this isn't a hard dependency in either direction. Check-in's version doesn't need the "server writes the authoritative timestamp, locked after use" redemption semantics from §13.2 — just the slide-to-confirm interaction itself.

### CI/CD pipeline
**Ref:** 25
**Type:** improvement
**Depends:** —
**Why** — README §10.4 specifies a CI/CD pipeline (GitHub Actions, lint/typecheck/unit tests on every PR, Playwright E2E for web, Sentry error tracking, feature flags for gradual mobile rollout) as part of the build plan, but the only correctness gate that exists today is a manual `npm run build` (per CONTRIBUTING.md) — no `.github/workflows`, E2E tests, or error tracking exist yet.
**Notes:** Scope conservatively for current project size — GitHub Actions running lint/typecheck/unit tests plus Netlify preview deploys is the near-term win; Playwright E2E, Sentry, and feature flags can follow once there's more surface area (multiple developers, mobile app) to justify them. Detox/Maestro (mobile E2E) isn't relevant until [Native apps (React Native)](#native-apps-react-native) (Ref 1) exists.

### Attribution & compliance checklist
**Ref:** 26
**Type:** improvement
**Depends:** —
**Why** — README §1.6 lists two required attribution items ("Powered by Google" per Maps Platform terms, ODbL attribution if OpenStreetMap is used) as unchecked checkboxes — neither has shipped, and it's a licensing-compliance requirement rather than optional polish.
**Notes:** Google attribution needed wherever Places-sourced data or a Google map renders (map view, venue detail pages). OSM attribution only applies once/if the optional OSM backup source (README §1.2) is actually used — otherwise that half can be skipped.

### What's happening now
**Ref:** 27
**Type:** feature
**Depends:** [5](#business-announcements)
**Why** — Users need a single place to discover what events and announcements are happening right now in their neighborhood; businesses want to surface their announcements and social media alongside each other in one stream.
**Notes:** User-facing "what's happening now" feed aggregating in-app announcements and events. Businesses can optionally link Instagram or Twitter accounts to surface social media updates alongside their announcements. Open question: should this pull external events (Facebook Events, Eventbrite, RSS, etc.), or focus on in-app announcements + business social links for initial launch?
