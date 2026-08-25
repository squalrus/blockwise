import { PlaceListItem } from "../../../../PlaceListItem";
import { SlideToCheckIn } from "../../../../SlideToCheckIn";
import { CHECKIN_STATES } from "../demoData";

export default function PlaceListItemDemoPage() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Venue row</h1>
        <p className="mt-1 text-sm text-muted">PlaceListItem + check-in slider, as rendered on /checkin.</p>
      </div>

      {/* One PlaceListItem per state -- the exact same row/action-slot
          component NearestVenues renders, at its real full width, rather
          than a bespoke wrapper that could drift out of sync with it. */}
      <div className="flex flex-col gap-6">
        {CHECKIN_STATES.map(({ label, status }, index) => (
          <div key={label} className="flex flex-col gap-2">
            <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
            <PlaceListItem
              href="/admin/super/components/place-list-item"
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
