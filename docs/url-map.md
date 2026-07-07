# URL map

Living inventory of every route in `apps/web` and every endpoint in `apps/api`. This is **not** a point-in-time snapshot — keep it current.

> **Update this file whenever a route changes.** Adding, removing, renaming, or re-scoping a web page or API endpoint? Update the matching tree below in the same change. See [CONTRIBUTING.md](../CONTRIBUTING.md)'s workflow step 2 — CLAUDE.md also flags this so it gets checked automatically during AI-assisted changes.

Last reviewed: 2026-07-07 (neighborhood-admin claims/venues tabs + slug URLs, see `CHANGELOG.md`).

## Web app (`apps/web/src/app`, Next.js App Router)

Legend: **P** = public, no auth · **C** = client-side auth check only (soft) · **S** = server-enforced auth (hard gate on the API calls the page makes)

```text
apps/web/src/app/
├── layout.tsx                                    (root layout — wraps every page in AccountNav)
├── page.tsx                                       / — P — landing page, neighborhood list, health check
├── login/page.tsx                                 /login — P
├── signup/page.tsx                                /signup — P
├── auth/callback/page.tsx                         /auth/callback — P (OAuth redirect target, sets session)
├── account/page.tsx                               /account — C — profile, joined neighborhoods, favorites, check-ins
├── profile/
│   └── [username]/page.tsx                        /profile/:username — P — public user profile, neighborhoods, recent check-ins
├── neighborhoods/
│   └── [slug]/page.tsx                            /neighborhoods/:slug — P — public neighborhood profile, venues, events, POIs
├── venues/
│   └── [id]/page.tsx                              /venues/:id — P — venue detail, claim form, favorite/check-in
├── business/
│   ├── page.tsx                                   /business — C — venues this account has claimed
│   └── [venueId]/page.tsx                         /business/:venueId — S (requireVenueOwner) — owner dashboard
├── neighborhood-admin/
│   ├── page.tsx                                    /neighborhood-admin — C — list neighborhoods this account administers
│   └── [neighborhoodSlug]/
│       ├── layout.tsx                              — S (neighborhoodAdminGate on every tab's data calls) — resolves slug→id, tab nav, scope gate
│       ├── page.tsx                                /neighborhood-admin/:slug — Overview tab (description, social links, events, POIs)
│       ├── claims/page.tsx                         /neighborhood-admin/:slug/claims — Business claims tab (approve/reject)
│       └── venues/page.tsx                         /neighborhood-admin/:slug/venues — Venue categories tab (reassign category)
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
├── :slug                                            GET — public — profile (only slug-keyed lookup route)
└── :id/
    ├── events                                        GET — public
    ├── venues                                        GET — public
    ├── join                                            POST, DELETE — auth
    └── home                                            POST — auth

/venues/:id
├── (root)                                            GET — public — detail + enrichment cache
├── photo                                              GET — public
├── announcements                                       GET — public
├── events                                              GET — public
├── claims                                              POST — public (optional auth attaches claimed_by_user_id)
├── checkins                                            POST — public (optional auth)
├── favorites                                            GET, POST, DELETE — mixed (GET public, POST/DELETE auth)
/me/
├── checkins                                          GET — auth
├── favorites                                          GET — auth
├── neighborhoods                                      GET — auth
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
    ├── social-links                                     PATCH — neighborhoodAdmin
    ├── events                                           POST — neighborhoodAdmin
    ├── pois                                             POST — neighborhoodAdmin
    ├── claims                                           GET — neighborhoodAdmin — ?status= filter, venue-joined
    ├── claims/:claimId/approve                          POST — neighborhoodAdmin
    ├── claims/:claimId/reject                           POST — neighborhoodAdmin
    ├── venues                                           GET — neighborhoodAdmin — ?search= filter
    └── venues/:venueId/category                         PATCH — neighborhoodAdmin

/admin/
├── categories                                        GET — admin — assignable leaf categories (global, not neighborhood-owned)
└── category-taxonomy/
    ├── (root)                                          GET, POST — admin
    ├── :id                                              PATCH — admin
    └── :id/archive                                       POST — admin
```

Identifier note: every neighborhood-identifying path param in the API is the **id** (UUID), except the one public `GET /neighborhoods/:slug` lookup — the web app resolves slug→id client-side (via `GET /neighborhood-admin/neighborhoods`) before calling any `:id`-keyed admin route. Venue-identifying params are always **id** (UUID), never slug.

## History

- **2026-07-07** — Business claim review and venue-category reassignment folded from global `/admin/claims`/`/admin/venues` (gated only by "admin of *some* neighborhood," no per-neighborhood filter) into `/neighborhood-admin/neighborhoods/:id/{claims,venues}` (properly `neighborhoodAdminGate`-scoped). Web URLs switched from the neighborhood's UUID to its slug (`/neighborhood-admin/[neighborhoodId]` → `/neighborhood-admin/[neighborhoodSlug]`), with a shared `layout.tsx` adding a secondary tab nav (Overview / Business claims / Venue categories). See `CHANGELOG.md`.
