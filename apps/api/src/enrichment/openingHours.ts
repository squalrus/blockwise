const DAY_ORDER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DAY_NAMES: Record<string, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};

function expandDayToken(token: string): string[] {
  const rangeMatch = /^(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)$/.exec(token);
  if (!rangeMatch) return DAY_ORDER.includes(token) ? [token] : [];

  const start = DAY_ORDER.indexOf(rangeMatch[1]);
  const end = DAY_ORDER.indexOf(rangeMatch[2]);
  const days: string[] = [];
  for (let i = start; ; i = (i + 1) % 7) {
    days.push(DAY_ORDER[i]);
    if (i === end) break;
  }
  return days;
}

function to12Hour(hhmm: string): string | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  const h24 = Number(match[1]);
  if (h24 > 24) return null;
  const meridiem = h24 >= 12 && h24 < 24 ? "PM" : "AM";
  const h12raw = h24 % 12;
  const h12 = h12raw === 0 ? 12 : h12raw;
  return `${h12}:${match[2]} ${meridiem}`;
}

// Converts a (subset of) OSM opening_hours syntax
// (https://wiki.openstreetmap.org/wiki/Key:opening_hours), as returned by
// Geoapify's Place Details, into the weekday-line format
// (["Monday: 9:00 AM – 5:00 PM", ...]) that apps/api/src/locations/hours.ts's
// parser already understands -- a compatibility shim, not a spec-compliant
// OSM parser. Handles ';'-separated rules of the common "day-range
// time-range" shape (e.g. "Mo-Fr 09:00-18:00; Sa 10:00-14:00; Su off"),
// "24/7", and "off"/"closed" days, with later rules overriding earlier ones
// for the same day (per spec). Anything else -- comments, "PH" (public
// holiday) rules, multiple comma-separated time ranges in one rule (e.g. a
// lunch-break split) -- is skipped for that rule rather than guessed at: a
// day no rule resolves simply has no line, which parseTodayLine already
// treats as "unknown" (isOpenNow returns false, resolveOpenStatus returns
// null), the same graceful fallback as a missing Google line used to be.
export function parseOsmOpeningHours(raw: string): string[] {
  const lines = new Map<string, string>();

  for (const ruleText of raw.split(";")) {
    const rule = ruleText.trim();
    if (!rule) continue;

    if (/^24\/7$/i.test(rule)) {
      for (const day of DAY_ORDER) lines.set(day, `${DAY_NAMES[day]}: Open 24 hours`);
      continue;
    }

    const match = /^([A-Za-z,-]+)\s+(.+)$/.exec(rule);
    if (!match) continue;
    const [, dayToken, timeToken] = match;
    const days = dayToken.split(",").flatMap(expandDayToken);
    if (days.length === 0) continue;

    const trimmedTime = timeToken.trim();
    if (/^(off|closed)$/i.test(trimmedTime)) {
      for (const day of days) lines.set(day, `${DAY_NAMES[day]}: Closed`);
      continue;
    }

    const timeMatch = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(trimmedTime);
    if (!timeMatch) continue;
    const start = to12Hour(timeMatch[1]);
    const end = to12Hour(timeMatch[2]);
    if (!start || !end) continue;

    for (const day of days) lines.set(day, `${DAY_NAMES[day]}: ${start} – ${end}`);
  }

  return DAY_ORDER.map((day) => lines.get(day)).filter((line): line is string => Boolean(line));
}
