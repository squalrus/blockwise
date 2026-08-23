import { PoweredByGoogle } from "@blockwise/ui";
import { ActivityFeed } from "../../../ActivityFeed";
import { EnrichmentAbout, EnrichmentPhotos, EnrichmentReviews } from "../../../EnrichmentSection";
import { EventListItem } from "../../../EventListItem";
import { FollowEventButton } from "../../../FollowEventButton";
import { ClaimBusinessForm } from "../../../location/[id]/ClaimBusinessForm";
import { CouponsSection } from "../../../location/[id]/CouponsSection";
import { FavoriteButton } from "../../../location/[id]/FavoriteButton";
import { LocationSummaryCard } from "../../../location/[id]/LocationSummaryCard";
import { LocationTabs } from "../../../location/[id]/LocationTabs";
import {
  SAMPLE_BUSINESS_LOCATION,
  SAMPLE_LOCATION_ACTIVITY,
  SAMPLE_LOCATION_EVENTS,
  SAMPLE_LOCATION_LEADERBOARD,
} from "../demoData";

// Full sample business location page, assembled from the same components
// location/[id]/{layout,page,about/page,reviews/page,coupons/page,events/page,leaderboard/page}.tsx
// render across their real routes. LocationTabs renders for visual fidelity,
// but its links target an id that doesn't exist in the database and won't
// show an active tab here, since this route's own pathname never matches --
// fine for reviewing the tab bar's look, not meant to be clicked through.
// Every tab's content is stacked below it instead of behind real navigation.
// CouponsSection/ClaimBusinessForm still fetch live (no mock prop exists for
// either) -- against a venue id that doesn't exist in the database, so they
// render their empty/signed-out states rather than throwing.
export default function LocationPageDemoPage() {
  const location = SAMPLE_BUSINESS_LOCATION;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Location page</h1>
        <p className="mt-1 text-sm text-muted">A full sample business location page, as rendered on /location/[id].</p>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-4">
        <LocationSummaryCard
          location={location}
          favoriteAction={<FavoriteButton venueId={location.id} mockFavorited />}
        />

        <LocationTabs locationId={location.id} isBusiness enrichment={location.enrichment} />

        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Spore Feed</p>
            <ActivityFeed items={SAMPLE_LOCATION_ACTIVITY} emptyMessage="No check-ins yet." />
          </div>

          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">About</p>
            <div className="flex flex-col gap-2.5">
              <EnrichmentPhotos enrichment={location.enrichment} photoUrl={() => ""} alt={location.name} />
              <EnrichmentAbout enrichment={location.enrichment} emptyLabel="No enrichment data available for this venue." />
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Reviews</p>
            <EnrichmentReviews enrichment={location.enrichment} />
            {location.enrichment && <PoweredByGoogle />}
          </div>

          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Coupons</p>
            <CouponsSection venueId={location.id} emptyMessage="No coupons available." />
          </div>

          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Events</p>
            <ul className="flex flex-col gap-2.5">
              {SAMPLE_LOCATION_EVENTS.map((e) => (
                <EventListItem key={e.id} event={e} showSource={false} actions={<FollowEventButton eventId={e.id} />} />
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Leaderboard</p>
            <ul className="flex flex-col gap-2 text-sm">
              {SAMPLE_LOCATION_LEADERBOARD.map((visitor, i) => (
                <li key={visitor.username ?? i} className="rounded-2xl bg-card-alt px-4 py-3 font-bold text-foreground">
                  #{i + 1} {visitor.displayName ?? visitor.username} · {visitor.visitCount} check-ins
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ClaimBusinessForm venueId={location.id} />
      </div>
    </section>
  );
}
