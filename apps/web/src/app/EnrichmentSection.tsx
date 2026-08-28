import type { VenueEnrichmentCache } from "@blockwise/types";
import { VenueHours } from "./VenueHours";

// Geoapify Place Details enrichment (hours/phone/website/description) is
// shared by venues and POIs that trace back to the same underlying place
// (BACKLOG.md Ref 59). Ratings, reviews, and photo galleries were removed as
// product features in the Geoapify migration's Phase 3
// (docs/geoapify-migration-plan.md) -- no Geoapify equivalent exists.
export function EnrichmentAbout({
  enrichment,
  emptyLabel,
}: {
  enrichment: VenueEnrichmentCache | null;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl bg-card-alt px-5 py-4">
      <p className="text-xs font-extrabold tracking-wide text-muted uppercase">About</p>
      {enrichment ? (
        <div className="mt-2 flex flex-col gap-3 text-sm">
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
