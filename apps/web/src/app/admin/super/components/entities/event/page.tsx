import { EventListItem } from "../../../../../EventListItem";
import { FollowEventButton } from "../../../../../FollowEventButton";
import { ActivityFeed } from "../../../../../ActivityFeed";
import { ACTIVITY_EVENT_FOLLOW, SAMPLE_EVENTS } from "../../demoData";

const EVENT = SAMPLE_EVENTS[0].event;

// Entity-first view of "event" -- see entities/neighborhood/page.tsx for the
// pattern this follows. Events have no EntityTile/EntityTypeChip (EntityKind
// covers only business/poi/neighborhood) and aren't collectible (no "event"
// case in CollectionCardKind either) -- EventListItem is its only real
// visual form, in the two showSource modes production actually uses.
export default function EntityEventPage() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Event</h1>
        <p className="mt-1 text-sm text-muted">Every representation of an event across the app, side by side.</p>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">List row -- admin</p>
        <p className="text-xs text-muted">
          EventListItem with showSource (the default), as rendered on /location/[id]/events and the
          neighborhood-admin Events tab -- the feed-vs-manual source pill distinguishes an imported calendar event
          from a hand-created one. Every other state lives under Components → Event row.
        </p>
        <div className="max-w-md">
          <ul>
            <EventListItem event={EVENT} actions={<FollowEventButton eventId={EVENT.id} mockFollowing={false} />} />
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">List row -- public</p>
        <p className="text-xs text-muted">
          EventListItem with showSource=false, as rendered on the public Upcoming events tab and the neighborhood
          Today tab -- a visitor has no use for the feed-vs-manual distinction, so the pill is dropped entirely.
        </p>
        <div className="max-w-md">
          <ul>
            <EventListItem event={EVENT} showSource={false} actions={<FollowEventButton eventId={EVENT.id} mockFollowing />} />
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Activity feed mention</p>
        <p className="text-xs text-muted">
          ActivityFeed&apos;s &quot;followed &lt;event&gt; event&quot; row, as rendered on /location/[id], /neighborhoods/[slug],
          and /account. Full type coverage lives under Lists & sections → Activity feed.
        </p>
        <div className="max-w-md">
          <ActivityFeed items={[ACTIVITY_EVENT_FOLLOW]} emptyMessage="No activity yet." />
        </div>
      </div>
    </section>
  );
}
