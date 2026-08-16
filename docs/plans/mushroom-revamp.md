# Mushroom revamp: profile, neighborhood & location cards

Status: proposed (not started). Tracked in [BACKLOG.md](../../BACKLOG.md) Ref 94 (neighborhood/location) and Ref 97 (profile card). The tangentially-related Forager Collection concept is tracked separately as Ref 98 and is *not* detailed here.

## Why this doc exists

Both changes below touch the same shared primitives (`mushroomConfigForUser`/`resolveMushroomConfig` in `packages/types/src/mushroom.ts`, and the `MushroomField` component) across several files in `apps/api`, `apps/web`, and `packages/types`, and both replace an existing, already-shipped behavior rather than adding something net-new. That's enough surface area and enough "here's exactly what changes and why" nuance that a backlog blurb isn't enough to implement from — this doc is the reference for whoever picks this up.

## Current behavior (as of 2026-08-15)

Both surfaces already render a mosaic of other people's mushrooms — this is a revamp of existing logic, not new plumbing:

- **Profile card** (`apps/web/src/app/account/ProfileSummaryCard.tsx:111-128`): `MushroomField` with `ownCount={level}` (one mushroom per level, the account's own skin) followed by a neighbor mosaic sized `level + Math.sqrt(neighborCount)`. The neighbor mosaic is fed `neighborMushrooms`, which on the account page (`apps/web/src/app/account/(tabs)/layout.tsx:149-152`) is `state.connections.filter(accepted).map(c => c.user.mushroom_snapshot)` and on the public profile (`apps/api/src/app.ts:1788-1791`) is the same idea server-side (`connections.map(c => c.user.mushroomSnapshot)`). `mushroom_snapshot` is frozen at the moment the connection was *accepted* (`user_connection.requester_mushroom_snapshot`/`recipient_mushroom_snapshot`, added in `supabase/migrations/20260715010000_mushroom_fingerprint_snapshots.sql`) — it does not reflect any customization the neighbor has made since.
- **Neighborhood card** (`apps/web/src/app/neighborhoods/[slug]/NeighborhoodSummaryCard.tsx:69-79`) and **location card** (`apps/web/src/app/location/[id]/LocationSummaryCard.tsx:88-97`): `MushroomField` sized `Math.sqrt(checkin_count)` (all-time total), fed `recent_checkin_mushrooms` — the most recent ~120 check-ins with a non-null `checkin.mushroom_snapshot` (frozen at check-in time), deduped to one entry per distinct visitor, capped at 12 distinct visitors. Query logic: `apps/api/src/locations/supabaseRepository.ts:193-217` (location) and `apps/api/src/checkins/supabaseRepository.ts:155-175` (neighborhood, joined through `venue.neighborhood_id`). Neither is time-windowed — a visitor from a year ago still shows up if they haven't been bumped out by more recent check-ins.

## Part 1 — Profile card: live, one-to-one neighbor mushrooms

**Target behavior:** keep the level mushrooms exactly as-is (`ownCount={level}`, one per level). Change the neighbor mosaic to (a) show each neighbor's *current* mushroom — customized or hash-derived — instead of the frozen accept-time snapshot, and (b) show exactly one mushroom per accepted neighbor instead of a `sqrt`-compressed count.

**Changes:**

1. `apps/web/src/app/account/(tabs)/layout.tsx:149-152` — `GET /me/connections` already returns each neighbor's `id` and `mushroom_customization` (`ConnectionSummary.user`, `packages/types/src/index.ts:719-725`). Swap the `.mushroom_snapshot` map for `resolveMushroomConfig(c.user.id, c.user.mushroom_customization)` (already imported from `@blockwise/ui` elsewhere in this codebase, e.g. `MushroomField.tsx:2`). No API change needed for this surface.
2. `apps/api/src/app.ts:1784-1791` (`GET /users/:username`) — currently deliberately strips id/username and sends only frozen snapshots (see the comment at line 1784). Do the equivalent live resolution *server-side* instead: `connections.map(c => resolveMushroomConfig(c.user.id, c.user.mushroomCustomization))`. This keeps the privacy posture identical to today — the client still never receives a neighbor's id or username, only the resulting swatch config, which isn't identifying on its own.
3. `apps/web/src/app/account/ProfileSummaryCard.tsx:122` — change `count={level + Math.sqrt(neighborCount)}` to `count={level + neighborCount}`. Update the `neighborMushrooms` prop type from `MushroomSnapshot[]` to `MushroomConfig[]` (structurally compatible — `MushroomSnapshot` is a `MushroomConfig` plus a `v` version tag it no longer needs once it's not a stored snapshot).
4. `MushroomField.tsx`'s `MAX_MUSHROOMS = 40` cap becomes the only ceiling on the merged field now that neighbor count isn't compressed — acceptable per the user's "single... mushroom for every neighbor" framing, but flag that an account with a very large neighbor count will visibly truncate at 40 total (level + neighbors combined) rather than gracefully scaling down. No action proposed here beyond noting it; revisit only if it proves to be a real problem post-launch.

**Explicitly out of scope:** the `checkin.mushroom_snapshot` / `user_connection.*_mushroom_snapshot` columns and their capture-at-event-time write paths are untouched — they may still be read elsewhere (e.g. a future "you connected with X" notification wanting the at-the-time look). Only these two card reads stop consuming them.

**Tests to update:** any `apps/api` test asserting `neighbor_mushrooms` reflects a stored snapshot rather than a live-resolved config (search `mushroomSnapshot`/`mushroom_snapshot` in `apps/api/src/**/*.test.ts` for the connections/profile endpoints).

## Part 2 — Neighborhood & location cards: rolling 60-day window, live design, per-visitor scaling

**Target behavior:** the mosaic reflects check-ins from the trailing 60 days only (not "most recent N rows regardless of age"), each mushroom is the visitor's *current* live design, and a visitor who checked in more than once within the window renders larger in proportion to their visit count — an explicit "Mayor" mechanic (Foursquare-style) that rewards coming back.

**Data/query changes** — replace `listRecentCheckinSnapshotsForNeighborhood` (`apps/api/src/checkins/supabaseRepository.ts:155-175`) and the inline location query (`apps/api/src/locations/supabaseRepository.ts:193-217`) with a version that, per location/neighborhood:

1. Filters `checked_in_at >= now() - interval '60 days'` instead of just ordering by recency with no floor.
2. Aggregates to `(user_id, visit_count)` pairs within that window — this is a real change from today's dedup-only logic, since we now need a *count* per user, not just presence. Application-level aggregation (fetch the window's rows, `reduce` into a `Map<user_id, count>`, same pattern the current code already uses for dedup) is the simplest option and should be tried first; only move to a Postgres RPC/function if the row volume in a 60-day window turns out to be large enough to matter (PostgREST has no `GROUP BY`).
3. Caps at some number of distinct users (reuse the existing constants — `RECENT_CHECKIN_SNAPSHOT_DISTINCT_LIMIT` / the neighborhood equivalent, currently 12) — see open question 4 below on whether that number should change now that repeats are shown via size instead of extra slots.
4. Resolves each capped user's *live* mushroom via `resolveMushroomConfig(userId, mushroomCustomization)`, fetched with a batched `app_user` lookup (`.in("id", userIds)`) rather than reading `checkin.mushroom_snapshot`.

**Index:** today's checkin indexes are all `user_id`-first (`checkin_user_venue_checked_in_at_idx`, `checkin_user_checked_in_at_idx` — see `supabase/migrations/20260706040000_business_claims_and_checkins.sql:60` and `20260707030000_checkin_poi_target.sql:16`). A venue-scoped, date-windowed query wants `checkin (venue_id, checked_in_at desc)`; the neighborhood-scoped query joins through `venue.neighborhood_id` so benefits from the same index plus the existing `venue` PK. Add a migration for `checkin_venue_checked_in_at_idx`; confirm with `EXPLAIN` during implementation rather than assuming.

**Type changes** (`packages/types/src/index.ts`) — replace `recent_checkin_mushrooms: MushroomSnapshot[]` on `VenueDetail` (line 188) and `NeighborhoodProfile` (line 639) with a shape that carries the visit count:

```ts
export interface RecentVisitorMushroom {
  mushroom: MushroomConfig;
  visitCount: number;
}
// ...
recent_checkin_mushrooms: RecentVisitorMushroom[];
```

**Component changes** (`apps/web/src/app/MushroomField.tsx`):

- Today every mushroom in the field renders at a fixed `size={18}` (line 114). Add per-mushroom size scaling driven by `visitCount` when the new shape is passed — e.g. `size = BASE_SIZE * clamp(Math.sqrt(visitCount), 1, MAX_SCALE)`, mirroring the `sqrt`-based compression this component already uses elsewhere (its `count` prop) so a 10-visit regular doesn't blow out the card.
- `NeighborhoodSummaryCard.tsx:75` and `LocationSummaryCard.tsx:93` — change `count={Math.sqrt(neighborhood.checkin_count)}` / `count={Math.sqrt(location.checkin_count)}` (all-time total) to the number of distinct visitors actually returned for the 60-day window (e.g. `count={neighborhood.recent_checkin_mushrooms.length}`), since repeats are now expressed as size rather than extra mosaic slots.
- The existing "Check-ins" `StatCard` keeps showing the all-time total unchanged — only the decorative mushroom field switches to the 60-day live view. (Open question 3 below.)

**Explicitly out of scope:** `checkin.mushroom_snapshot` and its write path stay as-is; only these two card reads stop consuming it.

**Tests to update:** `apps/api/src/locations/locations.test.ts:323` and `apps/api/src/checkins/checkin.test.ts:297-336` currently assert the old snapshot/dedup-only shape.

## Cross-cutting notes

- No changes anticipated to `docs/url-map.md` (no new/changed routes) or to the marketing Terms/Privacy/FAQ pages (no new data collection or sharing — this is a display/aggregation change over data that's already public in the same form).
- `packages/ui`'s exported `mushroomConfigForUser`/`resolveMushroomConfig`/`MushroomMark` need no changes — only the app-level `MushroomField` composite and the API resolvers change.
- Version bump / CHANGELOG entry / branch naming follow the normal `BACKLOG.md` ship workflow at implementation time, not part of this doc.

## Open decisions to confirm before implementation

1. **Size-scaling curve** for visit-count → mushroom size. Recommendation: `sqrt`, capped, consistent with how this component already compresses its `count` prop elsewhere.
2. **Ordering when capping distinct visitors**: most-visits-first (leans into the "Mayor" framing — the most dedicated visitor is the one you see) vs. most-recent-first (matches today's behavior). Recommendation: most-visits-first, tie-broken by most-recent.
3. **Should the "Check-ins" stat number also become a 60-day figure**, or stay all-time? Recommendation: stay all-time — it's a different metric (lifetime popularity) from the decorative field (recent activity), and changing it would understate an established location/neighborhood's track record.
4. **Distinct-visitor cap**: keep the existing 12, or raise it now that repeat visits are expressed via size instead of consuming extra slots? Recommendation: keep 12 for the first cut, revisit if mosaics feel sparse in practice.

## Forager Collection (tangential — not detailed here)

The user separately raised a "Forager Collection" concept: a per-location (and per-neighbor-connection) unique, non-customizable mushroom "species," first-collected on first check-in/connection, with quantity shown for repeats and generated names for flavor. This is a substantially larger, more speculative feature (new schema, new API surface, new profile page) and is tracked as its own backlog item (Ref 98) rather than planned in detail here — see that entry for the concept summary and open questions.
