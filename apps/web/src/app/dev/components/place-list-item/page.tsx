import { PlaceListItem } from "../../../PlaceListItem";
import { SlideToCheckIn } from "../../../SlideToCheckIn";
import { CHECKIN_STATES } from "../demoData";

export default function PlaceListItemDemoPage() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
        Venue row + check-in slider (PlaceListItem, as rendered on /checkin)
      </h2>

      {/* One PlaceListItem per state -- the exact same row/action-slot
          component NearestVenues renders, at its real full width, rather
          than a bespoke wrapper that could drift out of sync with it. */}
      <div className="flex flex-col gap-6">
        {CHECKIN_STATES.map(({ label, status }, index) => (
          <div key={label} className="flex flex-col gap-2">
            <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
            <PlaceListItem
              href="/dev/components/place-list-item"
              id={`demo-venue-${index}`}
              name="Wilson Tax And Accounting"
              subtitle="Accounting & Tax · 9057 Greenwood Ave N c206, Seattle, WA 98103, USA"
              action={<SlideToCheckIn locationId={`demo-venue-${index}`} mockResolution={status} />}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
