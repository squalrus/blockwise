const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseClockTime(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(text.trim());
  if (!match) return null;
  const meridiem = match[3].toUpperCase();
  let hours = Number(match[1]) % 12;
  if (meridiem === "PM") hours += 12;
  return hours * 60 + Number(match[2]);
}

// Inverse of parseClockTime, dropping the ":00" for an on-the-hour time
// (BACKLOG.md Ref 101 redesign's "Open now · until 6 PM" pill) -- matches
// the compact style Google's own weekday-hours lines don't bother with.
function formatClockTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${meridiem}` : `${h12}:${String(m).padStart(2, "0")} ${meridiem}`;
}

type TodayLine = { kind: "closed" } | { kind: "24h" } | { kind: "ranged"; start: number; end: number };

// Shared first step behind isOpenNow/resolveOpenStatus below: finds and
// parses today's line from Google's weekday-hours lines
// (VenueEnrichmentCache.hours, e.g. ["Monday: 9:00 AM – 5:00 PM", ...]).
// Handles "Closed" and "Open 24 hours" lines; a missing or unparseable line
// is null (unknown), left for the caller to treat as closed/no status.
function parseTodayLine(hours: string[], now: Date): TodayLine | null {
  const todayName = WEEKDAYS[now.getDay()];
  const line = hours.find((entry) => entry.startsWith(todayName));
  if (!line) return null;

  const rest = line.slice(todayName.length).replace(/^:\s*/, "").trim();
  if (/closed/i.test(rest)) return { kind: "closed" };
  if (/24 hours/i.test(rest)) return { kind: "24h" };

  const [startText, endText] = rest.split(/[–-]/).map((part) => part.trim());
  if (!startText || !endText) return null;

  const start = parseClockTime(startText);
  const end = parseClockTime(endText);
  if (start === null || end === null) return null;

  return { kind: "ranged", start, end };
}

function isWithinRange(start: number, end: number, nowMinutes: number): boolean {
  // Overnight range -- open if at/after the start or before the end.
  return end <= start ? nowMinutes >= start || nowMinutes < end : nowMinutes >= start && nowMinutes < end;
}

// Answers "is this location open right now" -- used to filter the
// neighborhood Today tab's "Open now" section.
export function isOpenNow(hours: string[], now: Date = new Date()): boolean {
  const line = parseTodayLine(hours, now);
  if (!line) return false;
  if (line.kind === "closed") return false;
  if (line.kind === "24h") return true;
  return isWithinRange(line.start, line.end, now.getHours() * 60 + now.getMinutes());
}

export interface VenueOpenStatus {
  open: boolean;
  // Closing time (when open) or next opening time (when closed), formatted
  // for display -- null for a 24-hour location (open, nothing to show) or
  // when hours don't specify a boundary for the closed case.
  time: string | null;
}

// Richer variant of isOpenNow for UI display (BACKLOG.md Ref 101 redesign's
// "Open now · until X" pill and the neighborhood Today tab's matching
// subtitle) -- same parsing, but also returns the boundary time so callers
// don't need their own copy of this parsing logic. Null when today's line
// is missing or unparseable (same "unknown" case isOpenNow treats as
// closed) -- callers render no pill at all rather than guessing.
export function resolveOpenStatus(hours: string[], now: Date = new Date()): VenueOpenStatus | null {
  const line = parseTodayLine(hours, now);
  if (!line) return null;
  if (line.kind === "closed") return { open: false, time: null };
  if (line.kind === "24h") return { open: true, time: null };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const open = isWithinRange(line.start, line.end, nowMinutes);
  return open ? { open: true, time: formatClockTime(line.end) } : { open: false, time: formatClockTime(line.start) };
}
