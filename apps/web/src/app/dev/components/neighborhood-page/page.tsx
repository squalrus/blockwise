import { EventListItem } from "../../../EventListItem";
import { FollowEventButton } from "../../../FollowEventButton";
import { JoinNeighborhoodButton } from "../../../neighborhoods/[slug]/JoinNeighborhoodButton";
import { NeighborhoodSummaryCard } from "../../../neighborhoods/[slug]/NeighborhoodSummaryCard";
import { NeighborhoodTabs } from "../../../neighborhoods/[slug]/NeighborhoodTabs";
import { PlaceListItem } from "../../../PlaceListItem";
import { SAMPLE_NEIGHBORHOOD, SAMPLE_NEIGHBORHOOD_EVENTS, SAMPLE_OPEN_NOW } from "../demoData";

// Full sample neighborhood page, mirroring layout.tsx + page.tsx (the Today
// tab) for /neighborhoods/[slug]. NeighborhoodTabs renders for visual
// fidelity, but its links target a slug that doesn't exist in the database
// (SAMPLE_NEIGHBORHOOD.slug) and won't show an active tab here, since this
// route's own pathname never matches -- fine for reviewing the tab bar's
// look, not meant to be clicked through.
export default function NeighborhoodPageDemoPage() {
  const neighborhood = SAMPLE_NEIGHBORHOOD;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Neighborhood page</h1>
        <p className="mt-1 text-sm text-muted">
          A full sample neighborhood profile page, as rendered on /neighborhoods/[slug].
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-4">
        <NeighborhoodSummaryCard
          neighborhood={neighborhood}
          actions={<JoinNeighborhoodButton neighborhoodId={neighborhood.id} mockJoined={false} />}
        />

        <NeighborhoodTabs slug={neighborhood.slug} />

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-lg font-extrabold text-foreground">Today's events</h2>
            <ul className="flex flex-col gap-2.5">
              {SAMPLE_NEIGHBORHOOD_EVENTS.map((e) => (
                <EventListItem key={e.id} event={e} showSource={false} actions={<FollowEventButton eventId={e.id} />} />
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-heading text-lg font-extrabold text-foreground">Open now</h2>
            <ul className="flex flex-col gap-2">
              {SAMPLE_OPEN_NOW.map((location) => (
                <li key={location.id}>
                  <PlaceListItem
                    href={`/location/${location.id}`}
                    id={location.id}
                    name={location.name}
                    subtitle={location.category_name ?? (location.kind === "poi" ? "Point of interest" : "")}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
