# URL map

Living inventory of every route in `apps/web` and every endpoint in `apps/api`. This is **not** a point-in-time snapshot — keep it current.

> **Update this file whenever a route changes.** Adding, removing, renaming, or re-scoping a web page or API endpoint? Update the matching tree below in the same change. See [CONTRIBUTING.md](../CONTRIBUTING.md)'s workflow step 2 — CLAUDE.md also flags this so it gets checked automatically during AI-assisted changes.

Last reviewed: 2026-07-09 (Landing page split into a stub homepage and a dedicated /neighborhoods browse page).

## Web app (`apps/web/src/app`, Next.js App Router)

Legend: **P** = public, no auth · **C** = client-side auth check only (soft) · **S** = server-enforced auth (hard gate on the API calls the page makes)

```text
apps/web/src/app/
├── layout.tsx                                    (root layout — wraps every page in AccountNav)
├── page.tsx                                       / — P — landing page stub (hero, link to /neighborhoods)
├── login/page.tsx                                 /login — P
├── signup/page.tsx                                /signup — P
├── auth/callback/page.tsx                         /auth/callback — P (OAuth redirect target, sets session)
├── account/
│   ├── page.tsx                                    /account — C — profile summary (points/favorite/check-in counts), nearest-venue check-in, favorites, check-ins
│   └── settings/page.tsx                           /account/settings — C — profile editing, account details, joined neighborhoods (home-neighborhood picker)
├── profile/
│   └── [username]/page.tsx                        /profile/:username — P — public user profile, neighborhoods, recent check-ins
├── neighborhoods/
│   ├── page.tsx                                    /neighborhoods — P — browse/join every active neighborhood (NeighborhoodsSection, split off the landing page)
│   └── [slug]/
│       ├── layout.tsx                              — P — shared header (description, social links, join button), subnav tab bar
│       ├── page.tsx                                /neighborhoods/:slug — Leaderboard tab (default)
│       ├── challenges/page.tsx                     /neighborhoods/:slug/challenges — Challenges tab
│       ├── events/page.tsx                         /neighborhoods/:slug/events — Upcoming events tab
│       ├── pois/page.tsx                           /neighborhoods/:slug/pois — Points of interest tab
│       └── venues/page.tsx                         /neighborhoods/:slug/venues — Venues tab (list/map toggle)
├── venues/
│   └── [id]/page.tsx                              /venues/:id — P — venue detail, claim form, favorite/check-in
├── pois/
│   └── [id]/page.tsx                              /pois/:id — P — POI detail, check-in (BACKLOG.md Ref 46)
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
│       ├── claims/page.tsx                         /neighborhood-admin/:slug/claims — Business claims tab (approve/reject)
│       ├── locations/page.tsx                      /neighborhood-admin/:slug/locations — Locations tab (merged venue+POI list; reassign category, hide/restore/convert-to-POI for venues (BACKLOG.md Ref 11); create/edit/hide/restore/delete for POIs (Ref 29))
│       └── locations/review/page.tsx                /neighborhood-admin/:slug/locations/review — bulk Google Places review + boundary reconciliation wizard: admin-triggered query against the saved boundary, classify each new candidate as business/POI/omit (Ref 29), approve hiding active venues/POIs no longer inside the boundary (Ref 54)
└── admin/
    └── category-taxonomy/page.tsx                  /admin/category-taxonomy — S (requireAdmin) — global category CRUD
```

Identifier note: neighborhoods are addressed by **slug** everywhere in the web app now (`/neighborhoods/:slug`, `/neighborhood-admin/:slug`); venues are addressed by **id** (UUID) everywhere (`/venues/:id`, `/business/:venueId`).

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

/neighborhoods                                       GET — public — list, joined-flag if authed
├── :slug/
│   ├── (root)                                        GET — public — profile
│   ├── leaderboard                                   GET — public — points leaderboard, public-visibility users only
│   └── challenges                                    GET — public (optional auth) — challenge templates + this user's progress
└── :id/
    ├── events                                        GET — public
    ├── venues                                        GET — public
    ├── join                                            POST, DELETE — auth
    └── home                                            POST — auth

/venues/:id
├── (root)                                            GET — public — detail + enrichment cache
├── photo                                              GET — public — ?index= selects among cached photos (default 0)
├── announcements                                       GET — public
├── events                                              GET — public
├── claims                                              POST — public (optional auth attaches claimed_by_user_id)
├── checkins                                            POST — public (optional auth) — awards check-in points/challenge progress
├── favorites                                            GET, POST, DELETE — mixed (GET public, POST/DELETE auth) — POST awards first-time favorite points

/pois/:id/
├── (root)                                            GET — public — detail (BACKLOG.md Ref 46)
└── checkins                                          POST — public (optional auth) — POI check-in, same geofence/cooldown as venue check-in

/me/
├── checkins                                          GET — auth
├── favorites                                          GET — auth
├── neighborhoods                                      GET — auth
├── points                                              GET — auth — all-time, all-neighborhood points total
└── profile                                            PATCH — auth — display_name/avatar_url/username/visibility

/users/:username                                     GET — public — profile (only reachable if visibility = public)

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
    ├── pois                                             GET, POST — neighborhoodAdmin — GET takes ?search=
    ├── pois/:poiId                                       GET, PATCH, DELETE — neighborhoodAdmin — DELETE is 409 if checkin/point_event/challenge history exists (BACKLOG.md Ref 29)
    ├── pois/:poiId/status                                PATCH — neighborhoodAdmin — active|hidden (BACKLOG.md Ref 29)
    ├── claims                                           GET — neighborhoodAdmin — ?status= filter, venue-joined
    ├── claims/:claimId/approve                          POST — neighborhoodAdmin
    ├── claims/:claimId/reject                           POST — neighborhoodAdmin
    ├── venues                                           GET — neighborhoodAdmin — ?search= filter
    ├── venues/:venueId/category                         PATCH — neighborhoodAdmin
    ├── venues/:venueId/status                           PATCH — neighborhoodAdmin — active|hidden (BACKLOG.md Ref 11)
    ├── locations                                         GET — neighborhoodAdmin — ?search= filter, merged read-only venue+POI list backing the Locations tab (BACKLOG.md Ref 29)
    ├── locations/review                                  GET — neighborhoodAdmin — dry-run Google Places query against the *saved* boundary excluding already-known venues/POIs (Ref 29), plus every active venue/POI no longer inside that boundary (Ref 54)
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

Identifier note: every neighborhood-identifying path param in the API is the **id** (UUID), except the public `GET /neighborhoods/:slug` family (profile, leaderboard, challenges) — the web app resolves slug→id client-side (via `GET /neighborhood-admin/neighborhoods`) before calling any `:id`-keyed admin route. Venue-identifying params are always **id** (UUID), never slug.

## History

- **2026-07-09** — The landing page (`/`) no longer bundles the full neighborhoods browse/join list and the API health-check widget -- it's now a minimal stub (hero + a link to /neighborhoods), pending a future homepage redesign. `NeighborhoodsSection.tsx` (browse every active neighborhood, join/leave in place) moved as-is to a new `/neighborhoods` index page. See `CHANGELOG.md`.
- **2026-07-09** — The Locations review wizard also reconciles a redrawn neighborhood boundary: every *active* venue/POI whose location no longer falls inside the neighborhood's saved boundary is listed as a "proposed removal," which the admin must explicitly check before it's hidden (never auto-hidden, never deleted — the same `venue.status`/`poi.status = 'hidden'` mechanism as Ref 11/29, so checkin/favorite/point_event history survives). The boundary editor (`boundary/page.tsx`) links into this wizard after a successful save via a "Review changes now" CTA, rather than the `PATCH .../boundary` endpoint itself triggering anything — so a boundary edit never silently changes what's attached to the neighborhood. Completes BACKLOG.md Ref 54 and the last open piece of Ref 29. See `CHANGELOG.md`.
- **2026-07-09** — The Locations tab gained a bulk Places review wizard (`/neighborhood-admin/:slug/locations/review`): an admin-triggered dry-run query against the neighborhood's saved boundary lists candidate places not yet a venue or POI (deduped by `google_place_id` then the same name/location heuristic the real sync uses), and the admin bulk-classifies each as a claimable business, a neighborhood-owned POI, or omits it. Second step of BACKLOG.md Ref 29 — the "removals" step for venues/POIs that fall outside a redrawn boundary (Ref 54) remains open. See `CHANGELOG.md`.
- **2026-07-09** — The Venues tab was replaced by a Locations tab merging venue and POI rows into one list, with a "Claimed" pill for `claimed_by_business` venues. POI management reached parity with venue: `poi` gained a `status` column (hide/restore) plus `created_at`/`updated_at`, and the API gained GET (list-with-search, single), PATCH (edit, status), and DELETE (blocked with 409 if the POI has checkin/point_event/challenge history, since those all cascade-delete). A new `GET /neighborhood-admin/neighborhoods/:id/locations` composes the venue and POI lists for the tab. See `CHANGELOG.md`, BACKLOG.md Ref 29.
- **2026-07-07** — Business claim review and venue-category reassignment folded from global `/admin/claims`/`/admin/venues` (gated only by "admin of *some* neighborhood," no per-neighborhood filter) into `/neighborhood-admin/neighborhoods/:id/{claims,venues}` (properly `neighborhoodAdminGate`-scoped). Web URLs switched from the neighborhood's UUID to its slug (`/neighborhood-admin/[neighborhoodId]` → `/neighborhood-admin/[neighborhoodSlug]`), with a shared `layout.tsx` adding a secondary tab nav (Overview / Business claims / Venue categories). See `CHANGELOG.md`.
