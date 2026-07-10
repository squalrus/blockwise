import { describe, expect, it } from "vitest";
import {
  createEvent,
  createEventForNeighborhood,
  listEventsForNeighborhood,
  listEventsForVenue,
  listUpcomingEventsForNeighborhood,
} from "./events";
import type { CreateEventInput, EventRecord, EventRepository } from "./repository";

// In-memory fake, mirroring the pattern used for AnnouncementRepository tests.
class FakeEventRepository implements EventRepository {
  events: EventRecord[] = [];
  // venueId -> { neighborhoodId, name }, so listEventsForNeighborhoodAndVenues
  // can resolve which neighborhood a venue-scoped event belongs to, mirroring
  // the real repository's join against the venue table.
  venues = new Map<string, { neighborhoodId: string; name: string }>();
  private nextId = 1;

  registerVenue(venueId: string, neighborhoodId: string, name: string) {
    this.venues.set(venueId, { neighborhoodId, name });
  }

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const record: EventRecord = {
      id: `event-${this.nextId++}`,
      venueId: input.venueId ?? null,
      neighborhoodId: input.neighborhoodId ?? null,
      venueName: input.venueId ? (this.venues.get(input.venueId)?.name ?? null) : null,
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      createdAt: new Date().toISOString(),
    };
    this.events.push(record);
    return record;
  }

  async listEventsForVenue(venueId: string): Promise<EventRecord[]> {
    return this.events.filter((e) => e.venueId === venueId);
  }

  async listEventsForNeighborhood(neighborhoodId: string): Promise<EventRecord[]> {
    return this.events.filter((e) => e.neighborhoodId === neighborhoodId);
  }

  async listEventsForNeighborhoodAndVenues(neighborhoodId: string): Promise<EventRecord[]> {
    return this.events
      .filter(
        (e) =>
          e.neighborhoodId === neighborhoodId ||
          (e.venueId && this.venues.get(e.venueId)?.neighborhoodId === neighborhoodId)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
}

const VALID_INPUT = {
  title: "Live music night",
  description: "Local band on the patio",
  startTime: "2026-08-01T18:00:00.000Z",
  endTime: "2026-08-01T21:00:00.000Z",
};

describe("createEvent", () => {
  it("creates an event with a valid time range", async () => {
    const repo = new FakeEventRepository();
    const result = await createEvent("venue-1", VALID_INPUT, repo);

    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.event.venue_id).toBe("venue-1");
      expect(result.event.title).toBe(VALID_INPUT.title);
    }
  });

  it("rejects an end_time at or before start_time", async () => {
    const repo = new FakeEventRepository();
    const result = await createEvent(
      "venue-1",
      { ...VALID_INPUT, endTime: VALID_INPUT.startTime },
      repo
    );
    expect(result).toEqual({ status: "invalid_time_range" });
  });

  it("rejects unparseable timestamps", async () => {
    const repo = new FakeEventRepository();
    const result = await createEvent("venue-1", { ...VALID_INPUT, startTime: "not-a-date" }, repo);
    expect(result).toEqual({ status: "invalid_time_range" });
  });
});

describe("listEventsForVenue", () => {
  it("only returns events for the requested venue", async () => {
    const repo = new FakeEventRepository();
    await createEvent("venue-1", VALID_INPUT, repo);
    await createEvent("venue-2", VALID_INPUT, repo);

    const results = await listEventsForVenue("venue-1", repo);
    expect(results).toHaveLength(1);
    expect(results[0].venue_id).toBe("venue-1");
  });
});

describe("createEventForNeighborhood", () => {
  it("creates a neighborhood-scoped event with no venue_id", async () => {
    const repo = new FakeEventRepository();
    const result = await createEventForNeighborhood("neighborhood-1", VALID_INPUT, repo);

    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.event.neighborhood_id).toBe("neighborhood-1");
      expect(result.event.venue_id).toBeNull();
    }
  });

  it("rejects an end_time at or before start_time", async () => {
    const repo = new FakeEventRepository();
    const result = await createEventForNeighborhood(
      "neighborhood-1",
      { ...VALID_INPUT, endTime: VALID_INPUT.startTime },
      repo
    );
    expect(result).toEqual({ status: "invalid_time_range" });
  });
});

describe("listEventsForNeighborhood", () => {
  it("only returns events for the requested neighborhood", async () => {
    const repo = new FakeEventRepository();
    await createEventForNeighborhood("neighborhood-1", VALID_INPUT, repo);
    await createEventForNeighborhood("neighborhood-2", VALID_INPUT, repo);
    await createEvent("venue-1", VALID_INPUT, repo);

    const results = await listEventsForNeighborhood("neighborhood-1", repo);
    expect(results).toHaveLength(1);
    expect(results[0].neighborhood_id).toBe("neighborhood-1");
  });
});

describe("listUpcomingEventsForNeighborhood", () => {
  it("merges neighborhood-owned and business events, sorted by start time", async () => {
    const repo = new FakeEventRepository();
    repo.registerVenue("venue-1", "neighborhood-1", "Phinney Farmers Market");
    repo.registerVenue("venue-2", "neighborhood-2", "Out-of-neighborhood Cafe");

    await createEventForNeighborhood("neighborhood-1", { ...VALID_INPUT, startTime: "2026-08-02T18:00:00.000Z", endTime: "2026-08-02T21:00:00.000Z" }, repo);
    await createEvent("venue-1", { ...VALID_INPUT, title: "Market day", startTime: "2026-08-01T10:00:00.000Z", endTime: "2026-08-01T14:00:00.000Z" }, repo);
    await createEvent("venue-2", VALID_INPUT, repo);
    await createEventForNeighborhood("neighborhood-3", VALID_INPUT, repo);

    const results = await listUpcomingEventsForNeighborhood("neighborhood-1", repo);

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Market day");
    expect(results[0].venue_name).toBe("Phinney Farmers Market");
    expect(results[1].neighborhood_id).toBe("neighborhood-1");
    expect(results[1].venue_name).toBeNull();
  });
});
