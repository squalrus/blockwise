import { describe, expect, it } from "vitest";
import { createAnnouncement, listAnnouncementsForVenue } from "./announcements";
import type { AnnouncementRecord, AnnouncementRepository, CreateAnnouncementInput } from "./repository";

// In-memory fake, mirroring the pattern used for ClaimRepository tests.
class FakeAnnouncementRepository implements AnnouncementRepository {
  announcements: AnnouncementRecord[] = [];
  private nextId = 1;

  async createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementRecord> {
    const record: AnnouncementRecord = {
      id: `announcement-${this.nextId++}`,
      venueId: input.venueId,
      title: input.title,
      body: input.body,
      published: true,
      createdAt: new Date().toISOString(),
    };
    this.announcements.push(record);
    return record;
  }

  async listAnnouncementsForVenue(venueId: string): Promise<AnnouncementRecord[]> {
    return this.announcements.filter((a) => a.venueId === venueId);
  }
}

describe("createAnnouncement", () => {
  it("creates a published announcement for the venue", async () => {
    const repo = new FakeAnnouncementRepository();
    const result = await createAnnouncement("venue-1", { title: "Sale", body: "20% off today" }, repo);

    expect(result.venue_id).toBe("venue-1");
    expect(result.title).toBe("Sale");
    expect(result.body).toBe("20% off today");
    expect(result.published).toBe(true);
  });
});

describe("listAnnouncementsForVenue", () => {
  it("only returns announcements for the requested venue", async () => {
    const repo = new FakeAnnouncementRepository();
    await createAnnouncement("venue-1", { title: "A", body: "..." }, repo);
    await createAnnouncement("venue-2", { title: "B", body: "..." }, repo);

    const results = await listAnnouncementsForVenue("venue-1", repo);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("A");
  });
});
