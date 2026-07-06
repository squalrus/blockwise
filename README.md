# Hyperlocal Neighborhood App — Build Plan

A neighborhood discovery app combining sourced business data with check-ins, business announcements, challenges, and gamified badges.

## Project status

This repo is moving from planning into implementation. **The web app is being built first**, for rapid iteration on the data layer and API while the product surface is still settling; the native mobile apps (React Native, §9) follow shortly after, sharing the same backend and data model rather than lagging by a long margin. See [§10](#10-web-app-building-first) for what that means for the web stack, and [§8](#8-suggested-build-order) for the phase order both platforms share.

- Planned work is tracked in [BACKLOG.md](./BACKLOG.md).
- Shipped changes are logged in [CHANGELOG.md](./CHANGELOG.md).
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to propose and land changes.

---

## 1. Data Layer (Primary Focus)

The data layer is the foundation everything else depends on. Get the ingestion, licensing, and schema right first — retrofitting it later is expensive.

### 1.1 Licensing constraints (read this before writing any code)

**Yelp Fusion API**
- You may **not cache/store Yelp Content for more than 24 hours**, with two exceptions: Yelp **business IDs** may be stored indefinitely for back-end matching, and non-commercial analysis has narrow carve-outs.
- You **cannot use Yelp data to build your own persistent database** of business listings — names, addresses, ratings, etc. must be re-fetched or expired every 24 hours.
- Commercial analysis of Yelp API content is explicitly **not permitted**.
- Rate limits are traffic-based: new apps start with a low daily quota and must email Yelp to request more, typically after launch traffic justifies it.
- **Design implication:** Yelp can't be your system of record. Use it as a live "enrichment" layer (ratings, review snippets, photos fetched on-demand or refreshed daily) while your own database owns the durable business record (name, address, category, geo, hours) sourced elsewhere or entered by the business itself.

**Google Places API**
- No 24-hour deletion rule like Yelp, but billing is **per-SKU and field-mask driven**: Basic fields (name, address, geo, category, open/closed) are cheapest; Contact fields (phone, hours, website) and Atmosphere fields (ratings, reviews, price level) cost significantly more per 1,000 calls.
- Pricing is pay-as-you-go with a monthly credit; overuse of broad field masks ("just grab everything") is the single most common cause of runaway bills — always request the minimum field set for the use case.
- Practical takeaway: use **Basic Data fields** for your core sync (name/address/geo/category/status) and only pull Contact/Atmosphere fields lazily (e.g., when a user opens a business detail page), caching the result.

**Bottom line for architecture:** your database should be the source of truth for identity, category, and geo — populated once from Google Basic fields plus manual/business-submitted data — while Yelp and Google's richer fields (reviews, ratings, hours, photos) are treated as a refreshable cache with defined TTLs, never a permanent copy.

### 1.2 Data sources & what each contributes

| Source | Use for | Refresh strategy |
|---|---|---|
| Google Places API | Canonical POI discovery, geo, basic category, open/closed status | One-time/periodic sync (weekly) using Basic Data field mask |
| Yelp Fusion API | Ratings, review snippets, photos, price tier | Fetch on-demand or refresh ≤24h, never persisted past that window |
| Business self-submission | Hours, description, sub-venue/POI structure, announcements | Real-time, owned entirely by you |
| Manual/admin curation | Category corrections, neighborhood-specific tagging, duplicate resolution | Ongoing, admin tool |
| OpenStreetMap (optional, no licensing friction) | Backup/supplement geo data, especially for smaller or informal venues Google/Yelp miss | Periodic batch import (ODbL attribution required) |

### 1.3 Core data model (initial schema sketch)

```
Neighborhood                     -- the tenant boundary; see §12
  id
  name                            -- e.g. "Phinneywood"
  slug                             -- e.g. "phinneywood-seattle"
  city, state, country
  timezone                        -- e.g. America/Los_Angeles
  boundary_geojson                -- polygon defining the neighborhood extent
  center_lat, center_lng          -- default map center
  status ('onboarding' | 'active') -- gates visibility while data is still being seeded
  created_at

Venue
  id (internal, primary key)
  google_place_id
  yelp_business_id        -- store only the ID, per Yelp ToS
  name
  category_id -> Category
  lat, lng
  address
  neighborhood_id -> Neighborhood
  claimed_by_business (bool)
  created_at, updated_at

Category
  id
  name
  parent_category_id      -- supports hierarchy (e.g. Food > Coffee Shop)
  source_mapping_json      -- how Google/Yelp category strings map here

POI (point of interest within a venue)
  id
  venue_id -> Venue
  name
  description
  type (stall, department, room, etc.)

VenueEnrichmentCache        -- the "24-hour" Yelp-governed table
  venue_id -> Venue
  source ('yelp' | 'google')
  rating, review_snippet, price_tier, photo_url
  fetched_at               -- used to enforce TTL / expiry
```

Keeping `VenueEnrichmentCache` as a separate, TTL-governed table (rather than mixing Yelp fields into the core `Venue` record) makes the 24-hour compliance rule mechanical: a scheduled job purges/refreshes rows older than 24 hours, and nothing else in the schema needs to know about it.

### 1.4 Ingestion pipeline

1. **Seed sync (Google Places, Basic fields only):** batch-query the neighborhood's bounding box, upsert into `Venue` by `google_place_id`.
2. **Dedup pass:** fuzzy-match new venues against existing records (name similarity + geo proximity, e.g. Levenshtein + haversine distance under ~30m) to catch the same business appearing under slightly different names.
3. **Category normalization:** map Google's `types[]` and (if fetched) Yelp's category aliases into your own `Category` taxonomy via a lookup table; flag unmapped types for manual review rather than guessing.
4. **Enrichment on-demand:** when a user opens a venue detail page, check `VenueEnrichmentCache`; if stale (>24h for Yelp, configurable for Google Contact/Atmosphere fields), refresh from the API and rewrite the cache row.
5. **Business claiming overrides source data:** once a business claims its listing, business-submitted hours/description/photos take precedence over API-sourced fields for anything the business explicitly edits.

### 1.5 Cost & quota management

- Always specify Google **field masks**; never request an unrestricted field set.
- Batch Google syncs weekly rather than per-request; a neighborhood's venue set doesn't change fast enough to justify real-time polling.
- Track Yelp daily call volume against your granted quota; request an increase from Yelp only once real usage data justifies it (they explicitly ask new apps to start small).
- Log per-source spend (Google) and per-source call count (Yelp) from week one — this is the easiest place for a small hyperlocal project to unexpectedly blow a budget.

### 1.6 Attribution & compliance checklist

- [ ] Display "Powered by Google" / Google attribution per Maps Platform terms
- [ ] Display Yelp logo/attribution per Yelp Fusion display requirements
- [ ] Enforce the 24-hour Yelp content TTL programmatically, not by convention
- [ ] Never expose raw Yelp review ratings alongside non-Yelp user-generated ratings in the same UI element (ToS restriction)
- [ ] If using OpenStreetMap, include ODbL attribution

---

## 1.7 Map Display

Map *display* is billed and licensed separately from the Places/Yelp *data* APIs — don't assume the data-source choice locks you into a matching map renderer.

### Recommendation: Google Maps SDK for Android/iOS (native mobile)

- The **Maps SDK for Android and Maps SDK for iOS are free with unlimited usage** — this is distinct from the Places API and Maps JavaScript API, which are metered. If you're building React Native/Flutter, this maps to `react-native-maps` (Google provider) or Flutter's `google_maps_flutter`.
- Since venue data is already sourced from Google Places, using Google's map keeps coordinate systems, place IDs, and attribution consistent — no reconciliation needed between "where Google thinks the venue is" and "where the map renders it."
- You already need Google Maps Platform billing enabled for Places API, so there's no new account/billing setup — just enable the additional SDK.
- Cost implication for this project: **$0**, regardless of the neighborhood app's user count — mobile map loads aren't billed at all, only the data APIs (Places, Directions, etc.) layered on top of the map are.

### What this looks like in practice

- Render the base map with the native SDK.
- Populate markers/pins from your own `Venue` table (not by re-querying Google live) — the map is just a rendering layer over data you've already synced and normalized.
- Cluster markers at neighborhood zoom levels once venue density (plus POIs) gets high, to avoid a cluttered pin field.
- Use marker color/icon per `Category` for at-a-glance scanning.
- Tapping a marker opens the venue detail view already described in the data layer (with the TTL-governed enrichment cache) — no additional Places calls triggered by the map itself.

### When to consider alternatives instead

| Scenario | Alternative | Why |
|---|---|---|
| Want a **web app** version, not just mobile | Maps JavaScript API (metered, ~10,000 free loads/month under Essentials) or Mapbox GL JS (50,000 free web loads/month) | Google's *web* map SDK is billed, unlike the mobile SDKs |
| Want full styling control / custom cartography / avoid Google branding | Mapbox or MapLibre GL (open-source fork) with vector tiles | More design flexibility; Mapbox has a generous free tier, MapLibre + self-hosted OSM tiles can be fully free |
| Want to minimize dependency on Google entirely (data + map) | MapLibre GL + OpenStreetMap tiles, with venue data sourced from OSM/business submissions instead of Google Places | Removes Google Places licensing/cost considerations entirely, at the cost of lower POI coverage/freshness than Google |
| Need turn-by-turn navigation or routing overlays | Routes API (Google) or Mapbox Directions | Neither mobile Maps SDK includes routing — that's a separate, metered API either way |

**For this project at its current scale (70 businesses, one neighborhood, mobile-first):** the free, unlimited native Google Maps SDK is the clear choice — it costs nothing, matches your existing Places-sourced data, and there's no reason to introduce a second mapping vendor until/unless you need web support or want to reduce Google dependency for other reasons.

---

### 1.8 Monetization-related schema (extends §1.3)

Supporting a free-sample-then-credits model requires a couple of additions to the core schema — an explicit `Event` type (distinct from a one-off `Announcement`), and an entitlement table that tracks each claimed business's one-time free sample. (Credit balances, purchases, and spend are a separate set of tables — see §11.3 — since credits are a general-purpose currency rather than tied to any one resource type.)

```
BusinessPlan
  id
  venue_id -> Venue (one-to-one with a claimed venue)
  billing_customer_id            -- e.g. Stripe customer ID, for credit-pack purchases (§11.3)
  created_at

Entitlement                       -- one row per resource type per plan — tracks the free sample only
  id
  business_plan_id -> BusinessPlan
  resource_type ('poi' | 'event' | 'announcement')
  included_quota                  -- e.g. 1, granted once on claiming, never resets
  used_count                      -- 0 or 1; once used, further creates draw on credits (§11.3) instead

Announcement
  id
  venue_id -> Venue
  title, body
  created_at
  published (bool)

Event
  id
  venue_id -> Venue
  title, description
  start_time, end_time
  created_at
```

Keeping `Entitlement` generic (one row per resource type) rather than hardcoding "1 free POI" into application logic means adjusting the free sample size or adding a new gated resource type later (e.g., a fourth freebie) is a data change, not a code change.

---

## 2. Layer: Categorization

- Unified taxonomy (~30–50 categories) sitting on top of Google's `types[]` and Yelp's category aliases.
- Mapping table (`source_mapping_json` above) is the single place both sources normalize into — makes adding a third source later trivial.
- Manual override capability in the admin tool for anything auto-mapped incorrectly.

## 3. Layer: Points of Interest Within Venues

- Not available from Google/Yelp — this is first-party data.
- Modeled as child `POI` records under a `Venue` (see schema above).
- Populated via business self-service tool or admin curation for high-value venues (markets, malls, food halls) early on.

## 4. Layer: Check-ins

- Phase 1: GPS geofence check-in (radius check against `Venue.lat/lng`).
- Phase 2: QR code check-in — each `Venue`/`POI` gets a generated code linking to a signed check-in URL; solves GPS accuracy issues for venues with multiple POIs.
- Add cooldown logic (e.g., one check-in per venue per 4–6 hours) to prevent gaming streaks/badges.

## 5. Layer: Business Announcements

- Requires business account claiming: verify via phone/email tied to the listing, or domain verification.
- Claimed businesses get a lightweight posting tool; announcements feed to followers via push notification.
- Basic moderation queue before wide launch.

## 6. Layer: Challenges

- Template-driven: "visit N venues in category X within Y days" style templates, parameterized rather than hand-authored per challenge.
- Daily/weekly/monthly cadence configured per template.
- Reads directly off `Venue`/`Category`/check-in tables — no new core data needed.

## 7. Layer: Gamification (Badges & Points)

- Points awarded on check-in and challenge completion.
- Badge types: milestone (first check-in), exploration (one check-in per category), streak-based.
- Leaderboards should be opt-in and neighborhood-scoped, not global, for privacy.

---

## 8. Suggested Build Order

These phases are platform-agnostic, but are being implemented against the **web app first** (§10); the native apps (§9) pick up each phase shortly after it lands on web, against the same backend/API rather than re-deriving it.

1. **Data layer MVP:** Google Basic-field sync + dedup + categorization + Postgres/PostGIS schema
2. Venue detail pages with on-demand Yelp enrichment (TTL-compliant cache)
3. Business claiming + GPS check-in
4. Business announcements
5. Challenges + badges/points
6. QR check-in + POI-within-venue curation + leaderboards

## 9. Suggested Stack

- **Database:** PostgreSQL + PostGIS via **Supabase** (managed, includes Auth and Storage — see §10.2)
- **Backend jobs:** **Netlify Scheduled Functions** (Node, cron syntax in `netlify.toml`) for weekly Google sync and Yelp cache TTL enforcement — no separate worker host needed at current scale
- **Mobile:** React Native or Flutter
- **Web:** Next.js (React) — see §10
- **Map rendering:** Google Maps SDK (native mobile, free/unlimited) + Mapbox GL JS or Maps JavaScript API (web, metered) — see §1.7 and §10
- **Business portal:** part of the same web app (§10), gated behind business-account auth rather than a separate codebase

---

## 10. Web App (Building First)

The web app is the first client built, for rapid iteration on the data layer and API while the product surface is still settling — see [Project status](#project-status). The native apps (§9) follow shortly after, reusing the same backend and data model, as long as the backend is designed API-first from day one (which the data layer above already assumes). The two clients share almost everything except the UI layer.

### 10.1 What the web app is for

- Full consumer experience: browse venues/map, view announcements, join challenges, see badges — not just a stripped-down companion site.
- The **business portal** (claiming a listing, posting announcements, viewing check-in stats) lives here too — businesses managing a listing are far more likely to do it from a desktop browser than a phone.
- SEO/discovery surface: individual venue pages are indexable, which native apps can't offer — this becomes a real acquisition channel for a neighborhood app (e.g., "best coffee shops in [neighborhood]" ranking).

### 10.2 Recommended web stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (React, TypeScript)** | Server-side rendering/static generation for SEO on venue pages; same React mental model as React Native if you go that route for mobile, easing code/knowledge sharing |
| Styling | Tailwind CSS | Fast to build with, easy to keep consistent with a design system shared across web/mobile |
| Map | **Mapbox GL JS** (50,000 free web loads/month) or **Google Maps JavaScript API** (Essentials tier, ~10,000 free loads/month) | The free *mobile* Google Maps SDK doesn't extend to web — web map loads are metered on both providers, so pick based on styling needs (Mapbox) vs. data consistency with your Places-sourced venues (Google) |
| Data fetching | React Query (TanStack Query) | Caching/invalidation on the client, mirrors the TTL-based caching approach already used server-side for Yelp/Google enrichment |
| Database + Auth | **Supabase** (Postgres + PostGIS extension, Auth, Storage) | Managed Postgres with PostGIS built in satisfies §9's geo requirement directly; Supabase Auth (email/phone/social) is usable by both web and mobile clients, so no separate auth service is needed |
| Push/notifications (web) | Web Push API for announcement alerts | Parallels mobile push without a separate vendor if you use a cross-platform push provider (e.g., OneSignal, Firebase Cloud Messaging) |
| Check-in on web | Browser Geolocation API for GPS check-in; `getUserMedia` for QR scanning via webcam | Full check-in parity with mobile, no native-only dependency |
| Hosting | **Netlify** (official Next.js runtime for `apps/web`; `apps/api`'s Express app wrapped with `serverless-http` and deployed as a Netlify Function) | Native Next.js support with PR preview deploys, same as Vercel, and keeps the backend on the same platform rather than standing up separate container infra |

### 10.3 Sharing code between web and mobile

The goal is one backend, one data model, and as much shared logic as practical — only the rendering layer differs.

- **Monorepo** (Turborepo or Nx) containing:
  - `apps/mobile` — React Native app
  - `apps/web` — Next.js app
  - `apps/api` — backend service
  - `packages/api-client` — typed client (e.g., generated from OpenAPI or tRPC) used by both frontends
  - `packages/types` — shared TypeScript types for `Venue`, `Category`, `Challenge`, `Badge`, etc. (mirroring the schema in §1.3)
  - `packages/ui` (optional, more advanced) — shared design tokens/logic if using React Native Web to unify some components
- Backend stays a single API-first service (REST or GraphQL) — nothing about the data layer in §1 changes; both web and mobile just become two more consumers of the same `Venue`/`POI`/`VenueEnrichmentCache` tables.
- Business logic that shouldn't be duplicated (challenge progress calculation, badge-award rules, check-in cooldown logic) lives server-side, not in either client — keeps web and mobile from drifting out of sync on gamification rules.

### 10.4 Build pipeline / CI-CD

**Repo & branching**
- Monorepo as above; trunk-based development with short-lived feature branches and PR review before merge to `main`.
- `main` auto-deploys to staging; production deploys are a manual promote/tag step.

**CI (on every PR)**
- Lint + typecheck (shared `packages/types` catches drift between web/mobile/backend early)
- Unit tests per app
- Web: Playwright end-to-end tests against a preview deployment
- Mobile: Detox or Maestro for critical-path E2E (check-in flow, challenge join)
- Backend: integration tests against a test database, including the Yelp-cache TTL enforcement job

**CD**
- **Web:** GitHub Actions → Netlify (official `@netlify/plugin-nextjs` runtime) — deploy previews per PR are especially useful for business-portal UI review.
- **Backend:** `apps/api`'s Express app deploys as a single Netlify Function (`serverless-http` wrapper, see `apps/api/netlify/functions/api.ts`) — no container/registry step. The weekly Google sync and Yelp cache TTL purge run as **Netlify Scheduled Functions** (cron syntax in `netlify.toml`) rather than a standalone worker process; run DB migrations against Supabase as a pipeline step before traffic cutover.
- **Mobile:** EAS Build (if using Expo/React Native) or Fastlane (bare React Native) → TestFlight/Play Internal Testing for staging builds → App Store/Play Store for release; mobile release cadence will naturally lag web/backend since store review isn't instant — plan announcements/challenges features to degrade gracefully on older app versions.

**Environments**
- `dev` (local, Supabase local dev CLI or a dev Supabase project) → `staging` (separate Supabase project, seeded with a test neighborhood's data) → `production`.
- Feature flags (e.g., LaunchDarkly or a simple in-house flag table) let you ship challenge/badge features to web first and roll out to mobile once store review clears, without branching the backend.

**Observability (both platforms)**
- Shared error tracking (e.g., Sentry, which supports web + React Native + backend in one project) so a bug surfaced on web and mobile shows up in the same triage view.
- API-level logging/metrics (request volume, cache hit rate on `VenueEnrichmentCache`) shared across all client types since they hit the same backend.

---

## 11. Monetization Model

**Principle: the app is always free for end users.** Browsing, check-ins, challenges, badges, and following businesses cost nothing and are never gated — the monetization surface is entirely on the business side.

### 11.1 Free claim, sampled features

When a business claims its venue (verification flow per §5), the claim itself is free and immediately includes one free unit of each premium content type, so the business can experience the full feature set before paying for more:

- **1 POI** (e.g., one stall/department/room inside the venue)
- **1 Event** (a scheduled, time-boxed listing — separate from an announcement)
- **1 Announcement** (a one-off update pushed to followers)

This is a "freemium sample," not a permanently free allotment — see `Entitlement.included_quota` in §1.8, set to `1` per resource type on the free tier. The business can use all three, see them appear in the app (map pin detail, event feed, announcement feed), and decide from direct experience whether more is worth paying for.

### 11.2 Credits, not tiered subscriptions

Rather than fixed monthly tiers, businesses **buy credits** and spend them per action — this is simpler to reason about for a business owner ("I have 40 credits left") and simpler to price/tune on your end (adjust one number — the credit cost of a resource type — instead of restructuring whole tiers).

- Each resource type has a **credit cost**, set centrally and adjustable without a schema change:

| Resource | Example credit cost |
|---|---|
| Additional POI | 10 credits |
| Event | 5 credits |
| Announcement | 3 credits |
| Coupon (§13) | 8 credits |

- Credits are sold in **packs** (e.g., 50 credits for $X, 250 credits for $Y at a bulk discount) via Stripe or similar — a simple one-time purchase, not a recurring subscription. A business that posts rarely just buys a small pack when needed; a business that posts constantly buys a bigger pack less often. An optional **auto-reload** setting (buy another pack automatically when balance runs low) covers the convenience a subscription would have offered, without committing every business to a recurring charge by default.
- The free-sample grant from §11.1 (1 POI, 1 Event, 1 Announcement) remains **separate from credits** — it's a one-time entitlement flag per resource type (tracked via `Entitlement`, §1.8), not something paid for with credits, so a brand-new business always gets to try all three features before ever touching a payment form.

### 11.3 Credit schema & enforcement

```
CreditBalance
  id
  venue_id -> Venue
  balance
  updated_at

CreditCost                      -- admin-configurable, versioned
  resource_type ('poi' | 'event' | 'announcement' | 'coupon')
  cost_in_credits
  effective_from

CreditTransaction                -- full audit trail of every balance change
  id
  venue_id -> Venue
  amount                         -- positive for a purchase, negative for a spend
  reason ('purchase' | 'poi_create' | 'event_create' | 'announcement_create' | 'coupon_create' | 'free_grant' | 'refund')
  reference_id                   -- id of the POI/Event/Announcement/Coupon created, null for purchases
  created_at

CreditPack                       -- admin-configurable purchase options
  id
  name
  credits_included
  price_usd
```

- On any content-creation request: check `Entitlement` first (free sample still unused? use it, no credits touched). If the free sample is already used, check `CreditBalance.balance >= CreditCost.cost_in_credits` for that resource type; if sufficient, atomically decrement the balance, write a `CreditTransaction` row, and create the resource in the same database transaction — if insufficient, block with a "buy more credits" prompt instead of allowing a negative balance.
- `CreditTransaction` gives businesses (and support staff) a full, auditable history of what every credit was spent on — useful both for the business's own transparency and for your own analytics on which resource type drives the most spend.
- Billing integration (Stripe) only touches `CreditPack` purchases; day-to-day content creation is a fast local balance check, never a live billing-API call.

### 11.4 Why this model fits the build order

This slots in naturally after business claiming (§5) already exists — no changes needed to the check-in, challenge, or badge systems, since those remain entirely free and unaffected by business tier. Add it to the build order as:

7. **Monetization:** `BusinessPlan`/`Entitlement` schema + quota enforcement + billing integration — build once business claiming (step 3 in §8) is working, before scaling business acquisition beyond the initial free-sample cohort.

---

## 12. Multi-Neighborhood Architecture (Launching with Phinneywood, Seattle)

The app should be built generically from the start — a single codebase and database serving any number of neighborhoods — with **Phinneywood** as the first tenant, not a one-off special case hardcoded into the app.

### 12.1 Design principle: single app, multi-tenant by neighborhood

- One database, one backend, one set of mobile/web apps. Every neighborhood-scoped table already carries a `neighborhood_id` (see `Neighborhood` in §1.3) — adding a second neighborhood later is a data-onboarding exercise, not a code change or a fork.
- This avoids the far more expensive alternative — a separate app/database per neighborhood — which would multiply the CI/CD pipeline (§10.4), billing integration (§11.3), and API cost tracking (§1.5) by every new launch.
- **Users can join multiple neighborhoods** rather than belonging to just one — someone might live in Phinneywood but want challenges/announcements from a neighborhood near their office too. This requires a many-to-many join table rather than a single `neighborhood_id` on the user:

```
UserNeighborhood
  id
  user_id -> User
  neighborhood_id -> Neighborhood
  is_home (bool)          -- the user's primary/default neighborhood, for default map center and push-notification priority
  joined_at
```

- Geolocation still drives the **suggested** neighborhood on first launch (and can prompt "you're near Phinneywood — join?" if a user physically enters a neighborhood's boundary they haven't joined), but joining is always an explicit user action, not automatic — this matters once coupons/announcements (§13) start generating push notifications, since users shouldn't be opted into a neighborhood's business marketing without asking.
- Home feed, challenges, and leaderboards aggregate across all joined neighborhoods by default, with a neighborhood filter/switcher for viewing one at a time — check-ins, badges, and challenge progress remain correctly attributed to whichever neighborhood the venue actually belongs to (via `Venue.neighborhood_id`), so joining multiple neighborhoods doesn't require any change to how those systems already work.

### 12.2 What's global vs. neighborhood-scoped

| Global (shared across all neighborhoods) | Neighborhood-scoped |
|---|---|
| `Category` taxonomy (§2) | `Venue`, `POI` |
| Challenge **templates** (the parameterized rules from §6) | Challenge **instances** generated from templates, and their leaderboards |
| Badge definitions | Check-in records, badge *awards* (earned within a specific neighborhood's venues) |
| `BusinessPlan` tier definitions and pricing (§11.2) | Individual `BusinessPlan` records (tied to a venue, which belongs to a neighborhood) |
| App codebase, CI/CD pipeline (§10.4) | `Neighborhood.boundary_geojson`, sync bounding box, launch `status` |

Keeping the taxonomy, challenge templates, and badge definitions global means the second neighborhood you onboard reuses all of that for free — only the venue data and the geographic boundary are genuinely new work.

### 12.3 Neighborhood onboarding runbook

Adding a new neighborhood after Phinneywood should follow a repeatable checklist:

1. Create the `Neighborhood` record: name, slug, city/state, timezone, and a `boundary_geojson` polygon drawn directly on a map in the admin portal (§12.6) — not hand-authored GeoJSON — so the boundary matches how locals actually perceive the neighborhood's extent.
2. Run the Google Places sync (§1.4) scoped to that polygon; dedup and categorize as usual.
3. Set `Neighborhood.status = 'onboarding'` so the neighborhood exists in the database and can be tested/curated internally without appearing in the live app's neighborhood picker.
4. Business outreach/claiming can begin during `onboarding` status — this is exactly the free-sample flow from §11.1, run neighborhood-by-neighborhood as you expand.
5. Once venue data is clean and a reasonable number of businesses are claimed, flip `status = 'active'` — the neighborhood now appears in the app's neighborhood picker and geolocation-based auto-detection.
6. No code deploy is required for steps 1–5 — this is entirely a data/admin workflow, which is the point of the generic architecture.

### 12.4 Phinneywood, Seattle — first launch parameters

- **Neighborhood:** Phinneywood (the combined Phinney Ridge / Greenwood area of Seattle, WA) — the informal "Phinneywood" name is already how locals refer to the merged business district along Greenwood Ave N / Phinney Ave N, which makes it a natural single neighborhood boundary rather than two.
- **Timezone:** America/Los_Angeles.
- **Scale:** ~70 businesses (§1, cost estimate already validated against this figure — comfortably within Google's free tiers).
- **Boundary:** draw the polygon around the Greenwood Ave N corridor plus adjacent residential/commercial blocks that locals consider part of Phinneywood, rather than an arbitrary radius from a center point — this matters for challenge design (§6) feeling locally authentic rather than algorithmically generated.
- **Status:** launches as the first `active` neighborhood; every other neighborhood added later goes through the same `onboarding → active` flow, proven out here first.

### 12.5 Why this matters for the build order

Add `Neighborhood` as a first-class entity in the **data layer MVP** (§8, step 1) rather than treating it as an afterthought — retrofitting `neighborhood_id` onto `Venue`, challenges, and leaderboards after the fact is exactly the kind of schema rework the rest of this document is trying to avoid. Phinneywood becomes the first row in that table, not a special case in the code.

### 12.6 Admin portal: draw the boundary on a map

Rather than hand-authoring GeoJSON coordinates, the admin portal (part of the web app, §10.1, gated to internal staff) should include an interactive polygon-drawing tool:

- **Library:** Mapbox GL Draw (pairs naturally with Mapbox GL JS if that's the web map choice from §10.2) or the Google Maps Drawing Library if standardizing on Google Maps for web too — either supports click-to-place-vertex polygon drawing with drag-to-adjust editing.
- **Workflow:** admin searches/pans to the target area, draws the polygon vertex by vertex around the actual streets that define the neighborhood, adjusts vertices as needed, and saves — the tool serializes the shape directly to `Neighborhood.boundary_geojson`, no manual coordinate entry.
- **Preview before committing:** before saving, run a dry-run Google Places query against the drawn polygon and plot the resulting venues as markers on the same map, so the admin can visually confirm the boundary captures the right businesses (and doesn't spill into an adjacent neighborhood) before triggering the real sync in step 2 of the onboarding runbook (§12.3).
- **Editing existing boundaries:** the same tool loads and re-edits an existing `Neighborhood.boundary_geojson` (e.g., if Phinneywood's boundary needs adjusting after launch), rather than being a create-only tool.

---

## 13. Business Coupons & In-Person Redemption

An extension of the announcement system (§5) that lets a business send a redeemable coupon rather than just an informational update, with redemption confirmed in person via a slider gesture the user performs in front of the business owner.

### 13.1 Schema

```
Coupon                          -- an optional attachment to an Announcement
  id
  announcement_id -> Announcement
  offer_description             -- e.g. "20% off any drink"
  terms
  valid_from, valid_until
  max_redemptions_total         -- optional cap (e.g. "first 50 redemptions"), null = unlimited
  max_redemptions_per_user      -- default 1

CouponRedemption
  id
  coupon_id -> Coupon
  user_id -> User
  venue_id -> Venue             -- denormalized for fast business-side reporting
  redeemed_at                   -- server-authoritative timestamp, written on slide completion
  device_lat, device_lng        -- optional, soft geofence signal captured at redemption time
```

A coupon is modeled as an attachment to an `Announcement` rather than a separate content type — it reuses the same authoring flow, feed placement, and (per §11) the same `Announcement` entitlement quota, rather than introducing a fourth billable resource type. If coupon volume becomes a meaningfully different usage pattern than plain announcements once real data comes in, splitting it into its own `Entitlement.resource_type` (§1.8) is a straightforward follow-up — the generic entitlement design already supports adding a new resource type without a schema rework.

### 13.2 User flow

1. User sees the coupon in their announcement feed or on the venue's page, and taps "Redeem in store."
2. At the counter, the user taps "Show to business" — this opens a large, deliberately unmissable **slide-to-redeem** control (not a static barcode or code) that the user physically slides while the business owner watches.
3. On slide completion, the client sends a redemption request; the **server** writes `redeemed_at` (never trust a client-side timestamp, since this is the moment a discount becomes binding).
4. The screen immediately flips to a locked "Redeemed on [date/time]" state — the slider cannot be reset or re-shown as unused, preventing the same screen from being presented twice.
5. The server enforces `max_redemptions_per_user` and `max_redemptions_total` at write time (an atomic check-and-increment), so the last remaining unit of a capped coupon can't be double-spent by two near-simultaneous redemptions.

### 13.3 Why the slider (and its limits)

- The slide gesture's real value is **social/physical friction**, not cryptography: it requires the user to actively perform an unmistakable action in front of a witness (the business owner), which discourages screenshotting and reusing the same static offer elsewhere — a QR/barcode alone can be photographed and reused without the business ever noticing.
- It's still an honor-system control at its core, so pair it with lightweight, non-blocking signals rather than trying to make it airtight:
  - Capture `device_lat/device_lng` at redemption time as a soft signal; if it's far from `Venue.lat/lng`, flag the redemption for the business's review rather than blocking it outright (GPS accuracy indoors is unreliable enough that a hard block would create false declines in front of a customer).
  - Rate-limit repeated redemption attempts per user/coupon to blunt scripted abuse.
  - For high-value or limited-quantity coupons, consider requiring the business to tap a confirm button on their own device (business portal or a simple in-app "staff mode") in addition to the user's slide — a true two-sided confirmation — while keeping the single-sided slider as the default for low-stakes offers where friction should stay minimal.

### 13.4 Business-side visibility

- The business portal (§10.1) shows aggregate redemption counts and remaining quota for each active coupon in near real time, without necessarily exposing individual customer identities (privacy-preserving by default; identity visibility can be an opt-in add-on if a business wants it for loyalty tracking).
- This reporting reuses the same analytics surface planned for check-ins and announcements generally — no separate dashboard needed, just another metric alongside the rest of a claimed venue's activity.

---

## 14. User Access Tiers: Anonymous Exploration → Authenticated Engagement

**Principle: let people explore with zero signup friction, and make account creation the natural next step once they want something that requires persistence or two-way interaction** (following a venue, getting notified, redeeming a coupon).

### 14.1 What works anonymously (no account, no friction)

- Browse the map, venues, categories, and POIs
- View business announcements, events, and coupons (read-only)
- View challenges and the neighborhood leaderboard
- Perform check-ins and make challenge progress, attributed to a lightweight anonymous identity rather than nothing at all (§14.2) — so early exploration isn't wasted if the person later signs up

### 14.2 The anonymous identity is a real (unauthenticated) `User` row

Rather than forking the data model into "anonymous session" vs. "real user," every device gets a `User` row from first launch — the difference is just whether it's backed by real credentials yet:

```
User
  id
  is_anonymous (bool)              -- true until the person completes signup
  anonymous_device_id              -- set on first launch, before any signup
  auth_provider                    -- 'email' | 'phone' | 'apple' | 'google', null while anonymous
  email / phone                    -- null while anonymous
  created_at
```

- Check-ins, badge awards, and challenge progress all reference `user_id` from the very first app open — an anonymous user accumulates real history against a real (if unauthenticated) row.
- **Signing up doesn't migrate data — it completes the same row.** The anonymous `User` row simply gets `is_anonymous` flipped to `false` and auth credentials attached, so all prior check-in/badge history is already correctly attached with zero migration step. (Edge case: if someone signs into an *existing* account from a device that already had anonymous history, merge the two rows' check-in/badge records at that point — worth handling explicitly, but it's the exception rather than the default path.)

### 14.3 What requires authentication

These features need a durable, contactable identity, so they're the natural conversion trigger — gate them behind a lightweight signup prompt (email/phone/social, not a long form) shown right at the moment the user wants the feature, not before:

- **Favoriting/subscribing to a venue** for updates:

```
VenueSubscription
  id
  user_id -> User               -- enforced: is_anonymous = false at write time
  venue_id -> Venue
  created_at
  notify_realtime (bool, default true)
```

- **Real-time notifications** — announcements, events, and coupons from subscribed venues pushed live (mobile push / web push), driven off `VenueSubscription` rows. This is meaningless for an anonymous identity with no reachable push token tied to a persistent account across sessions.
- **Coupon redemption (§13)** — `CouponRedemption.user_id` requires `is_anonymous = false`. This is a deliberate gate, not just a technical one: a coupon is a real-world discount with per-user limits (`max_redemptions_per_user`), and enforcing that cap meaningfully requires a durable identity rather than a device ID that can be reset by reinstalling the app. Practically, this makes "redeem this coupon" one of the strongest natural signup moments — someone standing at checkout wanting to save money will take ten seconds to sign up.
- **Joining additional neighborhoods (§12.1)** — `UserNeighborhood` rows also require authentication, since neighborhood membership drives push notification targeting; an anonymous user still gets a geolocation-suggested default neighborhood view without needing to formally "join" it.
- **Public leaderboard presence under a persistent name/avatar** — anonymous check-ins still count toward challenge progress, but appearing on a leaderboard other people see by name is itself an identity commitment worth gating behind signup.

### 14.4 Conversion moments, not upfront gates

Rather than a signup wall at app launch, prompt for account creation exactly when an anonymous user taps something that needs it — "favorite," "notify me," or "redeem" — with a short explanation of what signing up unlocks and their existing check-in/badge history already visible as a preview of what carries over. This keeps the top-of-funnel experience (the thing most people will do most often: browse and explore) completely frictionless, while still converting people at the exact point they've expressed real intent to engage long-term.
