import { describe, expect, it } from "vitest";
import { getHappeningNow } from "./happeningNow";
import type { CreateEventInput, EventRecord, EventRepository, IcalSyncResult } from "../events/repository";
import type { EnrichmentRepository, OpenNowCandidate, UpsertEnrichmentInput } from "../enrichment/repository";
import type { VenueEnrichmentCache } from "@blockwise/types";

class FakeEventRepository implements EventRepository {
  constructor(private readonly events: EventRecord[]) {}
  async createEvent(_input: CreateEventInput): Promise<EventRecord> {
    throw new Error("not implemented");
  }
  async listEventsForVenue(): Promise<EventRecord[]> {
    return this.events;
  }
  async listEventsForNeighborhood(): Promise<EventRecord[]> {
    return this.events;
  }
  async listEventsForNeighborhoodAndVenues(): Promise<EventRecord[]> {
    return this.events;
  }
  async upsertImportedEventsForNeighborhood(): Promise<IcalSyncResult> {
    throw new Error("not implemented");
  }
  async upsertImportedEventsForVenue(): Promise<IcalSyncResult> {
    throw new Error("not implemented");
  }
  async getEventOwner(): Promise<{ venueId: string | null; neighborhoodId: string | null } | null> {
    throw new Error("not implemented");
  }
  async deleteEvent(): Promise<void> {
    throw new Error("not implemented");
  }
  async setEventStatus(): Promise<EventRecord> {
    throw new Error("not implemented");
  }
}

class FakeEnrichmentRepository implements EnrichmentRepository {
  constructor(private readonly candidates: OpenNowCandidate[]) {}
  async getEnrichment(): Promise<VenueEnrichmentCache | null> {
    throw new Error("not implemented");
  }
  async upsertEnrichment(_input: UpsertEnrichmentInput): Promise<VenueEnrichmentCache> {
    throw new Error("not implemented");
  }
  async getPhotoReference(): Promise<string | null> {
    throw new Error("not implemented");
  }
  async listOpenNowCandidates(): Promise<OpenNowCandidate[]> {
    return this.candidates;
  }
}

function event(overrides: Partial<EventRecord>): EventRecord {
  return {
    id: "event-1",
    venueId: null,
    neighborhoodId: "neighborhood-1",
    venueName: null,
    title: "Farmers market",
    description: "Weekly market",
    startTime: "2026-07-10T16:00:00.000Z",
    endTime: "2026-07-10T20:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    source: "manual",
    externalUid: null,
    location: null,
    status: "active",
    ...overrides,
  };
}

describe("getHappeningNow", () => {
  it("includes events happening today (in progress or later today) and excludes events on other days", async () => {
    const events = new FakeEventRepository([
      event({ id: "live", startTime: "2026-07-10T16:00:00", endTime: "2026-07-10T20:00:00" }),
      event({ id: "later-today", startTime: "2026-07-10T22:00:00", endTime: "2026-07-10T23:00:00" }),
      event({ id: "tomorrow", startTime: "2026-07-11T09:00:00", endTime: "2026-07-11T10:00:00" }),
      event({ id: "yesterday", startTime: "2026-07-09T09:00:00", endTime: "2026-07-09T10:00:00" }),
    ]);
    const enrichment = new FakeEnrichmentRepository([]);

    // Local time (no "Z") for both `now` and the fixtures -- isToday compares
    // against `now`'s local calendar day, so this needs to hold regardless of
    // the machine's timezone, same reasoning as the "Open now" test below.
    const result = await getHappeningNow("neighborhood-1", events, enrichment, new Date("2026-07-10T18:00:00"));

    expect(result.today_events.map((e) => e.id).sort()).toEqual(["later-today", "live"]);
  });

  it("includes only locations currently open per their cached hours", async () => {
    const events = new FakeEventRepository([]);
    const enrichment = new FakeEnrichmentRepository([
      {
        id: "open-venue",
        name: "Herkimer Coffee",
        kind: "business",
        categoryName: "Coffee Shop",
        hours: ["Friday: 9:00 AM – 5:00 PM"],
      },
      {
        id: "closed-venue",
        name: "Woodland Park",
        kind: "poi",
        categoryName: null,
        hours: ["Friday: Closed"],
      },
    ]);

    // 2026-07-10 is a Friday, and 2pm falls within the 9am-5pm window above.
    // Local time (no "Z") so isOpenNow's weekday/hour extraction, which reads
    // local getDay()/getHours(), matches the hours string regardless of the
    // machine's timezone.
    const result = await getHappeningNow("neighborhood-1", events, enrichment, new Date("2026-07-10T14:00:00"));

    expect(result.open_now).toHaveLength(1);
    expect(result.open_now[0].id).toBe("open-venue");
  });
});
