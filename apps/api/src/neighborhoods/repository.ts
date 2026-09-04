import type { GeoJsonPolygon, NeighborhoodAnalytics, NeighborhoodStatus, SocialLinks } from "@blockwise/types";

export interface NeighborhoodRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  social_links: SocialLinks;
  // iCal/webcal event feed import (BACKLOG.md Ref 30) -- an optional external
  // calendar feed synced into the event table (source "ical"). Null feed url
  // means the neighborhood has none configured yet; icalSyncedAt is null
  // until the first successful sync.
  icalFeedUrl: string | null;
  icalSyncedAt: string | null;
  // Nightly auto-sync settings -- see apps/api/netlify/functions/ical-nightly-sync.ts
  // (icalAutoSyncEnabled) and icalSync.ts's syncNeighborhoodIcalFeed
  // (icalAutoApproveEvents, which decides whether a newly-imported event
  // defaults to "pending" or skips straight to "active").
  icalAutoSyncEnabled: boolean;
  icalAutoApproveEvents: boolean;
  // 'onboarding' | 'active' (BACKLOG.md Ref 107) -- was write-only (set at
  // creation, never read back) until the admin "activate" action needed to
  // display and flip it.
  status: NeighborhoodStatus;
}

export interface NeighborhoodListCounts {
  neighborhood_id: string;
  business_count: number;
  member_count: number;
}

export interface NeighborhoodBoundaryRecord {
  boundaryGeojson: GeoJsonPolygon | null;
  centerLat: number;
  centerLng: number;
  // "Reimport Locations" cooldown (BACKLOG.md) -- last time a location
  // review actually queried the Places API for this neighborhood, or null
  // if never. Read alongside the boundary since both back the same review
  // GET route.
  locationsReviewedAt: string | null;
}

export interface CreateNeighborhoodInput {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  boundaryGeojson: GeoJsonPolygon;
}

export interface CreatedNeighborhood {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  status: string;
  boundaryGeojson: GeoJsonPolygon;
  centerLat: number;
  centerLng: number;
}

// Admin portal create-neighborhood form (BACKLOG.md Ref 8) hitting the
// `neighborhood.slug` unique constraint -- mirrors UsernameTakenError
// (auth/repository.ts) for the same "translate a DB uniqueness violation
// into a typed error the route can catch" pattern.
export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`Neighborhood slug "${slug}" is already taken`);
    this.name = "SlugTakenError";
  }
}

// Abstracts persistence so getNeighborhoodBySlug/updateNeighborhoodDescription
// (neighborhoods.ts) can be tested against an in-memory fake, mirroring
// events/repository.ts.
export interface NeighborhoodRepository {
  getNeighborhoodBySlug(slug: string): Promise<NeighborhoodRecord | null>;
  getNeighborhoodById(id: string): Promise<NeighborhoodRecord | null>;
  updateDescription(id: string, description: string): Promise<NeighborhoodRecord>;
  updateSocialLinks(id: string, socialLinks: SocialLinks): Promise<NeighborhoodRecord>;
  // iCal/webcal event feed import (BACKLOG.md Ref 30).
  updateIcalFeedUrl(id: string, icalFeedUrl: string | null): Promise<NeighborhoodRecord>;
  // Stamps the sync timestamp the moment a feed sync actually runs, mirroring
  // markLocationsReviewed's explicit-timestamp pattern below.
  markIcalSynced(id: string, syncedAt: string): Promise<void>;
  // Nightly auto-sync toggle + "trust this feed" auto-approve toggle -- each
  // independent, so both fields are optional and only the provided one(s)
  // are written.
  updateIcalSyncSettings(
    id: string,
    settings: { autoSyncEnabled?: boolean; autoApproveEvents?: boolean }
  ): Promise<NeighborhoodRecord>;
  // Landing page (BACKLOG.md "Neighborhoods on landing page and user
  // profile") -- every neighborhood in the network, for the "all
  // neighborhoods" browse/join list. Not filtered by status: nothing else in
  // the app gates on neighborhood.status today, and the seeded Phinneywood
  // row is still 'onboarding' despite being fully live (venues, check-ins,
  // business claims, its own public profile page) -- filtering it out here
  // would hide the only neighborhood that exists.
  listAll(): Promise<NeighborhoodRecord[]>;
  // Business/member counts for every neighborhood in one call (the "all
  // neighborhoods" browse list card), rather than the per-neighborhood
  // countActiveVenuesForNeighborhood/countMembersForNeighborhood calls the
  // single-neighborhood profile page uses.
  listCounts(): Promise<NeighborhoodListCounts[]>;
  // Admin portal boundary drawing (BACKLOG.md Ref 8, project plan §12.6).
  getBoundary(id: string): Promise<NeighborhoodBoundaryRecord | null>;
  updateBoundary(id: string, boundaryGeojson: GeoJsonPolygon): Promise<NeighborhoodBoundaryRecord>;
  // Analytics tab (charts/breakdowns of locations + activity) -- a single
  // RPC call, since check-ins-over-time/activity-by-type/locations-by-
  // category-group/top-venues are always requested together by that one tab.
  getAnalytics(id: string, days: number): Promise<NeighborhoodAnalytics>;
  createNeighborhood(input: CreateNeighborhoodInput): Promise<CreatedNeighborhood>;
  // Stamps the 24h "Reimport Locations" cooldown (BACKLOG.md) the moment a
  // location review actually queries the Places API -- takes an explicit
  // timestamp (rather than using the DB's own now()) so the route's
  // response and the stamped value are guaranteed to agree.
  markLocationsReviewed(id: string, reviewedAt: string): Promise<void>;
  // One-way 'onboarding' -> 'active' flip (BACKLOG.md Ref 107, project plan
  // §12.3 step 5) -- no reverse transition, matching the runbook's
  // "deliberate step" framing. Idempotent: activating an already-active
  // neighborhood just returns it unchanged.
  activateNeighborhood(id: string): Promise<NeighborhoodRecord>;
}
