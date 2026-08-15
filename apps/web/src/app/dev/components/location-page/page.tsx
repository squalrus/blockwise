import { PoweredByGoogle } from "@blockwise/ui";
import { EnrichmentAbout, EnrichmentPhotos, EnrichmentReviews } from "../../../EnrichmentSection";
import { ClaimBusinessForm } from "../../../location/[id]/ClaimBusinessForm";
import { CouponsSection } from "../../../location/[id]/CouponsSection";
import { FavoriteButton } from "../../../location/[id]/FavoriteButton";
import { LocationSummaryCard } from "../../../location/[id]/LocationSummaryCard";
import { SAMPLE_BUSINESS_LOCATION, SAMPLE_LOCATION_EVENTS } from "../demoData";

// Full sample business location page, assembled from the same components
// /location/[id]/page.tsx renders, with SAMPLE_BUSINESS_LOCATION standing in
// for the server-fetched VenueDetail. CouponsSection/ClaimBusinessForm still
// fetch live (no mock prop exists for either) -- against a venue id that
// doesn't exist in the database, so they render their empty/signed-out
// states rather than throwing.
export default function LocationPageDemoPage() {
  const location = SAMPLE_BUSINESS_LOCATION;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Location page</h1>
        <p className="mt-1 text-sm text-muted">A full sample business location page, as rendered on /location/[id].</p>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-4">
        <EnrichmentPhotos enrichment={location.enrichment} photoUrl={() => ""} alt={location.name} />

        <LocationSummaryCard
          location={location}
          favoriteAction={<FavoriteButton venueId={location.id} mockFavorited />}
        />

        <EnrichmentAbout enrichment={location.enrichment} emptyLabel="No enrichment data available for this venue." />

        <EnrichmentReviews enrichment={location.enrichment} />

        {location.enrichment && <PoweredByGoogle />}

        <CouponsSection venueId={location.id} />

        <div>
          <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Upcoming events</p>
          <ul className="flex flex-col gap-2">
            {SAMPLE_LOCATION_EVENTS.map((e) => (
              <li key={e.id} className="rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
                <span className="font-extrabold text-foreground">{e.title}</span>
                <p className="mt-1 text-body-text">{e.description}</p>
                <p className="mt-1.5 text-xs font-bold text-muted">
                  {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <ClaimBusinessForm venueId={location.id} />
      </div>
    </section>
  );
}
