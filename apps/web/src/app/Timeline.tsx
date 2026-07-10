import type { ReactNode } from "react";

const TIMELINE_COLORS = ["#E8542A", "#4C8C4A", "#8B5FBF", "#F2A93B"];

export interface TimelineItem {
  key: string;
  primary: ReactNode;
  timestamp: string;
}

// Shared "colored dot per row on a connecting line" timeline layout, used by
// CheckinTimeline (account page + public profile) and the neighborhood
// Recent activity tab so every chronological feed in the app reads the same
// way. `primary` is caller-supplied (a link for a checkin/favorite/challenge
// row, plain text + a badge glyph for a badge unlock) since what's being
// timelined differs by caller; the dot/line/timestamp chrome doesn't.
export function Timeline({ items, emptyMessage }: { items: TimelineItem[]; emptyMessage: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="relative pl-4.5">
      <div className="absolute top-1.5 bottom-1.5 left-1 w-0.5 bg-border" />
      <ul className="flex flex-col gap-3.5">
        {items.map((item, index) => (
          <li key={item.key} className="relative">
            <span
              className="absolute top-1 -left-4.5 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: TIMELINE_COLORS[index % TIMELINE_COLORS.length] }}
            />
            {item.primary}
            <p className="text-xs font-bold text-muted">{new Date(item.timestamp).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
