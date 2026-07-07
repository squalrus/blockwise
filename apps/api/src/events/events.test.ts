import { describe, expect, it } from "vitest";
import { createEvent, listEventsForVenue } from "./events";
import type { CreateEventInput, EventRecord, EventRepository } from "./repository";

// In-memory fake, mirroring the pattern used for AnnouncementRepository tests.
class FakeEventRepository implements EventRepository {
  events: EventRecord[] = [];
  private nextId = 1;

  async createEvent(input: CreateEventInput): Promise<EventRecord> {
    const record: EventRecord = {
      id: `event-${this.nextId++}`,
      venueId: input.venueId,
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
