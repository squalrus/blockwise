import type { CheckinHistoryItem } from "@blockwise/types";

const TIMELINE_COLORS = ["#E8542A", "#4C8C4A", "#8B5FBF", "#F2A93B"];

// Shared "recent check-ins" timeline (a colored dot per row on a connecting
// line) used by both the private account page and public profile pages, so
// the two present check-in history identically.
export function CheckinTimeline({
  checkins,
  emptyMessage,
}: {
  checkins: CheckinHistoryItem[];
  emptyMessage: string;
}) {
  if (checkins.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="relative pl-4.5">
      <div className="absolute top-1.5 bottom-1.5 left-1 w-0.5 bg-border" />
      <ul className="flex flex-col gap-3.5">
        {checkins.map((checkin, index) => (
          <li key={`${checkin.venue_id}-${checkin.checked_in_at}-${index}`} className="relative">
            <span
              className="absolute top-1 -left-4.5 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: TIMELINE_COLORS[index % TIMELINE_COLORS.length] }}
            />
            <a
              href={`/location/${checkin.venue_id}`}
              className="text-sm font-extrabold text-foreground hover:text-brand-purple"
            >
              {checkin.name}
            </a>
            <p className="text-xs font-bold text-muted">{new Date(checkin.checked_in_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
