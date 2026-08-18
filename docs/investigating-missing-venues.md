# Investigating missing venues (BACKLOG.md Ref 96)

A neighbor or admin reports a venue that isn't showing up in Blockwise. This
is a runbook for figuring out why, using the **Investigate a missing venue**
tool on the neighborhood-admin Locations tab
(`/admin/neighborhood/[slug]/locations/investigate`).

## Using the tool

1. Open the neighborhood's admin Locations tab and click **Investigate a
   missing venue**.
2. Search the venue's name or address. This runs a single Google Places
   [Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search)
   — unlike **Reimport Locations** (a full-boundary sweep restricted to the
   category taxonomy's mapped Google types), Text Search has no type
   restriction and isn't scoped to the boundary, so it can surface a venue
   the normal sync/review flow would never return.
3. Each result is annotated with the two most common reasons it looks
   "missing" despite Google knowing about it:
   - **Outside boundary** — inside Google's data, but outside the
     neighborhood's saved polygon, so the boundary-scoped sync/review flow
     never sees it.
   - **Already on record as "…"** — already a venue or POI here, just under
     a different name/spelling than what was searched.
4. A result not already on record and not permanently closed can be added
   directly as a business (pick a category, then **Add as venue**) — this
   goes through the same creation path as a "business" classification in the
   Reimport Locations review flow.

## Common reasons a venue doesn't turn up at all

If the tool returns nothing for a reasonable name/address, one of these is
usually why:

- **Not yet indexed by Google.** A newly-opened business can take days to
  weeks to appear in Places results. No workaround besides waiting and
  retrying, or [manually adding a point of
  interest](../apps/web/src/app/admin/neighborhood/%5BneighborhoodSlug%5D/PoiForm.tsx)
  if the neighborhood wants it visible before Google catches up.
- **Permanently closed.** `Reimport Locations` and the sync pipeline both
  skip `businessStatus: CLOSED_PERMANENTLY` results outright — the
  investigate tool still shows them (flagged), but they're deliberately never
  auto-imported.
- **Never listed on Google Maps at all.** Some small or informal businesses
  (a home-based shop, a pop-up, a strictly-in-person operation) simply have
  no Google Business Profile. The only path in is manual: [+ Add point of
  interest](../apps/web/src/app/admin/neighborhood/%5BneighborhoodSlug%5D/locations/page.tsx)
  (POIs only today — there's no manual "add a business" form outside the
  investigate tool's add-as-venue shortcut, since a business normally needs a
  real `google_place_id` to later support claiming).
- **Misspelled or transliterated name variants.** Try the address instead of
  the name, or a simpler/shorter version of the name — Text Search is a
  best-effort match, not exact.
- **On the margin of the neighborhood boundary.** A venue a block outside a
  hand-drawn or admin-redrawn boundary polygon is correctly excluded from
  that neighborhood's sync — check whether it's genuinely inside the
  intended area, and if so, the boundary itself may need redrawing (Boundary
  tab).

## Missing-venue reports feed this tool directly

Resolved: neighbors can report a missing venue two ways -- the "Report
missing venue" option under Send Feedback (any page), or the "Missing a
venue?" row at the bottom of `/checkin`'s nearest-venues list -- both POST a
`missing_venue`-type feedback submission (`venue_name` + `neighborhood_id`)
that pushes-notifies that neighborhood's own admins (not super admins) and
lands in `/admin/neighborhood/:slug/locations/reports`. Each report row has
its own "Quick investigate" button running this same Text Search lookup
inline, so triage and investigation happen in one place rather than an admin
copying a name over to this page by hand.

## Open questions (not yet built)

- Whether admins should be able to flag/veto a specific Places match as
  wrong (e.g. Google's Text Search returning a same-named venue in the wrong
  city) before it can be added as a venue — today the admin is trusted to
  visually check the address before clicking "Add as venue".
