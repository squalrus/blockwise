import ical, { type ParameterValue, type VEvent } from "node-ical";
import type { ImportedEventInput } from "./repository";

// A recurring VEVENT has no bounded occurrence count of its own (e.g. "every
// week, forever") -- expandRecurringEvent needs a finite window, and the
// event table has no recurrence concept of its own, so each occurrence
// becomes its own row within this window.
const RECURRENCE_WINDOW_DAYS = 180;
const MAX_OCCURRENCES_PER_EVENT = 25;

export function normalizeFeedUrl(feedUrl: string): string {
  return feedUrl.replace(/^webcal:\/\//i, "https://");
}

export function isValidFeedUrl(feedUrl: string): boolean {
  try {
    const url = new URL(normalizeFeedUrl(feedUrl));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// SUMMARY/DESCRIPTION/LOCATION come back as a plain string, or as {val,
// params} when the property carries iCalendar parameters (e.g. LANGUAGE) --
// see node-ical's ParameterValue.
function textValue(value: ParameterValue | undefined): string {
  if (value === undefined) return "";
  return (typeof value === "string" ? value : value.val).trim();
}

function locationOf(event: VEvent): string | null {
  return textValue(event.location) || null;
}

// Fetches and parses a .ics/iCalendar feed (the "webcal://" scheme some
// calendar tools use, e.g. The Events Calendar plugin, is otherwise
// identical to https:// -- normalizeFeedUrl swaps the scheme so node-ical
// can fetch it like any other URL).
export async function fetchIcalFeed(feedUrl: string): Promise<ImportedEventInput[]> {
  const data = await ical.async.fromURL(normalizeFeedUrl(feedUrl));
  const events: ImportedEventInput[] = [];
  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + RECURRENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  for (const component of Object.values(data)) {
    if (!component || component.type !== "VEVENT") continue;
    const vevent = component as VEvent;
    if (!vevent.start) continue;

    const title = textValue(vevent.summary) || "Untitled event";
    const description = textValue(vevent.description);

    if (vevent.rrule) {
      const instances = ical.expandRecurringEvent(vevent, { from: windowStart, to: windowEnd });
      for (const instance of instances.slice(0, MAX_OCCURRENCES_PER_EVENT)) {
        events.push({
          // Per-occurrence uid: the feed's own uid identifies the whole
          // recurring series, not one instance, so it can't be the upsert
          // key on its own -- appending the occurrence start makes each
          // instance dedupe independently on re-sync.
          uid: `${vevent.uid}::${instance.start.toISOString()}`,
          title: textValue(instance.summary) || title,
          description,
          startTime: instance.start.toISOString(),
          endTime: instance.end.toISOString(),
          location: locationOf(instance.event),
        });
      }
      continue;
    }

    if (!vevent.end) continue;
    events.push({
      uid: vevent.uid ?? `${title}-${vevent.start.toISOString()}`,
      title,
      description,
      startTime: vevent.start.toISOString(),
      endTime: vevent.end.toISOString(),
      location: locationOf(vevent),
    });
  }

  return events;
}
