import { EventListItem } from "../../../../EventListItem";
import { FollowEventButton } from "../../../../FollowEventButton";
import { SAMPLE_EVENTS } from "../demoData";

export default function EventListItemDemoPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Event row</h1>
        <p className="mt-1 text-sm text-muted">
          EventListItem + FollowEventButton states, as rendered on /location/[id]/events and
          /neighborhoods/[slug]&apos;s Upcoming events tab. Click a row to expand its description.
        </p>
      </div>

      {SAMPLE_EVENTS.map(({ label, event, mockFollowing }) => (
        <div key={event.id} className="flex flex-col gap-2">
          <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">{label}</p>
          <ul>
            <EventListItem
              event={event}
              actions={<FollowEventButton eventId={event.id} mockFollowing={mockFollowing} />}
            />
          </ul>
        </div>
      ))}
    </section>
  );
}
