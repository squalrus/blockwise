# URL map

Living inventory of every route in `apps/web` and every endpoint in `apps/api`. This is **not** a point-in-time snapshot — keep it current.

> **Update this file whenever a route changes.** Adding, removing, renaming, or re-scoping a web page or API endpoint? Update the matching tree below in the same change. See [CONTRIBUTING.md](../CONTRIBUTING.md)'s workflow step 2 — CLAUDE.md also flags this so it gets checked automatically during AI-assisted changes.

Last reviewed: 2026-07-10 (Merged venue+POI into one `kind`-discriminated entity — see History).

## Web app (`apps/web/src/app`, Next.js App Router)

Legend: **P** = public, no auth · **C** = client-side auth check only (soft) · **S** = server-enforced auth (hard gate on the API calls the page makes)

```text
apps/web/src/app/
├── layout.tsx                                    (root layout — SiteChrome swaps in the marketing nav/footer on "/", AccountNav/Footer elsewhere)
├── SiteChrome.tsx                                 (client component, no route — hides AccountNav/Footer on "/" in favor of the homepage's own nav/footer)
├── page.tsx                                       / — C — redirects to /account (signed in) or /login (signed out); marketing homepage now lives at tryspored.com (apps/marketing)
├── login/page.tsx                                 /login — P
├── signup/page.tsx                                /signup — P
├── auth/callback/page.tsx                         /auth/callback — P (OAuth redirect target, sets session)
├── account/
│   ├── page.tsx                                    /account — C — profile summary (points/favorite/check-in counts), favorites, check-ins
│   └── settings/page.tsx                           /account/settings — C — profile editing, account details, joined neighborhoods (home-neighborhood picker)
├── checkin/
│   ├── page.tsx                                    /checkin — C — quick-access nearest-venue check-in, linked from the nav next to the hamburger menu
│   └── NearestVenues.tsx                           (shared component, no route)
├── profile/
│   └── [username]/page.tsx                        /profile/:username — P — public user profile, neighborhoods, recent check-ins
├── neighborhoods/
│   ├── page.tsx                                    /neighborhoods — P — browse/join every active neighborhood (NeighborhoodsSection: search box, business/member counts per card)
│   └── [slug]/
│       ├── layout.tsx                              — P — shared header (description, social links, join button), subnav tab bar
│       ├── page.tsx                                /neighborhoods/:slug — Happening now tab (default) — events in progress + businesses/POIs currently open per cached hours
│       ├── activity/page.tsx                       /neighborhoods/:slug/activity — Recent activity tab — neighborhood-wide feed (check-ins, favorites, badge unlocks, challenge completions); actor names masked to "A user" for private profiles
│       ├── events/page.tsx                         /neighborhoods/:slug/events — Upcoming events tab — neighborhood-owned events + business events
│       ├── locations/page.tsx                      /neighborhoods/:slug/locations — Locations tab (list/map toggle) — merges businesses (renamed from Venues) and neighborhood-owned POIs (folded in from the former Points of interest tab)
│       └── challenges/page.tsx                     /neighborhoods/:slug/challenges — Challenges tab — challenges on top, leaderboard below (merged from two separate tabs)
├── location/
│   └── [id]/page.tsx                              /location/:id — P — merged business/POI detail page (BACKLOG.md "POIs and venues managed almost the same"), branches on `kind`: claim form/favorite/announcements/events for business, type/description/check-in stat for POI
├── business/
│   ├── page.tsx                                   /business — C — venues this account has claimed
│   └── [venueId]/page.tsx                         /business/:venueId — S (requireVenueOwner) — owner dashboard
├── neighborhood-admin/
│   ├── page.tsx                                    /neighborhood-admin — C — list neighborhoods this account administers
│   ├── new/page.tsx                                /neighborhood-admin/new — S (POST /admin/neighborhoods) — create a neighborhood + draw its boundary
│   ├── BoundaryMap.tsx                             (shared component, no route — Google Maps Drawing Library polygon editor)
│   └── [neighborhoodSlug]/
│       ├── layout.tsx                              — S (neighborhoodAdminGate on every tab's data calls) — resolves slug→id, tab nav, scope gate
│       ├── page.tsx                                /neighborhood-admin/:slug — Overview tab (description, social links, events, read-only active POIs)
│       ├── boundary/page.tsx                       /neighborhood-admin/:slug/boundary — Boundary tab (draw/edit + dry-run Places preview); a successful save links into the Locations review wizard (Ref 54) rather than reconciling automatically
│       ├── claims/page.tsx                         /neighborhood-admin/:slug/claims — Business claims tab (approve/reject/revoke)
│       ├── locations/page.tsx                      /neighborhood-admin/:slug/locations — Locations tab (merged business+POI list; reassign category, hide/restore, switch kind in place for either kind (BACKLOG.md "POIs and venues managed almost the same"); create/edit/hide/restore/delete for POIs (Ref 29))
│       └── locations/review/page.tsx                /neighborhood-admin/:slug/locations/review — bulk Google Places review + boundary reconciliation wizard: admin-triggered query against the saved boundary, classify each new candidate as business/POI/omit (Ref 29), approve hiding active locations no longer inside the boundary (Ref 54)
├── admin/
│   └── category-taxonomy/page.tsx                  /admin/category-taxonomy — S (requireAdmin) — global category CRUD
└── dev/
    └── components/page.tsx                          /dev/components — P (not linked from any nav) — internal component library, pins components (e.g. SlideToCheckIn via previewStatus) to specific states for review without a live backend
```

Identifier note: neighborhoods are addressed by **slug** everywhere in the web app now (`/neighborhoods/:slug`, `/neighborhood-admin/:slug`); locations (business or POI) are addressed by **id** (UUID) everywhere (`/location/:id`, `/business/:venueId`).

## Marketing site (`apps/marketing/src/app`, Next.js App Router)

Deployed separately at `tryspored.com` (apps/web is `app.tryspored.com`). Fully static — no API calls, no auth. Login/signup/neighborhoods/business links point at `apps/web` via an absolute URL (`NEXT_PUBLIC_APP_URL`, see `src/lib/appUrl.ts`).

```text
apps/marketing/src/app/
├── page.tsx                                       / — P — marketing homepage (hero, how-it-works, leaderboard teaser, neighborhood map, business pitch, final CTA)
├── MarketingNav.tsx                                (shared component, no route — sticky nav used by every marketing page)
├── MarketingFooter.tsx                              (shared component, no route — footer used by every marketing page)
└── brand/
    └── page.tsx                                    /brand — P — brand guidelines: logo lockups, four-part mark anatomy, spot pattern library, color palette, favicon/app icon, generated-identity concept, usage do/don't
```

Terms, privacy, FAQ, and changelog pages are planned but not built yet.

## API (`apps/api/src/app.ts`)

Auth gates:

- **public** — no auth, or `attachOptionalAuthUser` (personalizes response if a token is present, never blocks)
- **auth** — `requireAuthUser` (any signed-in account)
- **business** — `requireBusinessAccount` (signed in + `account_type = 'business'`)
- **venueOwner** — `requireVenueOwner` (approved claim on the venue at `:id`)
- **admin** — `requireAdmin` (admin of *at least one* neighborhood, no `:id` to scope by — list-style routes only)
- **neighborhoodAdmin** — `requireNeighborhoodAdmin` (admin of the *specific* neighborhood at `:id`)

```text
/health                                             GET — public

/auth/
├── complete-signup                                 POST — public (completes a Supabase Auth signup)
├── complete-login                                   POST — public (completes a Supabase Auth login)
├── me                                                GET — auth
└── promote-to-business                               POST — auth

/neighborhoods                                       GET — public — list, joined-flag if authed, business_count/member_count per neighborhood
├── :slug/
│   ├── (root)                                        GET — public — profile
│   ├── leaderboard                                   GET — public — points leaderboard, public-visibility users only
│   └── challenges                                    GET — public (optional auth) — challenge templates + this user's progress
└── :id/
    ├── events                                        GET — public — neighborhood-owned events + business events, merged and sorted by start time (Upcoming events tab)
    ├── venues                                        GET — public
    ├── activity                                        GET — public — ~50 most recent check-ins/favorites/challenge completions/badge unlocks; actor names masked to "A user" for private profiles
    ├── happening-now                                    GET — public — events in progress + businesses/POIs currently open per cached hours
    ├── join                                            POST, DELETE — auth
    └── home                                            POST — auth

/locations/:id
├── (root)                                            GET — public — merged business/POI detail + enrichment cache (BACKLOG.md "POIs and venues managed almost the same"; was separate GET /venues/:id + GET /pois/:id)
├── photo                                              GET — public — ?index= selects among cached photos (default 0)
└── checkins                                          POST — public (optional auth) — awards check-in points/challenge progress, same geofence/cooldown for either kind

/venues/:id
├── announcements                                       GET — public — business-kind only (empty for a POI id)
├── events                                              GET — public — business-kind only
├── claims                                              POST — public (optional auth attaches claimed_by_user_id) — business-kind only, rejected by claim ownership gating for a POI id
└── favorites                                            GET, POST, DELETE — mixed (GET public, POST/DELETE auth) — POST awards first-time favorite points, business-kind only

/me/
├── checkins                                          GET — auth
├── favorites                                          GET — auth
├── neighborhoods                                      GET — auth
├── points                                              GET — auth — all-time, all-neighborhood points total + level/points_into_level/points_to_next_level
├── badges                                              GET — auth — every badge this user has earned, across every neighborhood
├── challenges/completed-count                          GET — auth — all-time, all-neighborhood completed-challenge count
└── profile                                            PATCH — auth — display_name/avatar_style/username/visibility (avatar_url is read-only, seeded from OAuth at signup)

/badges                                              GET — public — every badge that exists (earned or not), for locked-badge display (BACKLOG.md Ref 61)

/users/:username                                     GET — public — profile (only reachable if visibility = public); checkin_count/favorite_count/points_summary/challenges_summary/avatar_style alongside badges/recent_checkins/neighborhoods

/business/
├── venues                                            GET — business — venues this account has claimed
└── venues/:id/
    ├── dashboard                                       GET — venueOwner
    ├── social-links                                     PATCH — venueOwner
    ├── announcements                                    POST — venueOwner
    └── events                                           POST — venueOwner

/neighborhood-admin/
├── neighborhoods                                     GET — admin — list neighborhoods this account administers
└── neighborhoods/:id/
    ├── dashboard                                       GET — neighborhoodAdmin
    ├── (root)                                          PATCH — neighborhoodAdmin — description
    ├── boundary                                         GET, PATCH — neighborhoodAdmin — boundary_geojson/center (BACKLOG.md Ref 8)
    ├── social-links                                     PATCH — neighborhoodAdmin
    ├── events                                           POST — neighborhoodAdmin
    ├── claims                                           GET — neighborhoodAdmin — ?status= filter, venue-joined
    ├── claims/:claimId/approve                          POST — neighborhoodAdmin
    ├── claims/:claimId/reject                           POST — neighborhoodAdmin
    ├── claims/:claimId/revoke                            POST — neighborhoodAdmin — un-approves an already-approved claim (BACKLOG.md "POIs and venues managed almost the same"); reviewClaim only handles pending claims, so this is the only path back to claimed_by_business = false, e.g. to unblock switching that business to POI kind
    ├── locations                                         GET, POST — neighborhoodAdmin — GET takes ?search=, merged business+POI list backing the Locations tab (BACKLOG.md Ref 29, generalized); POST creates a location (kind in body — only "poi" is wired into the admin UI today, "business" accepted for forward compatibility)
    ├── locations/:locationId                             GET, PATCH, DELETE — neighborhoodAdmin — DELETE is 409 for a business-kind location (hide instead) or if checkin/point_event/challenge/favorite/claim/announcement/event history exists (BACKLOG.md Ref 29)
    ├── locations/:locationId/category                    PATCH — neighborhoodAdmin — business-kind only in practice
    ├── locations/:locationId/status                      PATCH — neighborhoodAdmin — active|hidden, either kind (BACKLOG.md Ref 11/29)
    ├── locations/:locationId/kind                        PATCH — neighborhoodAdmin — switches business⇄poi kind in place (BACKLOG.md "POIs and venues managed almost the same"); 409 if switching a claimed business to poi
    ├── locations/review                                  GET — neighborhoodAdmin — dry-run Google Places query against the *saved* boundary excluding already-known locations (Ref 29), plus every active location no longer inside that boundary (Ref 54)
    └── locations/review/commit                           POST — neighborhoodAdmin — bulk-applies business/POI/omit classifications and approved hide-removals from the review above

/admin/
├── categories                                        GET — admin — assignable leaf categories (global, not neighborhood-owned)
├── neighborhoods                                     POST — admin — create a neighborhood + boundary (BACKLOG.md Ref 8); creator becomes its admin
├── neighborhoods/preview-boundary                    POST — admin — dry-run Google Places query against a drawn (not-yet-saved) polygon
└── category-taxonomy/
    ├── (root)                                          GET, POST — admin
    ├── :id                                              PATCH — admin
    └── :id/archive                                       POST — admin
```

Identifier note: every neighborhood-identifying path param in the API is the **id** (UUID), except the public `GET /neighborhoods/:slug` family (profile, leaderboard, challenges) — the web app resolves slug→id client-side (via `GET /neighborhood-admin/neighborhoods`) before calling any `:id`-keyed admin route. Location-identifying params (business or POI) are always **id** (UUID), never slug.

## History

- **2026-07-10** — Public neighborhood profile tabs reworked (BACKLOG.md Ref 27, "What's happening now"). Tab order/routes: Happening now (default, `/neighborhoods/:slug`) → Recent activity (`/activity`) → Upcoming events (`/events`) → Locations (`/locations`) → Challenges (`/challenges`, merged with Leaderboard). Challenges and Leaderboard merged into one tab (challenges on top, leaderboard below). Venues tab renamed to Locations and merged with the former standalone Points of interest tab (`/neighborhoods/:slug/venues` and `/pois` → `/neighborhoods/:slug/locations`, no redirects; POIs with no cached lat/lng, BACKLOG.md Ref 51, are excluded from the merged list rather than plotted at a bogus position). Upcoming events (`GET /neighborhoods/:id/events`) now merges neighborhood-owned events with events from businesses in the neighborhood (`Event` gained `venue_name`). New Recent activity tab (`GET /neighborhoods/:id/activity`) shows a neighborhood-wide feed of check-ins/favorites/challenge completions/badge unlocks with actor names masked to "A user" for private profiles. New Happening now tab (`GET /neighborhoods/:id/happening-now`) shows events in progress plus businesses/POIs currently open, per a new `isOpenNow` parser over the existing cached `hours` text.
- **2026-07-10** — `venue` and `poi` merged into one table with a `kind` column (`'business' | 'poi'`), so switching a location between the two is a single in-place update instead of the old hide-then-recreate-as-a-new-row "Convert to POI" flow. `checkin`/`point_event`/`challenge`/`venue_enrichment_cache` all lost their separate `poi_id` column in favor of `venue_id` covering both kinds. Public `/venues/:id` + `/pois/:id` merged into `/location/:id` (web) and `GET/POST /locations/:id` (API); admin venue/POI routes merged into `/neighborhood-admin/neighborhoods/:id/locations*`, gaining a new `PATCH .../locations/:id/kind` switch action (blocked while claimed). Added claim revoke (`POST .../claims/:claimId/revoke`) since approving a claim previously had no way back. No redirects from the old `/venues/:id`/`/pois/:id` URLs (pre-launch). See BACKLOG.md "POIs and venues managed almost the same".

- **2026-07-09** — The marketing homepage moved from `apps/web` into a new `apps/marketing` Next.js app, deployed as its own Netlify site to `tryspored.com` (apps/web becomes `app.tryspored.com`-only). `apps/web`'s `/` is now a client-side redirect to `/account` or `/login` instead of marketing content; `SiteChrome.tsx` (which existed only to hide chrome on that route) was removed and its AccountNav/Footer wiring inlined into `layout.tsx`. `MushroomLogo` and the brand fonts/colors moved into a new shared `packages/ui` package consumed by both apps.
- **2026-07-09** — The "Check in nearby" section (nearest-venue list + `SlideToCheckIn`) moved off `/account` onto a new dedicated `/checkin` page, so checking in doesn't require loading the rest of the account page first. `AccountNav` gained a check-in icon button (signed-in only) to the left of the hamburger menu for quick access; `NearestVenues.tsx` moved from `account/` to `checkin/` alongside it.
- **2026-07-09** — The landing page stub was replaced with a full marketing homepage (hero, how-it-works, leaderboard teaser, neighborhood map, business pitch, final CTA), with its own nav/footer instead of the shared `AccountNav`/`Footer` (`SiteChrome.tsx` swaps chrome based on route). `/neighborhoods` gained a client-side search box and per-card business/member counts, backed by a new `GET /neighborhoods` field (`business_count`, `member_count`) sourced from a new `get_neighborhood_list_counts` Postgres RPC (one grouped query for all neighborhoods, avoiding an N+1 count-per-neighborhood). See `CHANGELOG.md`.
- **2026-07-09** — The landing page (`/`) no longer bundles the full neighborhoods browse/join list and the API health-check widget -- it's now a minimal stub (hero + a link to /neighborhoods), pending a future homepage redesign. `NeighborhoodsSection.tsx` (browse every active neighborhood, join/leave in place) moved as-is to a new `/neighborhoods` index page. See `CHANGELOG.md`.
- **2026-07-09** — The Locations review wizard also reconciles a redrawn neighborhood boundary: every *active* venue/POI whose location no longer falls inside the neighborhood's saved boundary is listed as a "proposed removal," which the admin must explicitly check before it's hidden (never auto-hidden, never deleted — the same `venue.status`/`poi.status = 'hidden'` mechanism as Ref 11/29, so checkin/favorite/point_event history survives). The boundary editor (`boundary/page.tsx`) links into this wizard after a successful save via a "Review changes now" CTA, rather than the `PATCH .../boundary` endpoint itself triggering anything — so a boundary edit never silently changes what's attached to the neighborhood. Completes BACKLOG.md Ref 54 and the last open piece of Ref 29. See `CHANGELOG.md`.
- **2026-07-09** — The Locations tab gained a bulk Places review wizard (`/neighborhood-admin/:slug/locations/review`): an admin-triggered dry-run query against the neighborhood's saved boundary lists candidate places not yet a venue or POI (deduped by `google_place_id` then the same name/location heuristic the real sync uses), and the admin bulk-classifies each as a claimable business, a neighborhood-owned POI, or omits it. Second step of BACKLOG.md Ref 29 — the "removals" step for venues/POIs that fall outside a redrawn boundary (Ref 54) remains open. See `CHANGELOG.md`.
- **2026-07-09** — The Venues tab was replaced by a Locations tab merging venue and POI rows into one list, with a "Claimed" pill for `claimed_by_business` venues. POI management reached parity with venue: `poi` gained a `status` column (hide/restore) plus `created_at`/`updated_at`, and the API gained GET (list-with-search, single), PATCH (edit, status), and DELETE (blocked with 409 if the POI has checkin/point_event/challenge history, since those all cascade-delete). A new `GET /neighborhood-admin/neighborhoods/:id/locations` composes the venue and POI lists for the tab. See `CHANGELOG.md`, BACKLOG.md Ref 29.
- **2026-07-07** — Business claim review and venue-category reassignment folded from global `/admin/claims`/`/admin/venues` (gated only by "admin of *some* neighborhood," no per-neighborhood filter) into `/neighborhood-admin/neighborhoods/:id/{claims,venues}` (properly `neighborhoodAdminGate`-scoped). Web URLs switched from the neighborhood's UUID to its slug (`/neighborhood-admin/[neighborhoodId]` → `/neighborhood-admin/[neighborhoodSlug]`), with a shared `layout.tsx` adding a secondary tab nav (Overview / Business claims / Venue categories). See `CHANGELOG.md`.
