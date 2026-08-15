import { FavoriteButton } from "../../../location/[id]/FavoriteButton";
import { LocationSummaryCard } from "../../../location/[id]/LocationSummaryCard";
import { LOCATION_CARDS } from "../demoData";

export default function LocationCardDemoPage() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Location card</h1>
        <p className="mt-1 text-sm text-muted">LocationSummaryCard (business + POI), as rendered on /location/[id].</p>
      </div>

      <div className="flex flex-col gap-6">
        {LOCATION_CARDS.map(({ label, location, favorited }) => (
          <div key={location.id} className="flex flex-col gap-2">
            <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
            <LocationSummaryCard
              location={location}
              favoriteAction={<FavoriteButton venueId={location.id} mockFavorited={favorited} />}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
