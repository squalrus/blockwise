import type { VenueAnalyticsTopFollowedEvent } from "@blockwise/types";

const COLOR = "var(--brand-purple)";

function formatEventDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Mirrors TopVenuesLeaderboard's meter-bar rows (neighborhood analytics),
// minus the link out -- events don't have their own detail page (they're
// only ever shown inline in lists/modals), so each row is plain text.
// A raw follows-over-time count doesn't say *which* event is resonating;
// this is the per-event breakdown that does.
export function TopFollowedEventsList({ events }: { events: VenueAnalyticsTopFollowedEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">No event follows in this window yet.</p>;
  }

  const max = Math.max(...events.map((e) => e.follow_count));

  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((event, i) => (
        <li key={event.event_id} className="flex items-center gap-3 px-1 py-1">
          <span className="w-4 shrink-0 text-right font-mono text-[11px] text-muted">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-bold text-foreground">
                {event.title} <span className="font-normal text-muted">· {formatEventDate(event.start_time)}</span>
              </span>
              <span className="shrink-0 font-mono text-xs font-bold" style={{ color: COLOR }}>
                {event.follow_count}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/15">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(4, (event.follow_count / max) * 100)}%`, background: COLOR }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
