import { describe, expect, it } from "vitest";
import type { SocialLinks } from "@blockwise/types";
import {
  getNeighborhoodBySlug,
  updateNeighborhoodDescription,
  updateNeighborhoodSocialLinks,
} from "./neighborhoods";
import type { NeighborhoodRecord, NeighborhoodRepository } from "./repository";

// In-memory fake, mirroring the pattern used for EventRepository tests.
class FakeNeighborhoodRepository implements NeighborhoodRepository {
  constructor(private neighborhoods: NeighborhoodRecord[]) {}

  async getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null> {
    return this.neighborhoods.find((n) => n.slug === slug) ?? null;
  }

  async getNeighborhoodById(id: string): Promise<NeighborhoodRecord | null> {
    return this.neighborhoods.find((n) => n.id === id) ?? null;
  }

  async updateDescription(id: string, description: string): Promise<NeighborhoodRecord> {
    const neighborhood = this.neighborhoods.find((n) => n.id === id);
    if (!neighborhood) throw new Error("not found");
    neighborhood.description = description;
    return neighborhood;
  }

  async updateSocialLinks(id: string, socialLinks: SocialLinks): Promise<NeighborhoodRecord> {
    const neighborhood = this.neighborhoods.find((n) => n.id === id);
    if (!neighborhood) throw new Error("not found");
    neighborhood.social_links = socialLinks;
    return neighborhood;
  }
}

const PHINNEYWOOD: NeighborhoodRecord = {
  id: "neighborhood-1",
  name: "Phinneywood",
  slug: "phinneywood",
  description: null,
  city: "Seattle",
  state: "WA",
  social_links: {},
};

describe("getNeighborhoodBySlug", () => {
  it("returns the matching neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([PHINNEYWOOD]);
    const result = await getNeighborhoodBySlug("phinneywood", repo);
    expect(result?.id).toBe("neighborhood-1");
  });

  it("returns null for an unknown slug", async () => {
    const repo = new FakeNeighborhoodRepository([PHINNEYWOOD]);
    const result = await getNeighborhoodBySlug("nowhere", repo);
    expect(result).toBeNull();
  });
});

describe("updateNeighborhoodDescription", () => {
  it("updates the description of an existing neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([{ ...PHINNEYWOOD }]);
    const result = await updateNeighborhoodDescription("neighborhood-1", "A great place.", repo);

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.neighborhood.description).toBe("A great place.");
    }
  });

  it("returns not_found for a nonexistent neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([]);
    const result = await updateNeighborhoodDescription("nope", "A great place.", repo);
    expect(result).toEqual({ status: "not_found" });
  });
});

describe("updateNeighborhoodSocialLinks", () => {
  it("updates the social links of an existing neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([{ ...PHINNEYWOOD }]);
    const result = await updateNeighborhoodSocialLinks(
      "neighborhood-1",
      { instagram: "https://instagram.com/phinneywood" },
      repo
    );

    expect(result.status).toBe("updated");
    if (result.status === "updated") {
      expect(result.neighborhood.social_links).toEqual({
        instagram: "https://instagram.com/phinneywood",
      });
    }
  });

  it("returns not_found for a nonexistent neighborhood", async () => {
    const repo = new FakeNeighborhoodRepository([]);
    const result = await updateNeighborhoodSocialLinks("nope", { instagram: "x" }, repo);
    expect(result).toEqual({ status: "not_found" });
  });
});
