# Location data services — comparison

Geoapify is what's implemented today (BACKLOG.md Ref 114 migrated off Google
Places API; client in `apps/api/src/places/geoapifyClient.ts`, quota guard in
`apps/api/src/places/quotaGuard.ts`). This doc's research and comparison below
predate that migration and describe the Google Places API (New) setup that
was live at the time. This doc compares it against alternative
location-data providers, with a focus on the question that actually matters
for how Spored uses location data: **can the data be cached/stored, or does
it have to be re-fetched live on every use?**

Spored's model is a periodic bulk sync into a venue database (see
`places/sync.ts`'s tiled-grid neighborhood sync) — not live per-visitor
lookups. Check-ins, points, badges, etc. are all handled inside Spored once a
venue exists. That makes caching policy the dominant cost/design factor, more
than raw per-call price.

## Comparison

| Service | Core data (name/address/geo) | Hours/phone/website | Reviews & ratings *(nice-to-have)* | Photos *(nice-to-have)* | Caching / storage | Price |
|---|---|---|---|---|---|---|
| **Google Places API (New)** — current | Yes | Yes (Detail SKU) | Yes (Detail SKU, priciest) | Yes (Photo SKU) | `place_id` forever; lat/lng 30 days; **everything else — name, address, rating, hours, photos — cannot be cached at all**, must be re-fetched live | *(already implemented — see `quotaGuard.ts` pricing table)* |
| **OpenStreetMap Overpass API** (direct) | Yes (via tags, coverage varies) | Present when mapped, inconsistent | No — not part of OSM | No — not part of OSM | **ODbL license — store indefinitely.** Attribution only required for public-facing display, not internal storage | Free (public instance is rate-limited; self-host for volume) |
| **Geoapify Places API** (OSM-based, hosted) | Yes (same OSM data, productized filtering/categories) | Same OSM inconsistency | No | No | **Explicitly permissive — confirmed, see deep dive below.** No time limit on storage/reuse | Free: 3,000 credits/day. Paid $59 (10k/day) – $609/mo (250k/day) |
| **Foursquare Places API** | Yes | Yes | Yes | Yes | Only `fsq_place_id`, photo IDs, address IDs cacheable indefinitely — names/categories/hours/ratings must be re-fetched | ~$7.50/1k Pro calls; 500 free/mo (cut from up to 10k, effective June 2026) |
| **HERE Places** | Yes | Yes | Limited | Limited | 30-day cap on self-serve; full/permanent caching needs a $10k/yr enterprise license | ~$1/1k, small free tier |
| **Yelp Fusion** | Yes | Yes | Yes (their core strength) | Yes | Best short-term allowance: cache everything for up to 24h — but no indefinite storage of any field except business ID | No free tier anymore; $7.99–$14.99/1k calls |

## Can you cache? — the actual answer

Google, Foursquare, and HERE all draw the same line: you may keep the **ID**
(and Google also lets you keep lat/lng for 30 days) forever, but the fields
you'd actually show a user — name, address, rating, hours, photos — have
**no caching exception** and must be re-requested on every use. Yelp is the
outlier with a flat 24h allowance on everything, but it dropped its free
tier entirely.

**Current implementation note:** `venue_enrichment_cache`
(`apps/api/src/db/migrations/20260706024100_initial_schema.sql`) stores
`rating`, `review_snippet`, and `photo_url` with a 24h TTL
(`ENRICHMENT_TTL_MS` in `enrichment/refresh.ts`). That's arguably outside
Google's stated Places ToS §3.2.3 (no caching exception for those fields at
all — 24h vs. 0h). Low risk in practice, but it's the same clause that led
to `places_photo_cache` being dropped in
`20260825150000_drop_places_photo_cache.sql` — applied consistently, it
would touch this table too.

## For Spored's use case

OSM-based data (Overpass direct, or Geoapify as a hosted/productized layer
on top of the same data) fits the bulk-sync model this app actually uses.
ODbL permits indefinite storage at near-zero cost, with none of the
"must re-fetch on render" restriction the commercial APIs impose.

Tradeoff: no reviews, no photos, natively. A hybrid was considered here —
keeping Google Places Details as a thin, on-demand layer purely for
reviews/photos on venues someone actually opens, while Geoapify/Overpass
handled the bulk sync — but the migration (BACKLOG.md Ref 114) shipped a
full removal instead: rating, reviews, and photo galleries were dropped
outright as product features (Phase 3), rather than kept alive as a
second, Google-keyed data source alongside Geoapify. That avoids running
two location-data vendors long-term for a feature that a live check found
patchy anyway (see Phase 0 findings above).

**Shape shipped:** Geoapify for both the recurring bulk location sync
(`places/sync.ts`) and on-demand Place Details enrichment — no Google
Places dependency remains anywhere in the codebase.

## Geoapify deep dive

### Caching — confirmed permissive

Geoapify's own comparison material states plainly: *"Store and cache place
data for offline and online use,"* *"data can be stored and reused,"* *"you
can cache and reuse results without needing to make repeated API calls."*
Their Terms & Conditions carve out no retention limit or redistribution
restriction. The only contractual requirement is attribution:

- **OpenStreetMap attribution is mandatory on every plan** — this is the
  underlying ODbL requirement, not Geoapify-specific.
- **"Powered by Geoapify" attribution is mandatory only on the Free plan.**
  Paid plans drop the Geoapify badge (OSM credit is still required).

No stated time limit on storage, unlike Google/Foursquare/HERE.

### Pricing

| Plan | $/mo | Daily credits | Rate limit |
|---|---|---|---|
| Free | $0 | 3,000 | 5 req/s |
| API 10 | $59 | 10,000 | 12 req/s |
| API 25 | $109 | 25,000 | 15 req/s |
| API 50 | $179 | 50,000 | 20 req/s |
| API 100 | $299 | 100,000 | 25 req/s |
| API 250 | $609 | 250,000 | 30 req/s |

Credit formula: **1 credit per request, +1 credit per additional 20 results
beyond the first 20** in that response. Photos and reviews are not present
in the Places API response fields at all (name, address, geometry,
categories, `place_id` only) — that gap is unchanged from the comparison
table above.

### Cost against Spored's actual usage

Grounded in `places/sync.ts`, not a guess:

- A neighborhood sync tiles the polygon into 400m-radius circles spaced
  480m apart — **~40-60 tiles** for a neighborhood the size of the seeded
  Phinneywood polygon (`supabase/seed.sql`).
- Today each tile costs **2 Google calls**, not 1 — Google caps
  `includedTypes` at 50 per request and the category taxonomy has grown
  past that, forcing a 2-chunk split (`sync.ts:15,112`). That cap is
  Google-specific; Geoapify's category filter is not known to have the
  same ceiling, so this would likely collapse to **~1 request per tile** —
  flagged for the live test below rather than assumed.
- Each tile is a small 400m circle, so most will return well under 20
  places → 1 credit each.
- **Estimate: ~50-100 credits per full neighborhood sync.**
- Real trigger volume is low: only **one neighborhood is currently seeded**
  (Phinneywood), there's **no cron** — sync only runs via a manual CLI
  script or an admin-clicked review route, and that route is
  cooldown-limited to **once per 24h per neighborhood**
  (`LOCATIONS_REVIEW_COOLDOWN_MS`, `review.ts:16`).

Even assuming a dozen neighborhoods each getting a full re-sync the same
day, that's ~600-1,200 credits — comfortably inside the **3,000/day free
tier**. A paid plan only becomes relevant if the Geoapify attribution badge
needs to go away, or neighborhood count/re-sync frequency grows well past
current scale.

### Live verification

Done. Ran Geoapify's free tier (Place Details by lat/lng + a categorized
nearby search) against 5 real venues already in Spored's `venue` table
(Phinneywood/Fremont/Greenwood, Seattle) — `First Light Farm`, `Salon
Doux`, `Book Larder`, `Caffe Vita`, `Communal Park` — comparing against
what's already known about each from Google.

| Venue | Geoapify match | Categories | Hours | Phone | Website |
|---|---|---|---|---|---|
| Book Larder | Exact name match | `commercial.books` | Full weekly schedule | — | — |
| Caffe Vita | Exact name match | `catering.cafe.coffee_shop` + bonus tags (`wheelchair.yes`, `internet_access.free`) | `07:00-17:00` | — | `caffevita.com` |
| Salon Doux | **Wrong name returned: "Salon Opal"** (correct type/location) | `service.beauty.hairdresser` | — | — | — |
| Communal Park | **No feature at that exact point** — nearby search instead found "Accidental Park" | — | — | — | — |
| First Light Farm | **No match at all** — resolves to a residential building; nothing within 60m | — | — | — | — |

Three takeaways that change this from a hedge to a confirmed finding:

1. **Staleness is real, not hypothetical.** Salon Doux is tagged in OSM as
   "Salon Opal" — a rename or prior tenant OSM hasn't caught up with. This
   is the concrete version of the "no `businessStatus` equivalent, no
   proactive staleness detection" risk already noted above.
2. **Naming mismatches, not just data gaps.** "Communal Park" isn't in
   Geoapify's data, but "Accidental Park" is, at the same spot — plausibly
   the same place under its official OSM name vs. a colloquial name
   Spored's data uses. A re-sync/backfill will need human review for name
   mismatches, not just missing-venue cases — the existing
   `locations/review.ts` admin diff flow is the right place for that
   review, not a new mechanism.
3. **Hours/phone/website coverage is exactly as patchy as expected** —
   2/5 had hours, 1/5 had a website, 0/5 had a phone number. Confirms
   "coverage will be patchier than Google's" wasn't just hedging.

Also notable: Geoapify surfaces small bonus signals Google doesn't expose
as cleanly — `wheelchair`, `internet_access`, `outdoor_seating` as
first-class boolean tags per venue.

Request-count/category-filter ceiling for the tiled bulk-sync path
specifically (as opposed to this single-point Place Details check) is
still unconfirmed — that needs a real `sync.ts`-shaped tiled run, not just
point lookups, before locking in Phase 4's chunking constants.
