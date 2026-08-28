# Geoapify migration plan

## Context

Google Places API (New) currently powers Spored's bulk venue-discovery
pipeline (`places/sync.ts`) and its lazy per-venue enrichment (ratings,
reviews, photos, hours, phone, website). Google's Places ToS forbids
caching the fields Spored actually needs (name, address, rating, hours,
photos) at all — only `place_id` and lat/lng have caching exceptions.
Spored's usage pattern is a periodic bulk sync into a venue database, not
live per-visitor lookups (check-ins/points/badges are handled entirely
inside Spored once a venue exists), which makes that restriction pure
friction with no benefit.

**Decision: full removal of Google's API surface, not a hybrid.** This
supersedes an earlier draft of this plan that kept Google Places Details as
a thin on-demand layer for reviews/photos. That approach is rejected in
favor of:

- **Discovery + enrichment**: move entirely to Geoapify (Places API +
  Place Details API). No dual-provider client, no cross-provider ID
  bridge, no `source` discrimination — Geoapify is the only place-data
  source in the codebase going forward.
- **Ratings, reviews, and photo galleries are removed as product
  features**, not deferred. There's no Geoapify equivalent, and no
  Google fallback is being kept to preserve them.
- **Hours, phone, website, and price context are kept**, re-sourced from
  Geoapify's Place Details API instead of Google's — confirmed to return
  `opening_hours`, `contact.phone`, `website`, `description`, plus
  category-specific fields (`catering.cuisine`, `accommodation.stars`,
  etc.) from OSM tags, at 1 credit/request
  (<https://apidocs.geoapify.com/docs/place-details/>). Coverage will be
  patchier than Google's since it depends on OSM tagging completeness —
  an accepted tradeoff, not a blocker. There's no direct `price_level`
  field; price context is dropped or weakly approximated per-category,
  not preserved 1:1.
- **Map rendering also moves off Google.** The app separately uses the
  Google Maps JavaScript API (a distinct product/key from Places) for two
  UIs: the neighborhood venue map and the admin boundary-drawing tool.
  Both move to **MapLibre GL JS + Geoapify vector tiles** (0.25
  credits/tile request; Geoapify's tiles are confirmed compatible with
  MapLibre GL), consolidating everything — discovery, enrichment, and map
  rendering — onto a single vendor and a single API key. MapLibre (an
  open-source fork of Mapbox GL JS, no vendor lock-in) was chosen over
  plain Leaflet specifically for future customization
  headroom: GPU-rendered vector tiles support real brand styling via a
  JSON style spec (custom palette, fonts, layer visibility) and
  data-driven marker styling (e.g. color-by-category), which a
  raster-tile Leaflet setup can't offer. The tradeoff is a heavier
  dependency and a less battle-tested drawing-plugin ecosystem than
  Leaflet's — accepted for the customization upside.

Prior research ([docs/location-services-comparison.md](./location-services-comparison.md))
established that Geoapify permits indefinite caching/storage with no
per-field restriction, and that Spored's discovery volume (~50-100 credits
per full neighborhood sync) fits comfortably inside the free tier
(3,000 credits/day). Enrichment and map tiles add to that same daily
budget and should be watched (Phase 8), but are not expected to be
significant at current scale (one seeded neighborhood, admin-triggered
syncs).

This is a design document for a future migration, not a description of
work already done — it's meant to be picked up as backlog work.

## Current architecture (grounding facts)

### Discovery/sync

- `apps/api/src/places/client.ts` — Google-shaped `RawGooglePlace`/
  `RawPlaceDetails`, consumed throughout `sync.ts`, `review.ts`,
  `categorize.ts`, `dedup.ts`, `preview.ts`.
- Decorator composition (`mockClient.ts` → `instrumentedClient.ts` →
  `quotaGuard.ts`), composed in `app.ts:328-343`'s `getPlacesClient()`.
- `sync.ts` tiles a neighborhood (400m circles, 480m spacing,
  `geo.ts:generateCoverageGrid`) × category-type chunks (Google's 50-type
  cap, `MAX_INCLUDED_TYPES_PER_REQUEST`) × saturation retry
  (`PLACES_API_RESULT_CAP = 20`, `subdivideCircle`, max depth 1). Dedup by
  place ID then fuzzy name/location match (`dedup.ts`, provider-agnostic
  already). Final write via `repository.upsertVenue`, keyed on
  `venue.google_place_id` (`unique(google_place_id, neighborhood_id)`).
- `searchPlacesInPolygon` is shared between `sync.ts`'s unattended path and
  `locations/review.ts`'s admin-diff path — one swap point affects both.
- `locations/review.ts` is an existing human-in-the-loop safety net (diff
  → explicit commit, 24h cooldown) — reusable as the rollout/backfill
  mechanism, no new tooling needed.
- Category taxonomy: `category.source_mapping_json = {"google": [...]}`
  per leaf category (~39 rows), read by `categorize.ts`'s
  `buildGoogleTypeIndex`/`matchCategory`.

### Enrichment (ratings/reviews/photos/hours/phone/website)

- `apps/api/src/enrichment/refresh.ts` — `getFreshEnrichment`, keyed by
  `google_place_id`, TTL 24h, calls Google's `getPlaceDetails`, maps via
  `mapPlaceDetails` into `venue_enrichment_cache` (columns: `rating`,
  `reviews`, `price_tier`, `photo_refs`, `phone`, `website`, `hours`,
  `editorial_summary`, `atmosphere`, `source` — CHECK constrained to
  `'google'`).
- Photo bytes are proxied live (never cached) via `GET /locations/:id/photo`
  in `app.ts` (~line 647), calling `fetchPhotoMedia`; capped at
  `MAX_GALLERY_PHOTOS = 4`.
- **Frontend rating/review/photo surface** (confirmed by direct
  exploration — this is the actual removal blast radius):
  - `apps/web/src/app/EnrichmentSection.tsx` — `EnrichmentPhotos`,
    `EnrichmentReviews` (star rating + sampled reviews); `EnrichmentAbout`
    also lives here but covers hours/phone/website/price, which are kept.
  - `apps/web/src/app/EnrichmentPhotoGallery.tsx` — photo strip renderer.
  - `apps/web/src/app/location/[id]/reviews/page.tsx` — entire page exists
    only to render `EnrichmentReviews`; removed outright.
  - `apps/web/src/app/location/[id]/about/page.tsx` — drop the
    `EnrichmentPhotos` render, keep `EnrichmentAbout`.
  - `apps/web/src/app/location/[id]/LocationTabs.tsx` — `showReviews`
    logic and the Reviews tab removed; `showAbout` logic unaffected (it's
    keyed on `isBusiness || Boolean(enrichment)`, not rating/photos).
  - `apps/web/src/app/location/[id]/LocationSummaryCard.tsx` — `hasRating`
    stat tile and its `grid-cols-3` layout branch removed, back to a
    2-column stat row.
  - `apps/web/src/app/location/[id]/layout.tsx` — `aggregateRating`
    JSON-LD and `photo_refs`-based Open Graph image removed (OG image
    needs a fallback — e.g. a static/category-based image — decided in
    Phase 6).
  - `PoweredByGoogle` attribution component (rendered in `about/page.tsx`
    and the now-deleted `reviews/page.tsx`) replaced with a Geoapify/OSM
    attribution component.
  - Not affected: `happeningNow.ts`/`OpenNowRow.tsx`/Today-tab "open now"
    feature — sourced from `enrichment.hours`, which is kept.

### Map rendering

- `apps/web/src/app/neighborhoods/[slug]/MapView.tsx` — venue map, Google
  Maps JS SDK.
- `apps/web/src/app/admin/neighborhood/BoundaryMap.tsx` — admin
  boundary-drawing tool, Google Maps JS SDK + its drawing library.
- Both keyed by `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (`apps/web/.env.example`),
  a browser-restricted key on the same GCP project as Places but a
  distinct product ("Maps JavaScript API").

### Monitoring / cost tracking

- `places_api_call_log.endpoint` — hard CHECK constraint enumerating
  exactly Google's 4 method names (`searchNearby`, `searchText`,
  `getPlaceDetails`, `fetchPhotoMedia`).
- `PLACES_API_PRICING` (`packages/types/src/index.ts:1798`) — a monthly-$
  shape (`ratePerThousand`, `freeMonthlyEvents`) that doesn't fit
  Geoapify's daily-credit unit (1 credit/place-search-request + 1/extra 20
  results; 1 credit/place-details request; 0.25 credit/map tile).
- `apps/web/src/app/admin/super/monitoring/places/` + shared
  `PlacesApiFreeTierStats.tsx`/`PlacesApiCostChart.tsx`/etc. — built
  around the monthly-$/free-events shape above.

### Legal

- Confirmed by direct exploration: **Google Places/Maps is not currently
  named anywhere in privacy, terms, or FAQ pages.** The privacy page's
  only "Google" mention covers sign-in/Analytics/FCM push
  (unrelated); FAQ has no rating/review/photo content at all. This
  simplifies the legal-docs step: there's nothing Google-specific to
  *remove*, only a new Geoapify/OpenStreetMap subprocessor entry to *add*.

## Recommended design

1. **Places client — Geoapify-native, not an adapter.** Since there's no
   second provider to abstract over, rewrite `apps/api/src/places/client.ts`
   directly against Geoapify: a `searchPlaces` method (tiled tag-filtered
   search) and a `getPlaceDetails` method (hours/phone/website/description
   only — no rating/reviews/photo fields in the DTO at all, so the removed
   features can't silently come back). Delete `fetchPhotoMedia` entirely.
   Rename `RawGooglePlace`/`RawPlaceDetails` to provider-neutral names
   (e.g. `RawPlace`/`RawPlaceDetails`) since "Google" no longer describes
   what they are. `mockClient.ts` fixtures rebuilt in Geoapify's shape.

2. **Schema — rename, don't dual-track.** `venue.google_place_id` →
   `venue.geoapify_place_id` (single column, single
   `unique(geoapify_place_id, neighborhood_id)` constraint — no second
   column, no `source` discriminator needed on `venue` since there's only
   one provider). `venue_enrichment_cache`: drop `rating`, `reviews`,
   `photo_refs`; keep `phone`, `website`, `hours`, `editorial_summary`
   (mapped from Geoapify's `description`); re-evaluate `price_tier` and
   `atmosphere` once Phase 0 confirms real-world field coverage — likely
   dropped or narrowed to categories where Geoapify actually has a signal
   (e.g. `catering.stars`/`accommodation.stars`), not preserved generically.
   Update the `source` CHECK constraint to `'geoapify'`.

3. **Category taxonomy — replace, not add alongside.** Migration replacing
   `category.source_mapping_json.google` with `.geoapify` per leaf
   category (~39 rows), mapped from Geoapify's OSM category list.
   `categorize.ts` simplifies to a single provider key — no
   `sourceKey`-parameterized branching needed.

4. **`sync.ts`/`geo.ts` wiring.** `PLACES_API_RESULT_CAP` and
   `MAX_INCLUDED_TYPES_PER_REQUEST` become Geoapify's real limits, per
   Phase 0's live verification — Google's Nearby Search 20-result wall and
   50-type request cap don't apply to Geoapify (different, currently
   unconfirmed, ceilings). No `businessStatus` equivalent exists in OSM
   data — `skippedClosedPermanently` becomes a no-op; a closed business
   only drops out when a later sync no longer finds it, not proactively.
   This is an accepted, explicitly-called-out behavior change.

5. **Backfill existing venues.** Any venue currently carrying a real
   Google place ID (from prior syncs) needs a real Geoapify ID once the
   column is repurposed. Run every existing neighborhood (today: just
   Phinneywood) through `locations/review.ts`'s admin diff flow against
   Geoapify post-cutover — `dedup.ts`'s existing name/location fuzzy match
   (already provider-agnostic) resolves prior venues to their Geoapify
   counterparts without a new matching mechanism.

6. **Map rendering.** Add `maplibre-gl` + `react-map-gl` (declarative React
   wrapper, fits `apps/web`'s Next.js/React setup) + `@mapbox/mapbox-gl-draw`
   (MapLibre-compatible polygon draw/edit) as dependencies. Rewrite
   `MapView.tsx` (venue map) and `BoundaryMap.tsx` (admin boundary tool)
   against MapLibre GL JS + Geoapify vector tiles, replacing the Google
   Maps JS SDK integration in both. `MapView.tsx` gets a real style spec
   (own palette/fonts, data-driven venue-marker coloring by category)
   instead of an unstyleable raster basemap. Replace
   `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with a browser-restricted
   `NEXT_PUBLIC_GEOAPIFY_API_KEY`.

7. **Monitoring.** Generalize `places_api_call_log.endpoint`'s CHECK
   constraint (and the `PlacesApiEndpoint` union in `packages/types`) to
   Geoapify's endpoint names (places search, place details, map tiles).
   Replace `PLACES_API_PRICING`'s monthly-$/free-events shape with a
   daily-credit model matching Geoapify's actual metering (1 credit/search
   + 1/extra 20 results, 1 credit/details, 0.25 credit/tile), and rework
   the Monitoring UI's free-tier/cost sections accordingly — this is a
   real, not cosmetic, change to `placesApiCost.ts` and the chart
   components, since "days until reset" and "% of free tier used" both
   work differently for a daily budget than the current monthly one.

8. **Cleanup / removal.** Delete `docs/google-places-setup.md`,
   `GOOGLE_PLACES_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, and all
   Google-specific setup references. Add one new `docs/geoapify-setup.md`
   covering Places, Place Details, and Map Tiles under a single Geoapify
   account/key. `investigate.ts` (the admin "why isn't this venue found"
   diagnostic, currently a Google Text Search) needs a Geoapify-based
   equivalent — Geoapify's Places/Geocoding search can serve the same
   purpose, but this is a distinct small piece of work, not a mechanical
   swap, since Geoapify's `PlacesTextSearchClient`-equivalent doesn't
   exist yet in Phase 1's scope by default.

9. **Legal/docs.** Add a Geoapify/OpenStreetMap subprocessor entry to
   `apps/marketing/src/app/privacy/page.tsx` §3 (nothing to remove there —
   Google was never named for this data), bump `UPDATED`. Add "Powered by
   Geoapify" + OpenStreetMap attribution UI (replacing `PoweredByGoogle`),
   required on Geoapify's Free plan — gates showing real Geoapify data to
   real users. No FAQ changes needed (confirmed no rating/review/photo
   content exists there). Update `docs/location-services-comparison.md`'s
   conclusion to reflect the full-removal decision made here.

## Phase order / dependencies

- **Phase 0** (live Geoapify verification). **Partially done** — Place
  Details field coverage was verified against 5 real venues already in
  Spored's `venue` table (see
  [docs/location-services-comparison.md](./location-services-comparison.md#live-verification)
  for the full results). Findings: hours/website/phone coverage is
  patchy as expected (2/5, 1/5, 0/5); staleness is real, not
  hypothetical (one venue resolved to a wrong/outdated business name);
  name mismatches exist independent of missing-venue cases (a venue
  findable only under a different, official OSM name) — all of which
  the backfill step (item 5) and its reuse of `locations/review.ts`'s
  human review flow already need to handle, now confirmed rather than
  assumed. **Still open**: the tiled bulk-search request-count/category-filter
  ceiling (a `sync.ts`-shaped run, not single-point Place Details lookups)
  and Map Tiles integration — these still gate the exact constants used
  in Phases 4 and 6.
- **Phases 1 (client), 2 (category mapping), 3 (schema)** proceed in
  parallel once Phase 0's shapes are confirmed.
- **Phase 4** (`sync.ts` wiring) depends on 1–3.
- **Phase 5** (backfill) depends on 4.
- **Phase 6** (map rendering — MapLibre GL + Geoapify vector tiles) is
  independent of 1-5, can proceed in parallel; benefits from Phase 0
  confirming vector-tile access/limits alongside Places.
- **Phase 7** (monitoring) is independent, sequenced opportunistically.
- **Phase 8** (cleanup/removal) happens last, once nothing references
  Google anymore.
- **Phase 9** (legal/docs) — attribution UI gates real rollout; the rest
  can land anytime.

## Critical files (for whoever picks this up)

- `apps/api/src/places/client.ts`, `mockClient.ts`, `instrumentedClient.ts`, `quotaGuard.ts`
- `apps/api/src/places/sync.ts`, `geo.ts`, `categorize.ts`, `dedup.ts`, `review.ts`, `investigate.ts`
- `apps/api/src/places/repository.ts`, `supabaseRepository.ts`
- `apps/api/src/enrichment/refresh.ts`, `repository.ts`, `supabaseRepository.ts`
- `apps/api/src/app.ts` (`getPlacesClient()` composition root, photo-proxy route)
- `apps/api/src/scripts/syncPlaces.ts`
- `apps/web/src/app/EnrichmentSection.tsx`, `EnrichmentPhotoGallery.tsx`
- `apps/web/src/app/location/[id]/{about,reviews}/page.tsx`, `LocationTabs.tsx`, `LocationSummaryCard.tsx`, `layout.tsx`
- `apps/web/src/app/neighborhoods/[slug]/MapView.tsx`, `apps/web/src/app/admin/neighborhood/BoundaryMap.tsx`
- `apps/web/src/app/admin/super/monitoring/places/*`, `PlacesApi*.tsx`, `placesApiCost.ts`
- `apps/marketing/src/app/privacy/page.tsx`
- `docs/google-places-setup.md` (to delete), `docs/location-services-comparison.md` (conclusion to update)
