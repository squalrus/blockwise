import { PoweredByGoogle } from "@blockwise/ui";
import { EnrichmentAbout, EnrichmentPhotos, EnrichmentReviews } from "../../../EnrichmentSection";
import { FavoriteButton } from "../../../location/[id]/FavoriteButton";
import { LocationSummaryCard } from "../../../location/[id]/LocationSummaryCard";
import { SAMPLE_POI_LOCATION } from "../demoData";

// Full sample POI page -- same shell as location-page, minus the
// business-only sections (coupons/events/claim), matching how
// /location/[id]/page.tsx only renders those for location.kind === "business".
export default function PoiPageDemoPage() {
  const location = SAMPLE_POI_LOCATION;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">POI page</h1>
        <p className="mt-1 text-sm text-muted">A full sample point-of-interest page, as rendered on /location/[id].</p>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-4">
        <EnrichmentPhotos enrichment={location.enrichment} photoUrl={() => ""} alt={location.name} />

        <LocationSummaryCard
          location={location}
          favoriteAction={<FavoriteButton venueId={location.id} mockFavorited={false} />}
        />

        <EnrichmentAbout
          enrichment={location.enrichment}
          emptyLabel="No enrichment data available for this point of interest."
        />

        <EnrichmentReviews enrichment={location.enrichment} />

        {location.enrichment && <PoweredByGoogle />}
      </div>
    </section>
  );
}
