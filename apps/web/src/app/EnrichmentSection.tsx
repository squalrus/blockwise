import type { EnrichmentAtmosphere, VenueEnrichmentCache } from "@blockwise/types";
import { EnrichmentPhotoGallery } from "./EnrichmentPhotoGallery";
import { VenueHours } from "./VenueHours";

// Amber is light-toned in both themes, so it always needs ink (always-dark)
// text; orange/purple/green get brighter in dark mode and need on-accent
// (theme-flipping) text instead -- see globals.css's --ink/--on-accent notes.
const AVATAR_ACCENTS = [
  { bg: "var(--brand-amber)", text: "text-ink" },
  { bg: "var(--brand-purple)", text: "text-on-accent" },
  { bg: "var(--brand-orange)", text: "text-on-accent" },
  { bg: "var(--brand-green)", text: "text-on-accent" },
];

function avatarAccentFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_ACCENTS[Math.abs(hash) % AVATAR_ACCENTS.length];
}

const ATMOSPHERE_LABELS: { key: keyof EnrichmentAtmosphere; label: string }[] = [
  { key: "dine_in", label: "Dine-in" },
  { key: "takeout", label: "Takeout" },
  { key: "delivery", label: "Delivery" },
  { key: "outdoor_seating", label: "Outdoor seating" },
  { key: "reservable", label: "Reservations" },
  { key: "good_for_children", label: "Good for kids" },
];

export function formatPriceTier(priceTier: string | null): string | null {
  if (!priceTier) return null;
  // Google's Places API (New) priceLevel enum, e.g. "PRICE_LEVEL_MODERATE".
  return priceTier.replace("PRICE_LEVEL_", "").replace("_", " ").toLowerCase();
}

// Google Places enrichment (rating/hours/photos/reviews) is shared by venues
// and POIs that trace back to the same underlying Google Place (BACKLOG.md
// Ref 59) -- these three blocks were originally venue-only and are now
// reused by the POI detail page too.

export function EnrichmentPhotos({
  enrichment,
  photoUrl,
  alt,
}: {
  enrichment: VenueEnrichmentCache | null;
  photoUrl: (index: number) => string;
  alt: string;
}) {
  if (!enrichment || enrichment.photo_refs.length === 0) {
    return null;
  }
  // enrichment.photo_refs is already capped server-side (MAX_GALLERY_PHOTOS
  // in enrichment/refresh.ts) -- Places API photos can't be cached under
  // Google's ToS, so requesting fewer of them is the only lever for cost.
  // photoUrl is resolved to plain strings here, on the server, since a
  // function prop can't cross into EnrichmentPhotoGallery's Client
  // Component boundary -- see that file for the lazy-loading/broken-image
  // handling this delegates to.
  return <EnrichmentPhotoGallery photoUrls={enrichment.photo_refs.map((_, index) => photoUrl(index))} alt={alt} />;
}

export function EnrichmentAbout({
  enrichment,
  emptyLabel,
}: {
  enrichment: VenueEnrichmentCache | null;
  emptyLabel: string;
}) {
  const priceTier = formatPriceTier(enrichment?.price_tier ?? null);

  return (
    <div className="rounded-2xl bg-card-alt px-5 py-4">
      <p className="text-xs font-extrabold tracking-wide text-muted uppercase">About</p>
      {enrichment ? (
        <div className="mt-2 flex flex-col gap-3 text-sm">
          {priceTier && <p className="font-bold text-foreground">Price: {priceTier}</p>}
          {enrichment.editorial_summary && (
            <p className="text-body-text">{enrichment.editorial_summary}</p>
          )}

          {(enrichment.phone || enrichment.website) && (
            <div className="flex flex-wrap gap-4 font-bold">
              {enrichment.phone && (
                <a href={`tel:${enrichment.phone}`} className="text-brand-purple hover:text-brand-orange">
                  {enrichment.phone}
                </a>
              )}
              {enrichment.website && (
                <a
                  href={enrichment.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-purple hover:text-brand-orange"
                >
                  Website
                </a>
              )}
            </div>
          )}

          {enrichment.hours && enrichment.hours.length > 0 && <VenueHours hours={enrichment.hours} />}

          {enrichment.atmosphere && (
            <div className="flex flex-wrap gap-2">
              {ATMOSPHERE_LABELS.filter(({ key }) => enrichment.atmosphere![key]).map(({ key, label }) => (
                <span key={key} className="rounded-full bg-card px-2.5 py-1 text-xs font-bold text-body-text">
                  {label}
                </span>
              ))}
            </div>
          )}

          <p className="text-xs font-bold text-muted">
            Last refreshed {new Date(enrichment.fetched_at).toLocaleString()}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-sm text-muted">{emptyLabel}</p>
      )}
    </div>
  );
}

// Aggregate rating (Google's overall place rating, distinct from each
// individual review's own star count below) used to live in
// LocationSummaryCard's header -- moved here so both it and the sampled
// reviews it summarizes live in one place, and shown even when Google
// returned a rating but no individual reviews to list.
export function EnrichmentReviews({ enrichment }: { enrichment: VenueEnrichmentCache | null }) {
  if (!enrichment || (enrichment.rating == null && enrichment.reviews.length === 0)) return null;

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <p className="text-xs font-extrabold tracking-wide text-muted uppercase">Reviews</p>
        {enrichment.rating != null && (
          <span className="flex items-center gap-1 text-sm font-extrabold text-foreground">
            ★ {enrichment.rating}
          </span>
        )}
      </div>
      {enrichment.reviews.length > 0 && (
        <ul className="flex flex-col gap-2">
          {/* Latest 3 -- reviews are sorted newest-first server-side
              (enrichment/refresh.ts's mapPlaceDetails) since the Places API
              has no request param for review order, so this slice really is
              the most recent, not just the first 3 of Google's own order. */}
          {enrichment.reviews.slice(0, 3).map((review, index) => {
            const author = review.author_name ?? "Neighbor";
            const accent = avatarAccentFor(author);
            return (
              <li key={index} className="rounded-2xl bg-card-alt px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6.5 w-6.5 items-center justify-center rounded-full text-xs font-extrabold ${accent.text}`}
                    style={{ backgroundColor: accent.bg }}
                  >
                    {author.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[12.5px] font-extrabold text-foreground">
                    {author}
                    {review.rating != null ? ` ${"★".repeat(review.rating)}` : ""}
                  </span>
                  {review.published_at && (
                    <span className="ml-auto text-[11px] font-bold text-muted">
                      {new Date(review.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {review.text && <p className="mt-2 text-[12.5px] text-body-text">{review.text}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
