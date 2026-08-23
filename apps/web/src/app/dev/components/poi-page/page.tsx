import { PoweredByGoogle } from "@blockwise/ui";
import { ActivityFeed } from "../../../ActivityFeed";
import { EnrichmentAbout, EnrichmentPhotos, EnrichmentReviews } from "../../../EnrichmentSection";
import { FavoriteButton } from "../../../location/[id]/FavoriteButton";
import { LocationSummaryCard } from "../../../location/[id]/LocationSummaryCard";
import { LocationTabs } from "../../../location/[id]/LocationTabs";
import { SAMPLE_POI_LOCATION } from "../demoData";

// Full sample POI page -- same shell as location-page, minus the
// business-only tabs (Coupons/Events/claim form), matching how LocationTabs
// and location/[id]/layout.tsx only render those for location.kind === "business".
export default function PoiPageDemoPage() {
  const location = SAMPLE_POI_LOCATION;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">POI page</h1>
        <p className="mt-1 text-sm text-muted">A full sample point-of-interest page, as rendered on /location/[id].</p>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-4">
        <LocationSummaryCard
          location={location}
          favoriteAction={<FavoriteButton venueId={location.id} mockFavorited={false} />}
        />

        <LocationTabs locationId={location.id} isBusiness={false} enrichment={location.enrichment} />

        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Spore Feed</p>
            <ActivityFeed items={[]} emptyMessage="No check-ins yet." />
          </div>

          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">About</p>
            <div className="flex flex-col gap-2.5">
              <EnrichmentPhotos enrichment={location.enrichment} photoUrl={() => ""} alt={location.name} />
              <EnrichmentAbout
                enrichment={location.enrichment}
                emptyLabel="No enrichment data available for this point of interest."
              />
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Reviews</p>
            <EnrichmentReviews enrichment={location.enrichment} />
            {location.enrichment && <PoweredByGoogle />}
          </div>
        </div>
      </div>
    </section>
  );
}
