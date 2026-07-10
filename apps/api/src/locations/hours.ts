const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseClockTime(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(text.trim());
  if (!match) return null;
  const meridiem = match[3].toUpperCase();
  let hours = Number(match[1]) % 12;
  if (meridiem === "PM") hours += 12;
  return hours * 60 + Number(match[2]);
}

// Parses Google's weekday-hours lines (VenueEnrichmentCache.hours, e.g.
// ["Monday: 9:00 AM – 5:00 PM", ...]) to answer "is this location open
// right now". Handles "Closed" and "Open 24 hours" lines and overnight
// ranges (e.g. "6:00 PM – 2:00 AM"); a line that doesn't match the
// expected format is treated as unknown/closed rather than guessed at.
export function isOpenNow(hours: string[], now: Date = new Date()): boolean {
  const todayName = WEEKDAYS[now.getDay()];
  const line = hours.find((entry) => entry.startsWith(todayName));
  if (!line) return false;

  const rest = line.slice(todayName.length).replace(/^:\s*/, "").trim();
  if (/closed/i.test(rest)) return false;
  if (/24 hours/i.test(rest)) return true;

  const [startText, endText] = rest.split(/[–-]/).map((part) => part.trim());
  if (!startText || !endText) return false;

  const start = parseClockTime(startText);
  const end = parseClockTime(endText);
  if (start === null || end === null) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (end <= start) {
    // Overnight range -- open if at/after the start or before the end.
    return nowMinutes >= start || nowMinutes < end;
  }
  return nowMinutes >= start && nowMinutes < end;
}
