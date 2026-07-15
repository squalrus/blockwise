# URL map

Living inventory of every route in `apps/web` and every endpoint in `apps/api`. This is **not** a point-in-time snapshot — keep it current.

> **Update this file whenever a route changes.** Adding, removing, renaming, or re-scoping a web page or API endpoint? Update the matching tree below in the same change. See [CONTRIBUTING.md](../CONTRIBUTING.md)'s workflow step 2 — CLAUDE.md also flags this so it gets checked automatically during AI-assisted changes.

Last reviewed: 2026-07-15 (super admin role: bypasses the Reimport Locations cooldown, gates neighborhood creation — see History).

## Web app (`apps/web/src/app`, Next.js App Router)

Legend: **P** = public, no auth · **C** = client-side auth check only (soft) · **S** = server-enforced auth (hard gate on the API calls the page makes)

```text
apps/web/src/app/
├── layout.tsx                                    (root layout — SiteChrome swaps in AccountNav/Footer, or hides them entirely for the admin sidebar shells)
├── SiteChrome.tsx                                 (client component, no route — hides AccountNav/Footer on /admin/neighborhood/:slug/* and /admin/business/:venueId/* routes, which supply their own sidebar shell chrome)
├── AdminSwitcher.tsx                              (shared component, no route — sidebar dropdown listing every neighborhood/business this account administers, used by both admin shells below)
├── StatTile.tsx                                   (shared component, no route — icon/label/value stat tile used by both shells' Overview tabs)
├── robots.ts                                      /robots.txt — P — disallows "/" (auth redirect stub, not real content) and every authenticated/utility route; allows everything else
├── sitemap.ts                                     /sitemap.xml — P — dynamic: every active neighborhood + its active business venues (GET /neighborhoods, GET /neighborhoods/:id/venues); public profiles deliberately excluded (noindex default, see profile/[username])
├── page.tsx                                       / — C — redirects to /account (signed in) or /login (signed out); marketing homepage now lives at tryspored.com (apps/marketing)
├── login/page.tsx                                 /login — P
├── signup/page.tsx                                /signup — P
├── auth/callback/page.tsx                         /auth/callback — P (OAuth redirect target, sets session)
├── account/
│   ├── page.tsx                                    /account — C — profile summary (points/favorite/check-in/neighbor counts), favorites, check-ins, neighbors (add/accept/decline/remove)
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
├── admin/
│   ├── page.tsx                                    /admin — C — single admin entry point (folds the old /business and /neighborhood-admin list pages together): redirects to the first neighborhood you admin, else the first business you own, else shows a "nothing to admin yet" state (become a business owner / create a neighborhood, as applicable)
│   ├── category-taxonomy/page.tsx                  /admin/category-taxonomy — S (requireAdmin) — global category CRUD (unrelated role from neighborhood/business admin below)
│   ├── neighborhood/
│   │   ├── new/page.tsx                                /admin/neighborhood/new — S (POST /admin/neighborhoods, superAdminGate) — create a neighborhood + draw its boundary; client-side redirects non-super-admins to a forbidden message rather than only relying on the API's 403 (BACKLOG.md "super admin")
│   │   ├── BoundaryMap.tsx                             (shared component, no route — Google Maps Drawing Library polygon editor)
│   │   └── [neighborhoodSlug]/
│   │       ├── layout.tsx                              — S (neighborhoodAdminGate on every tab's data calls) — standalone sidebar shell (Ref 31; SiteChrome hides the site's AccountNav/Footer here), resolves slug→id, sidebar nav with location/pending-claim counts, AdminSwitcher for jumping to another neighborhood/business
│   │       ├── page.tsx                                /admin/neighborhood/:slug — Overview tab (stat tiles, description, social links, events)
│   │       ├── boundary/page.tsx                       /admin/neighborhood/:slug/boundary — Boundary tab (draw/edit + dry-run Places preview); a successful save links into the Locations review wizard (Ref 54) rather than reconciling automatically
│   │       ├── claims/page.tsx                         /admin/neighborhood/:slug/claims — Business claims tab (approve/reject/revoke; segmented pending/approved/rejected filter shows real counts)
│   │       ├── locations/page.tsx                      /admin/neighborhood/:slug/locations — Locations tab (merged business+POI list; reassign category, hide/restore, switch kind in place for either kind (BACKLOG.md "POIs and venues managed almost the same"); create/edit/hide/restore/delete for POIs (Ref 29); category-group filter chips with optional subcategory refinement (Ref 56) alongside an All/Businesses/POIs kind toggle and an independent "Show hidden" toggle — hidden rows stay visible in place, dimmed, rather than disappearing or requiring a separate "Hidden" tab; prominent "Reimport Locations" button linking into the review wizard below, disabled with a countdown while the 24h cooldown is active (BACKLOG.md "Reimport Locations"); nav keeps "Locations" highlighted while on the review sub-route too)
│   │       └── locations/review/page.tsx                /admin/neighborhood/:slug/locations/review — bulk Google Places review + boundary reconciliation wizard: admin-triggered query against the saved boundary (rate-limited to once/24h, BACKLOG.md "Reimport Locations"), classify each new candidate as business/POI/omit-imported-hidden (Ref 29), approve removing active locations no longer inside the boundary (status "removed", Ref 54)
│   └── business/
│       └── [venueId]/
│           ├── layout.tsx                              — S (venueOwnerGate) — standalone sidebar shell mirroring admin/neighborhood/[neighborhoodSlug]/layout.tsx, resolves venueId against GET /business/venues, single Overview tab, AdminSwitcher for jumping to another business/neighborhood
│           ├── page.tsx                                /admin/business/:venueId — Overview tab (stat tiles, social links, announcements, events)
│           ├── AnnouncementForm.tsx, EventForm.tsx, SocialLinksForm.tsx    (per-domain authoring forms, parallel to the neighborhood versions under admin/neighborhood/[neighborhoodSlug]/)
│           └── BusinessAdminContext.tsx                (shared component, no route — venueId/name/address context set by layout.tsx)
└── dev/
    └── components/page.tsx                          /dev/components — P (not linked from any nav) — internal component library, pins components (e.g. SlideToCheckIn via previewStatus) to specific states for review without a live backend
```

Identifier note: neighborhoods are addressed by **slug** everywhere in the web app now (`/neighborhoods/:slug`, `/admin/neighborhood/:slug`); locations (business or POI) are addressed by **id** (UUID) everywhere (`/location/:id`, `/admin/business/:venueId`).

## Marketing site (`apps/marketing/src/app`, Next.js App Router)

Deployed separately at `tryspored.com` (apps/web is `app.tryspored.com`). Fully static — no API calls, no auth. Login/signup/neighborhoods/business links point at `apps/web` via an absolute URL (`NEXT_PUBLIC_APP_URL`, see `src/lib/appUrl.ts`).

```text
apps/marketing/src/app/
├── page.tsx                                       / — P — marketing homepage (hero, how-it-works, leaderboard teaser, neighborhood map, business pitch, final CTA)
├── robots.ts                                       /robots.txt — P — allows all, points at /sitemap.xml
├── sitemap.ts                                      /sitemap.xml — P — static route list (home, brand, terms, privacy)
├── MarketingNav.tsx                                (shared component, no route — sticky nav used by every marketing page)
├── MarketingFooter.tsx                              (shared component, no route — footer used by every marketing page, links to Brand/Terms/Privacy)
├── LegalLayout.tsx                                  (shared component, no route — nav/footer shell + heading/section styling for Terms/Privacy)
├── brand/
│   └── page.tsx                                    /brand — P — brand guidelines: logo lockups, four-part mark anatomy, spot pattern library, color palette, favicon/app icon, generated-identity concept, usage do/don't
├── terms/
│   └── page.tsx                                    /terms — P — Terms of Service
└── privacy/
    └── page.tsx                                    /privacy — P — Privacy Policy
```

FAQ and changelog pages are planned but not built yet.

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
├── challenges                                          GET — auth — every challenge this user has completed, across every neighborhood (account page Challenges tab)
├── challenges/active                                   GET — auth — every challenge this user has started (progress_count > 0) but not completed, with live progress, across every neighborhood they belong to, ordered by percent complete descending (account page Challenges tab "in progress" section)
├── profile                                            PATCH — auth — display_name/avatar_style/mushroom_customization/username/visibility (avatar_url is read-only, seeded from OAuth at signup; mushroom_customization is null or an approved {cap,stalk,pattern}, BACKLOG.md Ref 75)
└── connections/
    ├── (root)                                          GET, POST — auth — GET takes ?status= (pending|accepted); POST body is {username}, sends a request (BACKLOG.md Ref 14/33 "Connect with other users" -- a mutual, request-based "neighbor" relationship)
    ├── :id/accept                                      POST — auth — accepts a pending incoming request
    └── :id                                              DELETE — auth — declines a pending incoming request, cancels a pending outgoing one, or removes an accepted connection (always a hard delete)

/badges                                              GET — public — every badge that exists (earned or not), for locked-badge display (BACKLOG.md Ref 61)

/users/:username                                     GET — public — profile (only reachable if visibility = public); checkin_count/favorite_count/neighbor_count/points_summary/avatar_style/mushroom_customization alongside badges/challenges/recent_checkins/neighborhoods

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
    ├── locations/review/status                           GET — neighborhoodAdmin — read-only reimport cooldown status (last_reviewed_at/next_allowed_at/can_run), never touches Google Places (BACKLOG.md "Reimport Locations")
    ├── locations/review                                  GET — neighborhoodAdmin — dry-run Google Places query against the *saved* boundary excluding already-known locations (Ref 29), plus every active location no longer inside that boundary (Ref 54); rate-limited to once per 24h per neighborhood, 429 with next_allowed_at when on cooldown (BACKLOG.md "Reimport Locations")
    └── locations/review/commit                           POST — neighborhoodAdmin — bulk-applies business/POI/omit classifications (omit is persisted as a hidden POI, not skipped) and approved removals (status "removed", distinct from "hidden" — never shown in the Locations tab even with "Show hidden" on) from the review above

/admin/
├── categories                                        GET — admin — assignable leaf categories (global, not neighborhood-owned)
├── neighborhoods                                     POST — super admin — create a neighborhood + boundary (BACKLOG.md Ref 8); creator becomes its admin. Gated to super admin, not just adminGate's "admin of some neighborhood," until the platform is ready to scale (BACKLOG.md "super admin")
├── neighborhoods/preview-boundary                    POST — admin — dry-run Google Places query against a drawn (not-yet-saved) polygon; stays on adminGate (any neighborhood admin) since it's shared with the existing-neighborhood boundary-redraw flow
└── category-taxonomy/
    ├── (root)                                          GET, POST — admin
    ├── :id                                              PATCH — admin
    └── :id/archive                                       POST — admin
```

Identifier note: every neighborhood-identifying path param in the API is the **id** (UUID), except the public `GET /neighborhoods/:slug` family (profile, leaderboard, challenges) — the web app resolves slug→id client-side (via `GET /neighborhood-admin/neighborhoods`) before calling any `:id`-keyed admin route. Location-identifying params (business or POI) are always **id** (UUID), never slug.

## History

- **2026-07-15** — Super admin role (BACKLOG.md): a new rung above `adminGate`'s "admin of at least one neighborhood," implemented the same way as `neighborhood_admin` — a plain grant table (`super_admin`, `user_id` unique, no role column) rather than a boolean column on `app_user`, checked via `SuperAdminRepository.isSuperAdmin` and a new `requireSuperAdmin` gate, granted via a new CLI script (`npm run grant:super-admin -- <email>`, mirroring `grant:admin`). Two effects: (1) `POST /admin/neighborhoods` (creating a brand-new neighborhood) moved from `adminGate` to `superAdminGate` — restricted for now, while the platform is small, not a permanent limitation; the dry-run `preview-boundary` route stays on `adminGate` since it's shared with the existing-neighborhood boundary-redraw flow. `admin/neighborhood/new/page.tsx` gained a client-side super-admin check (forbidden message) rather than only relying on the API's 403; the "+ New neighborhood" entry points (`AdminSwitcher.tsx`, `admin/page.tsx`'s empty state) now gate on `is_super_admin` instead of `is_neighborhood_admin`. (2) A super admin bypasses the 24h "Reimport Locations" cooldown (`getLocationsReviewCooldownStatus` gained a `bypassCooldown` param) on both `GET .../locations/review` and `.../locations/review/status`, while still seeing the real last-reviewed/next-allowed times. New `AppUser.is_super_admin` field, computed the same way as `is_neighborhood_admin` (derived per-request in `toAppUser`, not stored on the user record itself).
- **2026-07-15** — "Reimport Locations" (BACKLOG.md): the Locations tab gained a prominent button linking into the existing bulk Places review wizard, rate-limited to once per 24h per neighborhood (`neighborhood.locations_reviewed_at`, checked and stamped server-side, not just a disabled button — new `GET .../locations/review/status` read-only endpoint backs both pages' cooldown display, and the real `GET .../locations/review` 429s with `next_allowed_at` if called early). The nav's "Locations" tab now stays highlighted on the `/locations/review` sub-route too. Review-commit behavior changed: an "omit" classification is now persisted as a hidden POI (`type: "uncategorized"`) instead of silently skipped, so it reads as already-known on the next review instead of resurfacing forever; an approved boundary-removal now sets a new `venue.status` value, `"removed"` (widened check constraint), instead of `"hidden"` — distinct in that it never appears in the admin Locations tab even with "Show hidden" on, and a `"removed"` row is excluded from `listLocationsForNeighborhood` entirely, so its Google place is treated as brand-new again if a later boundary redraw brings it back inside. This work also fixed a route-ordering bug where `GET .../locations/review` was shadowed by the earlier-registered `GET .../locations/:locationId` (Express matches `:locationId` against the literal string "review" too), and reworked the Places-sync saturated-tile retry (`places/sync.ts`'s `searchTileWithSubdivision`, BACKLOG.md Ref 73) to a fixed 4-way fan-out (`geo.ts`'s `subdivideCircle`) instead of a full coverage grid, after the grid-based version exhausted a real Google Cloud project's `SearchNearbyRequest`-per-minute quota.
- **2026-07-14** — Business admin restyled to match the neighborhood-admin sidebar shell and folded together under a shared `/admin` namespace: `/business` → `/admin/business/:venueId`, `/neighborhood-admin` → `/admin/neighborhood/:slug`. The old plain `/business` and `/neighborhood-admin` list pages were removed outright — an account can administer many neighborhoods *and* own many businesses (independent `AppUser.account_type`/`is_neighborhood_admin` flags), so a single "your list" page no longer made sense. New `/admin` landing page redirects to the first neighborhood you admin, else the first business you own, else shows a "nothing to admin yet" state (the old "Become a business owner"/"No approved claims yet"/"Create a neighborhood" flows, relocated here). New shared `AdminSwitcher.tsx` sidebar dropdown (replacing the old static neighborhood-card link) lists every neighborhood and business the account administers and lets you jump between them without leaving either shell. `admin/business/[venueId]/layout.tsx` mirrors `admin/neighborhood/[neighborhoodSlug]/layout.tsx`'s gating/sidebar/top-bar structure; its Overview tab was restyled onto the same `StatTile.tsx` (newly extracted, shared) and `rounded-3xl` card treatment as the neighborhood Overview tab. `AccountNav`'s two menu items ("Business portal", "Neighborhood admin") collapsed into one "Admin" link. `apps/api`'s `/business/*` and `/neighborhood-admin/*` route namespaces are unchanged — only the web app's page paths moved.
- **2026-07-14** — Account page Challenges tab gained an "in progress" section listing challenges the user has started (progress_count > 0) but not finished, with live progress bars, ordered by percent complete descending, across every neighborhood they belong to, mirroring the per-neighborhood progress already shown on `/neighborhoods/:slug/challenges`. New `GET /me/challenges/active` (`getUserActiveChallenges`, `apps/api/src/gamification/challenges.ts`) loops the user's neighborhood memberships through the existing `listChallengesWithProgress`, filtering to `!completed && progress_count > 0` -- otherwise every active challenge template in every joined neighborhood would show up regardless of whether the user has engaged with it at all. `UserChallengeProgress` (`@blockwise/types`) is `ChallengeProgress` plus `neighborhood_name`. Building this also surfaced and fixed a pre-existing bug in `listChallengesWithProgress`: a challenge only ever completed as a side effect of a *new* check-in (`evaluateChallengesAfterCheckin`), so a check-in that already satisfied a challenge's target before that challenge was ever evaluated against it (e.g. the challenge template was added after the check-in happened) showed 100% progress forever without ever completing -- no points, no badge. `listChallengesWithProgress` now self-heals: if live progress already meets the target and there's no completion row yet, it completes the challenge right there (same `completeChallenge` call/points/badge as a real check-in would trigger), affecting both this new endpoint and the existing `/neighborhoods/:slug/challenges`. `/neighborhoods/:slug/challenges`'s `ChallengesView.tsx` also picked up the same In progress (percent-complete descending) / Completed grouping as the account page, plus a third Not-started group for challenges with no progress yet -- unlike the account page, this browsing view doesn't hide untouched challenges. Separately, found and fixed a related race in `awardCheckinRewards` (`apps/api/src/gamification/rewards.ts`): challenge-completion and badge-rule evaluation used to run via `Promise.all`, so `evaluateBadgesAfterCheckin`'s single `getUserPointsTotal` snapshot could be taken before a same-check-in challenge-completion bonus committed, silently missing a `level_reached` badge that check-in should have earned (no self-heal on read for badges -- only a later check-in would catch it, if one ever came). Challenge evaluation now runs to completion before badge evaluation starts.
- **2026-07-14** — Added an easter-egg badge, "Everybody's Neighbor" (`squalrus_connection`), awarded via `awardSqualrusConnectionBadge` (`apps/api/src/gamification/squalrusBadge.ts`) for connecting with `@squalrus` -- referencing Tom, everyone's default first friend on Myspace. Awarded one-off (mirroring `founderBadge.ts`'s pattern, not the generic `badge_rule` engine, since it's keyed to one specific username) from `awardNeighborConnectionRewardsForBothSides` in `app.ts` whenever either side of a newly-accepted connection is `@squalrus`. Separately, the "Founder" badge was renamed to "Early Sprout" (matching its seedling icon) and its description's stale "Blockwise" mention corrected to "Spored" -- both via a new migration updating the already-seeded row (`20260714040000_founder_badge_spored_rename.sql`).
- **2026-07-13** — Neighborhood-admin dashboard (`/neighborhood-admin/:slug/*`) redesigned as a standalone sidebar shell (BACKLOG.md Ref 31 "SimCity-style redesign"), imported from a Claude Design mockup ("Spored Admin"). `SiteChrome.tsx` (recreated — the original of the same name was removed 2026-07-09, this is a new, unrelated use) now hides the site's AccountNav/Footer on these routes since the new `[neighborhoodSlug]/layout.tsx` supplies its own dark sidebar nav (Overview/Boundary/Locations/Business claims, with real location and pending-claim counts), neighborhood switcher card, and top-bar user chip. Visual-only within the existing four tabs — no new schema, API routes, or DB changes — except for small, purely client-side additions folded in since the Locations tab's markup was being touched anyway (BACKLOG.md Ref 56): category-group filter chips (with an optional second-level subcategory row once a group is selected), and hidden-row visibility split into its own "Show hidden" toggle (defaults on) independent of the All/Businesses/POIs kind toggle, rather than a mutually-exclusive 4th "Hidden" option — hiding a location now leaves its row in place (dimmed, "Hidden" badge) under whichever kind filter is active rather than removing it from the list the admin just acted on. Overview's stat tiles and the Locations/Business-claims sidebar badges reuse existing endpoints (`GET /neighborhoods/:slug`'s public profile counts, `GET .../claims?status=pending`) rather than adding new ones. `apps/web` gained the `jetbrains-mono` font (already used on the marketing brand page) wired into the root layout and a `font-mono` Tailwind utility for the new mono-styled labels. The Boundary tab's map now `fitBounds()`s to the saved polygon on load instead of a fixed zoom, so a large boundary isn't cut off. Deliberately scoped down from the full mockup: no admin-invite UI, no challenge-launch UI, no Events tab split, no real interactive map on Locations — all would need new backend work and were left for a future item (BACKLOG.md Refs 76-79).
- **2026-07-13** — SEO pass (BACKLOG.md Ref 67/70): both apps gained `robots.ts`/`sitemap.ts` (apps/marketing's is a static route list; apps/web's is dynamic, covering active neighborhoods + active business venues, deliberately excluding public profiles), `metadataBase`/OpenGraph/Twitter defaults on both root layouts, and per-page `generateMetadata` on apps/web's dynamic public pages (`neighborhoods/[slug]/*`, `location/[id]`, `profile/[username]`, `neighborhoods`) — profile pages default to `noindex,follow` since most of their content is gated behind a neighbor connection. `location/[id]` also gained `LocalBusiness` JSON-LD for business-kind locations, and the marketing homepage gained `Organization` JSON-LD. New `apps/marketing/terms` and `apps/marketing/privacy` static pages (BACKLOG.md Ref 63/64), linked from `MarketingFooter.tsx`, sharing a new `LegalLayout.tsx` shell.
- **2026-07-12** — Public profile pages (`/profile/:username`) now gate everything below the summary card (badges, neighborhoods, recent check-ins) behind an accepted neighbor connection (or viewing your own profile) via a new client-side `ProfileDetails` wrapper -- a non-neighbor sees just the summary card plus a one-line hint to add the person as a neighbor. Badges and challenges each collapse to just the *latest* one, rendered full-width in the same row style as `/account`'s Badges/Challenges tabs, rather than the old wrapped icon grid / a bare count. `GET /users/:username` gained a `challenges: UserChallenge[]` field (full list, mirroring `badges`) in place of the old `challenges_summary` count-only field.
- **2026-07-12** — `/account` and the neighborhood profile pages (`/neighborhoods/:slug*`) now share a `TabNav` secondary-nav component (`apps/web/src/app/TabNav.tsx`): a horizontally-scrollable, mobile-friendly pill bar sticky under the main nav. `NeighborhoodTabs` was refactored to render through it (still route-driven via `getHref`); `/account` gained its own in-page tab state (`onSelect`) switching between Favorites/Check-ins/Badges/Challenges/Neighbors sections, replacing the old single long stacked list (`ProfileSummaryCard`'s stat tiles are plain again, no longer links/tabs). New `GET /me/challenges` backs the account page's Challenges tab.
- **2026-07-12** — Added a mutual, request-based "neighbor" connection between two accounts (BACKLOG.md Ref 14/33 "Connect with other users" / "Friends/neighbors on profile"; "neighbor" is deliberate neighborhood-flavored language in place of "friend"). New `user_connection` table (`requester_id`/`recipient_id`/`status: pending|accepted`) and `POST/GET /me/connections`, `POST /me/connections/:id/accept`, `DELETE /me/connections/:id` (the last handles decline/cancel/remove uniformly as a hard delete). If two users each already have a pending request out to the other, the second request auto-accepts instead of leaving two pending rows. `GET /users/:username` gained `neighbor_count` (a plain count, like `favorite_count` -- the connections themselves stay private to the two parties). `/account` gained a Neighbors section (add by username, accept/decline/cancel/remove) and `ProfileSummaryCard` gained a 6th stat tile.
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
