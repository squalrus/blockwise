import type { CheckinHistoryItem } from "@blockwise/types";
import { Timeline } from "./Timeline";

// Shared "recent check-ins" timeline used by both the private account page
// and public profile pages, so the two present check-in history identically.
export function CheckinTimeline({
  checkins,
  emptyMessage,
}: {
  checkins: CheckinHistoryItem[];
  emptyMessage: string;
}) {
  return (
    <Timeline
      emptyMessage={emptyMessage}
      items={checkins.map((checkin, index) => ({
        key: `${checkin.venue_id}-${checkin.checked_in_at}-${index}`,
        primary: (
          <a
            href={`/location/${checkin.venue_id}`}
            className="text-sm font-extrabold text-foreground hover:text-brand-purple"
          >
            {checkin.name}
          </a>
        ),
        timestamp: checkin.checked_in_at,
      }))}
    />
  );
}
