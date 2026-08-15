import { FavoriteButton } from "../../../location/[id]/FavoriteButton";
import { LocationSummaryCard } from "../../../location/[id]/LocationSummaryCard";
import { LOCATION_CARDS } from "../demoData";

export default function LocationCardDemoPage() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
        Location summary card (LocationSummaryCard, as rendered on /location/[id])
      </h2>

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
