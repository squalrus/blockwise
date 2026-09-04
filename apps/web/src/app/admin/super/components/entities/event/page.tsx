import { EventListItem } from "../../../../../EventListItem";
import { FollowEventButton } from "../../../../../FollowEventButton";
import { ActivityFeed } from "../../../../../ActivityFeed";
import { ACTIVITY_EVENT_FOLLOW, SAMPLE_EVENTS } from "../../demoData";

const EVENT = SAMPLE_EVENTS[0].event;

const EVENT_ACTIVE_MANUAL = SAMPLE_EVENTS.find((e) => e.event.id === "demo-event-1")!.event;
const EVENT_PENDING_ICAL = SAMPLE_EVENTS.find((e) => e.event.id === "demo-event-4")!.event;
const EVENT_HIDDEN_MANUAL = SAMPLE_EVENTS.find((e) => e.event.id === "demo-event-3")!.event;

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
          EventListItem with showSource (the default) plus the real neighborhood-admin Events tab actions, which
          branch on status and source: a pending (feed-synced, unreviewed) row gets Approve/Hide; every other row
          gets the usual Hide/Unhide toggle; Delete only ever shows for a manually-created event, since a re-sync
          would just recreate an imported one. Every other state lives under Components → Event row.
        </p>
        <div className="flex max-w-md flex-col gap-2.5">
          <ul>
            <EventListItem
              event={EVENT_ACTIVE_MANUAL}
              actions={
                <>
                  <button type="button" className="text-xs font-bold text-foreground hover:underline">
                    Hide
                  </button>
                  <button type="button" className="text-xs font-bold text-red-600 hover:underline dark:text-red-400">
                    Delete
                  </button>
                </>
              }
            />
          </ul>
          <ul>
            <EventListItem
              event={EVENT_PENDING_ICAL}
              actions={
                <>
                  <button type="button" className="text-xs font-bold text-brand-purple hover:underline">
                    Approve
                  </button>
                  <button type="button" className="text-xs font-bold text-foreground hover:underline">
                    Hide
                  </button>
                </>
              }
            />
          </ul>
          <ul>
            <EventListItem
              event={EVENT_HIDDEN_MANUAL}
              actions={
                <>
                  <button type="button" className="text-xs font-bold text-foreground hover:underline">
                    Unhide
                  </button>
                  <button type="button" className="text-xs font-bold text-red-600 hover:underline dark:text-red-400">
                    Delete
                  </button>
                </>
              }
            />
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
