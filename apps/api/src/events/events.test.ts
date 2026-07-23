import { describe, expect, it } from "vitest";
import {
  createEvent,
  createEventForNeighborhood,
  deleteEventForNeighborhood,
  deleteEventForVenue,
  listEventsForNeighborhood,
  listEventsForVenue,
  listUpcomingEventsForNeighborhood,
  setEventStatusForNeighborhood,
  setEventStatusForVenue,
} from "./events";
import type {
  CreateEventInput,
  EventRecord,
  EventRepository,
  EventStatus,
  IcalSyncResult,
  ImportedEventInput,
} from "./repository";

// In-memory fake, mirroring the pattern used for CouponRepository tests.
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
      source: "manual",
      externalUid: null,
      location: null,
      status: "active",
    };
    this.events.push(record);
    return record;
  }

  async listEventsForVenue(venueId: string, includeHidden = false): Promise<EventRecord[]> {
    return this.events.filter((e) => e.venueId === venueId && (includeHidden || e.status === "active"));
  }

  async listEventsForNeighborhood(neighborhoodId: string): Promise<EventRecord[]> {
    return this.events.filter((e) => e.neighborhoodId === neighborhoodId);
  }

  async listEventsForNeighborhoodAndVenues(neighborhoodId: string): Promise<EventRecord[]> {
    const now = new Date().toISOString();
    return this.events
      .filter(
        (e) =>
          (e.neighborhoodId === neighborhoodId ||
            (e.venueId && this.venues.get(e.venueId)?.neighborhoodId === neighborhoodId)) &&
          e.endTime >= now &&
          e.status === "active"
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async upsertImportedEventsForNeighborhood(
    neighborhoodId: string,
    events: ImportedEventInput[]
  ): Promise<IcalSyncResult> {
    return this.upsertImported({ neighborhoodId }, events);
  }

  async upsertImportedEventsForVenue(venueId: string, events: ImportedEventInput[]): Promise<IcalSyncResult> {
    return this.upsertImported({ venueId }, events);
  }

  private upsertImported(
    owner: { neighborhoodId?: string; venueId?: string },
    events: ImportedEventInput[]
  ): IcalSyncResult {
    let imported = 0;
    let updated = 0;
    for (const input of events) {
      const existing = this.events.find(
        (e) =>
          e.externalUid === input.uid &&
          e.neighborhoodId === (owner.neighborhoodId ?? null) &&
          e.venueId === (owner.venueId ?? null)
      );
      if (existing) {
        // Deliberately doesn't touch `status` -- mirrors the real upsert,
        // which never includes status in its payload so a re-sync can't
        // silently un-hide an already-hidden imported event.
        Object.assign(existing, {
          title: input.title,
          description: input.description,
          startTime: input.startTime,
          endTime: input.endTime,
          location: input.location,
        });
        updated++;
      } else {
        this.events.push({
          id: `event-${this.nextId++}`,
          venueId: owner.venueId ?? null,
          neighborhoodId: owner.neighborhoodId ?? null,
          venueName: null,
          title: input.title,
          description: input.description,
          startTime: input.startTime,
          endTime: input.endTime,
          createdAt: new Date().toISOString(),
          source: "ical",
          externalUid: input.uid,
          location: input.location,
          status: "active",
        });
        imported++;
      }
    }
    return { imported, updated };
  }

  async getEventOwner(eventId: string): Promise<{ venueId: string | null; neighborhoodId: string | null } | null> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return null;
    return { venueId: event.venueId, neighborhoodId: event.neighborhoodId };
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.events = this.events.filter((e) => e.id !== eventId);
  }

  async setEventStatus(eventId: string, status: EventStatus): Promise<EventRecord> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) throw new Error("not found");
    event.status = status;
    return event;
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

describe("deleteEventForVenue", () => {
  it("deletes an event owned by the given venue", async () => {
    const repo = new FakeEventRepository();
    const created = await createEvent("venue-1", VALID_INPUT, repo);
    if (created.status !== "created") throw new Error("expected created");

    const result = await deleteEventForVenue("venue-1", created.event.id, repo);

    expect(result).toEqual({ status: "deleted" });
    expect(await listEventsForVenue("venue-1", repo)).toHaveLength(0);
  });

  it("returns not_found for an event owned by a different venue", async () => {
    const repo = new FakeEventRepository();
    const created = await createEvent("venue-1", VALID_INPUT, repo);
    if (created.status !== "created") throw new Error("expected created");

    const result = await deleteEventForVenue("venue-2", created.event.id, repo);

    expect(result).toEqual({ status: "not_found" });
    expect(await listEventsForVenue("venue-1", repo)).toHaveLength(1);
  });

  it("returns not_found for a missing event id", async () => {
    const repo = new FakeEventRepository();
    const result = await deleteEventForVenue("venue-1", "missing-event", repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("deleteEventForNeighborhood", () => {
  it("deletes an event owned by the given neighborhood", async () => {
    const repo = new FakeEventRepository();
    const created = await createEventForNeighborhood("neighborhood-1", VALID_INPUT, repo);
    if (created.status !== "created") throw new Error("expected created");

    const result = await deleteEventForNeighborhood("neighborhood-1", created.event.id, repo);

    expect(result).toEqual({ status: "deleted" });
    expect(await listEventsForNeighborhood("neighborhood-1", repo)).toHaveLength(0);
  });

  it("returns not_found for an event owned by a different neighborhood", async () => {
    const repo = new FakeEventRepository();
    const created = await createEventForNeighborhood("neighborhood-1", VALID_INPUT, repo);
    if (created.status !== "created") throw new Error("expected created");

    const result = await deleteEventForNeighborhood("neighborhood-2", created.event.id, repo);

    expect(result).toEqual({ status: "not_found" });
    expect(await listEventsForNeighborhood("neighborhood-1", repo)).toHaveLength(1);
  });
});

describe("setEventStatusForVenue", () => {
  it("hides an event owned by the given venue", async () => {
    const repo = new FakeEventRepository();
    const created = await createEvent("venue-1", VALID_INPUT, repo);
    if (created.status !== "created") throw new Error("expected created");

    const result = await setEventStatusForVenue("venue-1", created.event.id, "hidden", repo);

    expect(result.status).toBe("updated");
    if (result.status === "updated") expect(result.event.status).toBe("hidden");
    expect(await listEventsForVenue("venue-1", repo)).toHaveLength(0);
    expect(await listEventsForVenue("venue-1", repo, true)).toHaveLength(1);
  });

  it("returns not_found for an event owned by a different venue", async () => {
    const repo = new FakeEventRepository();
    const created = await createEvent("venue-1", VALID_INPUT, repo);
    if (created.status !== "created") throw new Error("expected created");

    const result = await setEventStatusForVenue("venue-2", created.event.id, "hidden", repo);

    expect(result).toEqual({ status: "not_found" });
  });
});

describe("setEventStatusForNeighborhood", () => {
  it("hides an event owned by the given neighborhood, excluding it from the public Upcoming tab", async () => {
    const repo = new FakeEventRepository();
    const created = await createEventForNeighborhood(
      "neighborhood-1",
      { ...VALID_INPUT, startTime: "2026-08-02T18:00:00.000Z", endTime: "2026-08-02T21:00:00.000Z" },
      repo
    );
    if (created.status !== "created") throw new Error("expected created");

    const result = await setEventStatusForNeighborhood("neighborhood-1", created.event.id, "hidden", repo);

    expect(result.status).toBe("updated");
    expect(await listUpcomingEventsForNeighborhood("neighborhood-1", repo)).toHaveLength(0);
    // Still visible to the admin dashboard, which reads listEventsForNeighborhood directly.
    expect(await listEventsForNeighborhood("neighborhood-1", repo)).toHaveLength(1);
  });

  it("returns not_found for an event owned by a different neighborhood", async () => {
    const repo = new FakeEventRepository();
    const created = await createEventForNeighborhood("neighborhood-1", VALID_INPUT, repo);
    if (created.status !== "created") throw new Error("expected created");

    const result = await setEventStatusForNeighborhood("neighborhood-2", created.event.id, "hidden", repo);

    expect(result).toEqual({ status: "not_found" });
  });
});

describe("iCal re-sync preserves a hidden status", () => {
  it("does not un-hide a previously-hidden imported event on re-sync", async () => {
    const repo = new FakeEventRepository();
    const imported: ImportedEventInput = {
      uid: "feed-uid-1",
      title: "Weekly market",
      description: "desc",
      startTime: "2026-08-02T18:00:00.000Z",
      endTime: "2026-08-02T21:00:00.000Z",
      location: null,
    };

    await repo.upsertImportedEventsForNeighborhood("neighborhood-1", [imported]);
    const [firstSync] = await listEventsForNeighborhood("neighborhood-1", repo);
    await setEventStatusForNeighborhood("neighborhood-1", firstSync.id, "hidden", repo);

    // Re-sync with the same uid, as an unattended "Sync now" would do.
    await repo.upsertImportedEventsForNeighborhood("neighborhood-1", [
      { ...imported, title: "Weekly market (updated)" },
    ]);

    const [afterResync] = await listEventsForNeighborhood("neighborhood-1", repo);
    expect(afterResync.title).toBe("Weekly market (updated)");
    expect(afterResync.status).toBe("hidden");
  });
});
