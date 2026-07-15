import express from "express";
import type {
  AccountType,
  AvatarStyle,
  BusinessClaimContactMethod,
  BusinessClaimStatus,
  CheckinRewardsSummary,
  HealthCheckResponse,
  MushroomCustomization,
  NeighborhoodDashboardSummary,
  NeighborhoodProfile,
  NeighborhoodSummary,
  ProfileVisibility,
  SocialLinks,
  SocialPlatform,
  VenueDashboardSummary,
} from "@blockwise/types";
import {
  MUSHROOM_CAPS,
  MUSHROOM_STALK_COCOA,
  MUSHROOM_STALK_AMBER,
  MUSHROOM_STALKS,
  MUSHROOM_SPOT_SHAPES,
} from "@blockwise/types";
import { requireAdmin } from "./admin/requireAdmin";
import { requireNeighborhoodAdmin } from "./admin/requireNeighborhoodAdmin";
import { requireSuperAdmin } from "./admin/requireSuperAdmin";
import { SupabaseNeighborhoodAdminRepository, SupabaseSuperAdminRepository } from "./admin/supabaseRepository";
import { listRecentActivity } from "./activity/activity";
import { SupabaseActivityRepository } from "./activity/supabaseRepository";
import { createAnnouncement, listAnnouncementsForVenue } from "./announcements/announcements";
import { SupabaseAnnouncementRepository } from "./announcements/supabaseRepository";
import { completeLogin, completeSignup, promoteToBusiness, toAppUser, updateProfile } from "./auth/auth";
import { attachOptionalAuthUser, requireAuthUser, requireBusinessAccount } from "./auth/requireAuthUser";
import { UsernameTakenError } from "./auth/repository";
import { SupabaseAuthRepository } from "./auth/supabaseRepository";
import { verifyAccessToken } from "./auth/verifyToken";
import { performCheckin } from "./checkins/checkin";
import { SupabaseCheckinRepository } from "./checkins/supabaseRepository";
import {
  getVenueSocialLinks,
  listClaimsForNeighborhood,
  reviewClaim,
  reviewClaimForNeighborhood,
  revokeApprovedClaimForNeighborhood,
  submitClaim,
  updateVenueSocialLinks,
} from "./claims/claims";
import { requireVenueOwner } from "./claims/requireVenueOwner";
import { SupabaseClaimRepository } from "./claims/supabaseRepository";
import {
  archiveCategory,
  createCategory,
  listCategoriesForAdmin,
  renameCategory,
} from "./categoryAdmin/categoryAdmin";
import { SupabaseCategoryAdminRepository } from "./categoryAdmin/supabaseRepository";
import { acceptConnectionRequest, removeConnection, sendConnectionRequest } from "./connections/connections";
import type { ConnectionStatus } from "./connections/repository";
import { SupabaseConnectionRepository } from "./connections/supabaseRepository";
import { SupabaseEnrichmentRepository } from "./enrichment/supabaseRepository";
import {
  createEvent,
  createEventForNeighborhood,
  listEventsForNeighborhood,
  listEventsForVenue,
  listUpcomingEventsForNeighborhood,
} from "./events/events";
import { SupabaseEventRepository } from "./events/supabaseRepository";
import { addFavorite, getFavoriteStatus, removeFavorite } from "./favorites/favorite";
import { SupabaseFavoriteRepository } from "./favorites/supabaseRepository";
import {
  getUserActiveChallenges,
  getUserChallengesSummary,
  getUserCompletedChallenges,
  listChallengesWithProgress,
} from "./gamification/challenges";
import { awardFounderBadge } from "./gamification/founderBadge";
import { awardFavoritePoints, getLeaderboard, getUserBadges, getUserPoints } from "./gamification/points";
import { awardCheckinRewards, awardNeighborConnectionRewards } from "./gamification/rewards";
import { awardSqualrusConnectionBadge } from "./gamification/squalrusBadge";
import { SupabaseGamificationRepository } from "./gamification/supabaseRepository";
import {
  createNeighborhood,
  getNeighborhoodBoundary,
  getNeighborhoodById,
  getNeighborhoodBySlug,
  updateNeighborhoodBoundary,
  updateNeighborhoodDescription,
  updateNeighborhoodSocialLinks,
} from "./neighborhoods/neighborhoods";
import { SlugTakenError } from "./neighborhoods/repository";
import { SupabaseNeighborhoodRepository } from "./neighborhoods/supabaseRepository";
import {
  joinNeighborhood,
  leaveNeighborhood,
  listMembershipsForUser,
  setHomeNeighborhood,
} from "./neighborhoodMembers/neighborhoodMembers";
import { SupabaseNeighborhoodMemberRepository } from "./neighborhoodMembers/supabaseRepository";
import { LivePlacesClient, type GooglePlacesClient, type PlaceDetailsClient } from "./places/client";
import { isValidPolygon } from "./places/geo";
import { MockPlacesClient } from "./places/mockClient";
import { previewNeighborhoodBoundary } from "./places/preview";
import { SupabasePlacesRepository } from "./places/supabaseRepository";
import { getHappeningNow } from "./locations/happeningNow";
import {
  createLocation,
  deleteLocationForNeighborhood,
  getLocationDetailWithFreshEnrichment,
  getLocationForNeighborhood,
  listAssignableCategories,
  listLocationListItemsForNeighborhood,
  listLocationsForNeighborhood,
  reassignLocationCategoryForNeighborhood,
  switchLocationKindForNeighborhood,
  updateLocationForNeighborhood,
  updateLocationStatusForNeighborhood,
} from "./locations/locations";
import {
  commitLocationReview,
  getLocationsReviewCooldownStatus,
  reviewNeighborhoodLocations,
  type LocationClassification,
} from "./locations/review";
import { SupabaseLocationRepository } from "./locations/supabaseRepository";
import { getSupabaseClient } from "./supabase";

const CONTACT_METHODS: BusinessClaimContactMethod[] = ["phone", "email", "domain"];
const CLAIM_STATUSES: BusinessClaimStatus[] = ["pending", "approved", "rejected"];
const ACCOUNT_TYPES: AccountType[] = ["consumer", "business"];
const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "twitter", "tiktok", "facebook", "website"];
const PROFILE_VISIBILITIES: ProfileVisibility[] = ["public", "private"];
// BACKLOG.md "Mushroom fingerprint stamps on connections and check-ins" --
// how many distinct-user snapshots a mosaic (neighborhood profile, public
// profile's neighbors strip) surfaces at once, mirroring
// locations/supabaseRepository.ts's venue-scoped RECENT_CHECKIN_SNAPSHOT_DISTINCT_LIMIT.
const RECENT_CHECKIN_MOSAIC_LIMIT = 12;
const AVATAR_STYLES: AvatarStyle[] = ["social", "mushroom"];
// BACKLOG.md Ref 75 "Mushroom avatar customizer" -- customizer offers 0
// (bare cap) unlike mushroomConfigForUser's auto-assignment, which excludes
// it (MUSHROOM_CAPS/MUSHROOM_STALKS/MUSHROOM_SPOT_SHAPES imported from
// @blockwise/types above, the single source of truth for the approved
// palette).
const MUSHROOM_MIN_SPOT_COUNT = 0;
const MUSHROOM_MAX_SPOT_COUNT = 6;

// null clears a saved customization back to the hash-derived default -- only
// that or a fully-approved { cap, stalk, spots, bg, spotCount, spotShape }
// combination is accepted. Stalk, spots, and bg are independent choices (not
// one mirroring another), but share the same approved palette and the same
// amber-only-with-Cocoa-cap contrast rule (mirroring mushroomConfigForUser's
// own auto-assignment). spotCount and spotShape are likewise independent
// choices (any count 0-6 pairs with any shape), not a fused named pattern.
function isValidMushroomCustomization(value: unknown): value is MushroomCustomization | null {
  if (value === null) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;

  const { cap, stalk, spots, bg, spotCount, spotShape } = value as Record<string, unknown>;
  if (typeof cap !== "string" || !MUSHROOM_CAPS.includes(cap)) return false;
  if (typeof stalk !== "string" || !MUSHROOM_STALKS.includes(stalk)) return false;
  if (stalk === MUSHROOM_STALK_AMBER && cap !== MUSHROOM_STALK_COCOA) return false;
  if (typeof spots !== "string" || !MUSHROOM_STALKS.includes(spots)) return false;
  if (spots === MUSHROOM_STALK_AMBER && cap !== MUSHROOM_STALK_COCOA) return false;
  if (typeof bg !== "string" || !MUSHROOM_STALKS.includes(bg)) return false;
  if (bg === MUSHROOM_STALK_AMBER && cap !== MUSHROOM_STALK_COCOA) return false;
  if (
    typeof spotCount !== "number" ||
    !Number.isInteger(spotCount) ||
    spotCount < MUSHROOM_MIN_SPOT_COUNT ||
    spotCount > MUSHROOM_MAX_SPOT_COUNT
  )
    return false;
  if (typeof spotShape !== "string" || !(MUSHROOM_SPOT_SHAPES as string[]).includes(spotShape)) return false;
  return true;
}
const CONNECTION_STATUSES: ConnectionStatus[] = ["pending", "accepted"];
// BACKLOG.md "Public user profiles": matches the app_user.username check
// constraint (migration 20260707010000) -- kept in sync with it.
const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;
// Recent check-ins shown on a public profile (BACKLOG.md Ref 37) -- capped
// rather than showing full history, since this is a "what have they been up
// to lately" glance, not the account owner's own /me/checkins page.
const PUBLIC_PROFILE_CHECKIN_LIMIT = 10;

// Shared by the neighborhood-admin and business-owner social-links PATCH
// routes -- rejects unknown platform keys and non-string values rather than
// silently dropping or coercing them, since this is user-facing settings
// data with no other validation layer (no zod in this repo).
function parseSocialLinks(body: unknown): SocialLinks | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;

  const links: SocialLinks = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (!SOCIAL_PLATFORMS.includes(key as SocialPlatform)) return null;
    if (typeof value !== "string") return null;
    if (value.length > 0) links[key as SocialPlatform] = value;
  }
  return links;
}

function bearerToken(req: express.Request): string | null {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

// Netlify invokes this function at /.netlify/functions/api/*, but the public
// redirect (see netlify.toml) fronts it at /api/*. Depending on the Netlify
// runtime version, either prefix can show up in req.url, so strip both before
// routing rather than depending on one exact behavior.
const FUNCTION_PATH_PREFIX = /^\/\.netlify\/functions\/[^/]+/;
const PUBLIC_PATH_PREFIX = /^\/api(?=\/|$)/;

// Mirrors the LivePlacesClient/MockPlacesClient choice in scripts/syncPlaces.ts:
// falls back to mock Place Details when no API key is configured, e.g. local
// dev. Both classes implement GooglePlacesClient (searchNearby) as well as
// PlaceDetailsClient, so the same cached instance also backs the boundary
// preview route's Nearby Search calls.
function getPlacesClient(): GooglePlacesClient & PlaceDetailsClient {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  return apiKey ? new LivePlacesClient(apiKey) : new MockPlacesClient();
}

// Constructed lazily (on first request) rather than at createApp() time --
// getSupabaseClient() throws if SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY aren't
// set, and building it eagerly would crash every route including /health
// the moment the function cold-starts with a misconfigured environment.
let locationRepository: SupabaseLocationRepository | undefined;
function getLocationRepository(): SupabaseLocationRepository {
  locationRepository ??= new SupabaseLocationRepository(getSupabaseClient());
  return locationRepository;
}

let placesClient: (GooglePlacesClient & PlaceDetailsClient) | undefined;
function getCachedPlacesClient(): GooglePlacesClient & PlaceDetailsClient {
  placesClient ??= getPlacesClient();
  return placesClient;
}

let enrichmentRepository: SupabaseEnrichmentRepository | undefined;
function getEnrichmentRepository(): SupabaseEnrichmentRepository {
  enrichmentRepository ??= new SupabaseEnrichmentRepository(getSupabaseClient());
  return enrichmentRepository;
}

let placesRepository: SupabasePlacesRepository | undefined;
function getPlacesRepository(): SupabasePlacesRepository {
  placesRepository ??= new SupabasePlacesRepository(getSupabaseClient());
  return placesRepository;
}

let checkinRepository: SupabaseCheckinRepository | undefined;
function getCheckinRepository(): SupabaseCheckinRepository {
  checkinRepository ??= new SupabaseCheckinRepository(getSupabaseClient());
  return checkinRepository;
}

let favoriteRepository: SupabaseFavoriteRepository | undefined;
function getFavoriteRepository(): SupabaseFavoriteRepository {
  favoriteRepository ??= new SupabaseFavoriteRepository(getSupabaseClient());
  return favoriteRepository;
}

let connectionRepository: SupabaseConnectionRepository | undefined;
function getConnectionRepository(): SupabaseConnectionRepository {
  connectionRepository ??= new SupabaseConnectionRepository(getSupabaseClient());
  return connectionRepository;
}

let gamificationRepository: SupabaseGamificationRepository | undefined;
function getGamificationRepository(): SupabaseGamificationRepository {
  gamificationRepository ??= new SupabaseGamificationRepository(getSupabaseClient());
  return gamificationRepository;
}

// BACKLOG.md Ref 14/33: rewards both sides of a newly-accepted neighbor
// connection -- called from both /me/connections routes below (the
// mutual-interest auto-accept branch of POST /me/connections, and POST
// /me/connections/:id/accept), since either can be the moment a connection
// actually becomes accepted. Best-effort per side, mirroring
// awardFavoritePoints/awardCheckinRewards's log-and-swallow error handling.
async function awardNeighborConnectionRewardsForBothSides(connection: {
  requesterId: string;
  recipientId: string;
}): Promise<void> {
  const pairs: [string, string][] = [
    [connection.requesterId, connection.recipientId],
    [connection.recipientId, connection.requesterId],
  ];
  for (const [userId, otherUserId] of pairs) {
    try {
      const neighborCount = await getConnectionRepository().countAcceptedConnectionsForUser(userId);
      await awardNeighborConnectionRewards(
        { userId, otherUserId, neighborCount },
        getGamificationRepository()
      );
      await awardSqualrusConnectionBadge(
        userId,
        otherUserId,
        getAuthRepository(),
        getGamificationRepository()
      );
    } catch (err) {
      console.error(`awardNeighborConnectionRewards (user ${userId}) failed:`, err);
    }
  }
}

let claimRepository: SupabaseClaimRepository | undefined;
function getClaimRepository(): SupabaseClaimRepository {
  claimRepository ??= new SupabaseClaimRepository(getSupabaseClient());
  return claimRepository;
}

let authRepository: SupabaseAuthRepository | undefined;
function getAuthRepository(): SupabaseAuthRepository {
  authRepository ??= new SupabaseAuthRepository(getSupabaseClient());
  return authRepository;
}

let categoryAdminRepository: SupabaseCategoryAdminRepository | undefined;
function getCategoryAdminRepository(): SupabaseCategoryAdminRepository {
  categoryAdminRepository ??= new SupabaseCategoryAdminRepository(getSupabaseClient());
  return categoryAdminRepository;
}

let neighborhoodAdminRepository: SupabaseNeighborhoodAdminRepository | undefined;
function getNeighborhoodAdminRepository(): SupabaseNeighborhoodAdminRepository {
  neighborhoodAdminRepository ??= new SupabaseNeighborhoodAdminRepository(getSupabaseClient());
  return neighborhoodAdminRepository;
}

let superAdminRepository: SupabaseSuperAdminRepository | undefined;
function getSuperAdminRepository(): SupabaseSuperAdminRepository {
  superAdminRepository ??= new SupabaseSuperAdminRepository(getSupabaseClient());
  return superAdminRepository;
}

let announcementRepository: SupabaseAnnouncementRepository | undefined;
function getAnnouncementRepository(): SupabaseAnnouncementRepository {
  announcementRepository ??= new SupabaseAnnouncementRepository(getSupabaseClient());
  return announcementRepository;
}

let activityRepository: SupabaseActivityRepository | undefined;
function getActivityRepository(): SupabaseActivityRepository {
  activityRepository ??= new SupabaseActivityRepository(getSupabaseClient());
  return activityRepository;
}

let eventRepository: SupabaseEventRepository | undefined;
function getEventRepository(): SupabaseEventRepository {
  eventRepository ??= new SupabaseEventRepository(getSupabaseClient());
  return eventRepository;
}

let neighborhoodRepository: SupabaseNeighborhoodRepository | undefined;
function getNeighborhoodRepository(): SupabaseNeighborhoodRepository {
  neighborhoodRepository ??= new SupabaseNeighborhoodRepository(getSupabaseClient());
  return neighborhoodRepository;
}

let neighborhoodMemberRepository: SupabaseNeighborhoodMemberRepository | undefined;
function getNeighborhoodMemberRepository(): SupabaseNeighborhoodMemberRepository {
  neighborhoodMemberRepository ??= new SupabaseNeighborhoodMemberRepository(getSupabaseClient());
  return neighborhoodMemberRepository;
}

export function createApp() {
  const app = express();

  const adminGate = requireAdmin(getSupabaseClient, getAuthRepository, getNeighborhoodAdminRepository);
  const venueOwnerGate = requireVenueOwner(getSupabaseClient, getAuthRepository, getClaimRepository);
  const neighborhoodAdminGate = requireNeighborhoodAdmin(
    getSupabaseClient,
    getAuthRepository,
    getNeighborhoodAdminRepository
  );
  const superAdminGate = requireSuperAdmin(getSupabaseClient, getAuthRepository, getSuperAdminRepository);

  app.use((req, _res, next) => {
    req.url =
      req.url.replace(FUNCTION_PATH_PREFIX, "").replace(PUBLIC_PATH_PREFIX, "") || "/";
    next();
  });

  app.use(express.json());

  app.get("/health", (_req, res) => {
    const body: HealthCheckResponse = {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  });

  // Public location detail page (BACKLOG.md Ref 46/59) -- serves both
  // business and POI kinds, merged from the old GET /venues/:id + GET
  // /pois/:id (BACKLOG.md "POIs and venues managed almost the same").
  app.get("/locations/:id", async (req, res) => {
    try {
      const location = await getLocationDetailWithFreshEnrichment(
        req.params.id,
        getLocationRepository(),
        getEnrichmentRepository(),
        getCachedPlacesClient()
      );
      if (!location) {
        res.status(404).json({ error: "Location not found" });
        return;
      }
      res.json(location);
    } catch (err) {
      console.error(`GET /locations/${req.params.id} failed:`, err);
      res.status(500).json({ error: "Failed to load location" });
    }
  });

  // Proxies a cached Google photo reference through the server so the
  // Places API key (needed to build the actual media URL) never reaches
  // the browser -- see PlaceDetailsClient.fetchPhotoMedia. `?index=` selects
  // which of the cached photos to serve (Google returns up to 10 per
  // location, BACKLOG.md Ref 41); defaults to the first.
  app.get("/locations/:id/photo", async (req, res) => {
    try {
      const index = Number(req.query.index ?? 0);
      if (!Number.isInteger(index) || index < 0) {
        res.status(400).json({ error: "index must be a non-negative integer" });
        return;
      }
      const photoReference = await getEnrichmentRepository().getPhotoReference(req.params.id, index);
      if (!photoReference) {
        res.status(404).end();
        return;
      }
      const media = await getCachedPlacesClient().fetchPhotoMedia(photoReference);
      res.setHeader("Content-Type", media.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(media.data));
    } catch (err) {
      console.error(`GET /locations/${req.params.id}/photo failed:`, err);
      res.status(502).json({ error: "Failed to load photo" });
    }
  });

  // Business owner venue dashboard (BACKLOG.md): read-only, public listing of
  // a venue's own announcements/events, shown on the venue detail page.
  // Authoring is gated (see POST /business/venues/:id/announcements|events
  // below) -- these two routes are read-only for any visitor.
  app.get("/venues/:id/announcements", async (req, res) => {
    try {
      const announcements = await listAnnouncementsForVenue(req.params.id, getAnnouncementRepository());
      res.json(announcements);
    } catch (err) {
      console.error(`GET /venues/${req.params.id}/announcements failed:`, err);
      res.status(500).json({ error: "Failed to list announcements" });
    }
  });

  app.get("/venues/:id/events", async (req, res) => {
    try {
      const events = await listEventsForVenue(req.params.id, getEventRepository());
      res.json(events);
    } catch (err) {
      console.error(`GET /venues/${req.params.id}/events failed:`, err);
      res.status(500).json({ error: "Failed to list events" });
    }
  });

  // Landing page (BACKLOG.md "Neighborhoods on landing page and user
  // profile"): every neighborhood in the network, for the "all neighborhoods"
  // browse/join list. Authentication is optional (mirrors POST
  // /venues/:id/claims above) -- signed-in visitors get `joined` flagged per
  // neighborhood so the landing page can show "Joined" vs. a join button;
  // anonymous visitors just see the full list with joined always false.
  app.get(
    "/neighborhoods",
    attachOptionalAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const [neighborhoods, counts] = await Promise.all([
          getNeighborhoodRepository().listAll(),
          getNeighborhoodRepository().listCounts(),
        ]);
        const joinedIds = req.appUser
          ? new Set(
              (await listMembershipsForUser(req.appUser.id, getNeighborhoodMemberRepository())).map(
                (m) => m.neighborhood_id
              )
            )
          : new Set<string>();
        const countsById = new Map(counts.map((c) => [c.neighborhood_id, c]));

        const summaries: NeighborhoodSummary[] = neighborhoods.map((n) => ({
          id: n.id,
          name: n.name,
          slug: n.slug,
          city: n.city,
          state: n.state,
          joined: joinedIds.has(n.id),
          business_count: countsById.get(n.id)?.business_count ?? 0,
          member_count: countsById.get(n.id)?.member_count ?? 0,
        }));
        res.json(summaries);
      } catch (err) {
        console.error("GET /neighborhoods failed:", err);
        res.status(500).json({ error: "Failed to list neighborhoods" });
      }
    }
  );

  // Neighborhood profile pages (BACKLOG.md): public read of a neighborhood's
  // own description and POIs -- the neighborhood-scoped equivalent of the
  // venue detail page. Looked up by slug (a nicer public URL than the raw
  // id) rather than id, unlike every venue-scoped route above.
  app.get("/neighborhoods/:slug", async (req, res) => {
    try {
      const neighborhood = await getNeighborhoodBySlug(req.params.slug, getNeighborhoodRepository());
      if (!neighborhood) {
        res.status(404).json({ error: "Neighborhood not found" });
        return;
      }

      const [pois, venueCount, poiCount, memberCount, checkinCount, recentCheckinMushrooms] = await Promise.all([
        listLocationsForNeighborhood(neighborhood.id, getLocationRepository(), "poi"),
        getLocationRepository().countActiveLocationsForNeighborhood(neighborhood.id, "business"),
        getLocationRepository().countActiveLocationsForNeighborhood(neighborhood.id, "poi"),
        getNeighborhoodMemberRepository().countMembersForNeighborhood(neighborhood.id),
        getCheckinRepository().countCheckinsForNeighborhood(neighborhood.id),
        getCheckinRepository().listRecentCheckinSnapshotsForNeighborhood(neighborhood.id, RECENT_CHECKIN_MOSAIC_LIMIT),
      ]);
      const profile: NeighborhoodProfile = {
        id: neighborhood.id,
        name: neighborhood.name,
        slug: neighborhood.slug,
        description: neighborhood.description,
        city: neighborhood.city,
        state: neighborhood.state,
        pois,
        social_links: neighborhood.social_links,
        venue_count: venueCount,
        poi_count: poiCount,
        member_count: memberCount,
        checkin_count: checkinCount,
        recent_checkin_mushrooms: recentCheckinMushrooms,
      };
      res.json(profile);
    } catch (err) {
      console.error(`GET /neighborhoods/${req.params.slug} failed:`, err);
      res.status(500).json({ error: "Failed to load neighborhood" });
    }
  });

  // Neighborhood-scoped, points-based leaderboard (BACKLOG.md Ref 6) --
  // opt-in via the existing public-profile visibility flag (v0.20.0), same
  // gate as GET /users/:username.
  app.get("/neighborhoods/:slug/leaderboard", async (req, res) => {
    try {
      const neighborhood = await getNeighborhoodBySlug(req.params.slug, getNeighborhoodRepository());
      if (!neighborhood) {
        res.status(404).json({ error: "Neighborhood not found" });
        return;
      }

      const leaderboard = await getLeaderboard(neighborhood.id, getGamificationRepository());
      res.json(leaderboard);
    } catch (err) {
      console.error(`GET /neighborhoods/${req.params.slug}/leaderboard failed:`, err);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });

  // Template-driven challenges for a neighborhood, with the requesting
  // user's live progress (BACKLOG.md Ref 6) -- works for a signed-in account
  // or an anonymous device with prior check-in/favorite history; a device
  // with no app_user row yet just gets zeroed-out progress on every
  // challenge.
  app.get(
    "/neighborhoods/:slug/challenges",
    attachOptionalAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const neighborhood = await getNeighborhoodBySlug(req.params.slug, getNeighborhoodRepository());
        if (!neighborhood) {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }

        const anonymousDeviceId = req.query.anonymous_device_id;
        const userId = req.appUser
          ? req.appUser.id
          : typeof anonymousDeviceId === "string" && anonymousDeviceId
            ? await getGamificationRepository().getUserIdForDevice(anonymousDeviceId)
            : null;

        const challenges = await listChallengesWithProgress(
          neighborhood.id,
          userId,
          getGamificationRepository()
        );
        res.json(challenges);
      } catch (err) {
        console.error(`GET /neighborhoods/${req.params.slug}/challenges failed:`, err);
        res.status(500).json({ error: "Failed to load challenges" });
      }
    }
  );

  // Public Upcoming events tab (BACKLOG.md Ref 27): neighborhood-owned events
  // plus events from businesses within the neighborhood, unlike the
  // neighborhood-admin dashboard's listEventsForNeighborhood below, which is
  // scoped to just what the neighborhood itself authored.
  app.get("/neighborhoods/:id/events", async (req, res) => {
    try {
      const events = await listUpcomingEventsForNeighborhood(req.params.id, getEventRepository());
      res.json(events);
    } catch (err) {
      console.error(`GET /neighborhoods/${req.params.id}/events failed:`, err);
      res.status(500).json({ error: "Failed to list events" });
    }
  });

  // Neighborhood-wide Recent activity tab (BACKLOG.md Ref 27's expanded
  // scope): the ~50 most recent check-ins, favorites, challenge completions,
  // and badge unlocks across every user in the neighborhood, with actor
  // names masked to "A user" for private profiles.
  app.get("/neighborhoods/:id/activity", async (req, res) => {
    try {
      const activity = await listRecentActivity(req.params.id, getActivityRepository());
      res.json(activity);
    } catch (err) {
      console.error(`GET /neighborhoods/${req.params.id}/activity failed:`, err);
      res.status(500).json({ error: "Failed to load activity" });
    }
  });

  // Happening now tab (BACKLOG.md Ref 27): events in progress right now plus
  // businesses/POIs whose cached hours say they're currently open.
  app.get("/neighborhoods/:id/happening-now", async (req, res) => {
    try {
      const happeningNow = await getHappeningNow(
        req.params.id,
        getEventRepository(),
        getEnrichmentRepository()
      );
      res.json(happeningNow);
    } catch (err) {
      console.error(`GET /neighborhoods/${req.params.id}/happening-now failed:`, err);
      res.status(500).json({ error: "Failed to load what's happening now" });
    }
  });

  // Venues are browsed from the neighborhood page (BACKLOG.md), not a
  // standalone /venues page -- scoped by the venue table's neighborhood_id.
  app.get("/neighborhoods/:id/venues", async (req, res) => {
    try {
      const venues = await getLocationRepository().listVenues(req.params.id);
      res.json(venues);
    } catch (err) {
      console.error(`GET /neighborhoods/${req.params.id}/venues failed:`, err);
      res.status(500).json({ error: "Failed to list venues" });
    }
  });

  // Neighborhood membership (BACKLOG.md "Neighborhoods on landing page and
  // user profile"): sign-in required, unlike favorite/checkin above -- both
  // surfaces this feeds (My account, home neighborhood) already require a
  // real account.
  app.post(
    "/neighborhoods/:id/join",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const result = await joinNeighborhood(
          req.params.id,
          req.appUser!.id,
          getNeighborhoodMemberRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }
        res.status(result.status === "created" ? 201 : 200).json(result.membership);
      } catch (err) {
        console.error(`POST /neighborhoods/${req.params.id}/join failed:`, err);
        res.status(500).json({ error: "Failed to join neighborhood" });
      }
    }
  );

  app.delete(
    "/neighborhoods/:id/join",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const result = await leaveNeighborhood(
          req.params.id,
          req.appUser!.id,
          getNeighborhoodMemberRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }
        res.status(204).end();
      } catch (err) {
        console.error(`DELETE /neighborhoods/${req.params.id}/join failed:`, err);
        res.status(500).json({ error: "Failed to leave neighborhood" });
      }
    }
  );

  // Marks this neighborhood as the user's "home" -- requires already being a
  // member (join first), rather than joining implicitly, so a user can't end
  // up with a home neighborhood they never explicitly opted into.
  app.post(
    "/neighborhoods/:id/home",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const result = await setHomeNeighborhood(
          req.params.id,
          req.appUser!.id,
          getNeighborhoodMemberRepository()
        );
        if (result.status === "not_a_member") {
          res.status(409).json({ error: "Join this neighborhood before setting it as home" });
          return;
        }
        res.json(result.membership);
      } catch (err) {
        console.error(`POST /neighborhoods/${req.params.id}/home failed:`, err);
        res.status(500).json({ error: "Failed to set home neighborhood" });
      }
    }
  );

  // README §4 Phase 1: GPS geofence check-in, with a cooldown to prevent
  // gaming streaks/badges (see checkins/checkin.ts for the actual radius and
  // cooldown values).
  // Check-in against either a business or a POI (BACKLOG.md Ref 6/"POIs and
  // venues managed almost the same") -- merged from the old
  // POST /venues/:id/checkins + POST /pois/:id/checkins, same GPS
  // geofence/cooldown rules for both.
  app.post("/locations/:id/checkins", async (req, res) => {
    const { anonymous_device_id, lat, lng } = req.body ?? {};
    if (
      typeof anonymous_device_id !== "string" ||
      !anonymous_device_id ||
      typeof lat !== "number" ||
      typeof lng !== "number"
    ) {
      res.status(400).json({ error: "anonymous_device_id, lat, and lng are required" });
      return;
    }

    try {
      const result = await performCheckin(
        req.params.id,
        anonymous_device_id,
        { lat, lng },
        getCheckinRepository()
      );

      switch (result.status) {
        case "not_found":
          res.status(404).json({ error: "Location not found" });
          return;
        case "too_far":
          res
            .status(400)
            .json({ error: "Too far from location to check in", distance_meters: result.distanceMeters });
          return;
        case "cooldown":
          res
            .status(429)
            .json({ error: "Check-in cooldown still active", retry_at: result.retryAt, scope: result.scope });
          return;
        case "created": {
          // Points/challenges/badges (BACKLOG.md Ref 6) -- awaited before the
          // response is sent (rather than fired-and-forgotten after it) since
          // this API runs as a Netlify/Lambda function: the runtime can
          // freeze the container as soon as the HTTP response completes, so
          // work still pending in the event loop after res.json() isn't
          // guaranteed to run. A failure here is still swallowed -- the
          // check-in itself already succeeded and shouldn't be undone by a
          // rewards-evaluation error -- but the response's rewards then just
          // report nothing earned, rather than failing the check-in.
          let rewards: CheckinRewardsSummary = { points_earned: 0, challenges_completed: [], badges_earned: [] };
          try {
            const summary = await awardCheckinRewards(
              {
                userId: result.checkin.user_id,
                checkinId: result.checkin.id,
                venueId: req.params.id,
                checkedInAt: result.checkin.checked_in_at,
              },
              getGamificationRepository()
            );
            rewards = {
              points_earned: summary.pointsEarned,
              challenges_completed: summary.challengesCompleted.map((c) => ({
                id: c.id,
                title: c.title,
                points_reward: c.pointsReward,
                badge: c.badge,
              })),
              badges_earned: summary.badgesEarned,
            };
          } catch (err) {
            console.error(`awardCheckinRewards (location ${req.params.id}) failed:`, err);
          }
          res.status(201).json({ ...result.checkin, rewards });
          return;
        }
      }
    } catch (err) {
      console.error(`POST /locations/${req.params.id}/checkins failed:`, err);
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  // My account page (BACKLOG.md): venue-joined check-in history for the
  // signed-in user, keyed off the real app_user id rather than an
  // anonymous_device_id since this page requires being signed in.
  app.get("/me/checkins", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const checkins = await getCheckinRepository().listCheckinsForUser(req.appUser!.id);
      res.json(
        checkins.map((c) => ({
          venue_id: c.venueId,
          name: c.name,
          address: c.address,
          checked_in_at: c.checkedInAt,
        }))
      );
    } catch (err) {
      console.error("GET /me/checkins failed:", err);
      res.status(500).json({ error: "Failed to list check-in history" });
    }
  });

  // Favorite venues (BACKLOG.md): a device-scoped "I like this place"
  // bookmark, toggled independently of check-ins/claims.
  app.get("/venues/:id/favorites", async (req, res) => {
    const anonymousDeviceId = req.query.anonymous_device_id;
    if (typeof anonymousDeviceId !== "string" || !anonymousDeviceId) {
      res.status(400).json({ error: "anonymous_device_id is required" });
      return;
    }

    try {
      const result = await getFavoriteStatus(req.params.id, anonymousDeviceId, getFavoriteRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Venue not found" });
        return;
      }
      res.json({ favorited: result.favorited });
    } catch (err) {
      console.error(`GET /venues/${req.params.id}/favorites failed:`, err);
      res.status(500).json({ error: "Failed to load favorite status" });
    }
  });

  app.post("/venues/:id/favorites", async (req, res) => {
    const { anonymous_device_id } = req.body ?? {};
    if (typeof anonymous_device_id !== "string" || !anonymous_device_id) {
      res.status(400).json({ error: "anonymous_device_id is required" });
      return;
    }

    try {
      const result = await addFavorite(req.params.id, anonymous_device_id, getFavoriteRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Venue not found" });
        return;
      }
      if (result.status === "created") {
        // BACKLOG.md Ref 6: 5pts the first time a venue is favorited/followed
        // -- awaited before the response is sent, since this API runs as a
        // Netlify/Lambda function that can freeze once the response
        // completes (see the checkin routes' comment for the same reasoning).
        try {
          await awardFavoritePoints(
            { userId: result.favorite.user_id, venueId: req.params.id },
            getGamificationRepository()
          );
        } catch (err) {
          console.error(`awardFavoritePoints (venue ${req.params.id}) failed:`, err);
        }
      }
      res.status(result.status === "created" ? 201 : 200).json(result.favorite);
    } catch (err) {
      console.error(`POST /venues/${req.params.id}/favorites failed:`, err);
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  app.delete("/venues/:id/favorites", async (req, res) => {
    const { anonymous_device_id } = req.body ?? {};
    if (typeof anonymous_device_id !== "string" || !anonymous_device_id) {
      res.status(400).json({ error: "anonymous_device_id is required" });
      return;
    }

    try {
      const result = await removeFavorite(req.params.id, anonymous_device_id, getFavoriteRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Venue not found" });
        return;
      }
      res.status(204).end();
    } catch (err) {
      console.error(`DELETE /venues/${req.params.id}/favorites failed:`, err);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // My account page (BACKLOG.md): venue-joined favorites listing for the
  // signed-in user, mirroring GET /me/checkins above.
  app.get("/me/favorites", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const venues = await getFavoriteRepository().listFavoriteVenuesForUser(req.appUser!.id);
      res.json(
        venues.map((v) => ({
          venue_id: v.venueId,
          name: v.name,
          address: v.address,
          created_at: v.createdAt,
        }))
      );
    } catch (err) {
      console.error("GET /me/favorites failed:", err);
      res.status(500).json({ error: "Failed to list favorite venues" });
    }
  });

  // Account page profile summary card (BACKLOG.md Ref 47) -- an all-time,
  // all-neighborhood points total (unlike GET /neighborhoods/:slug/leaderboard,
  // which is neighborhood-scoped and public-visibility-only).
  app.get("/me/points", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const summary = await getUserPoints(req.appUser!.id, getGamificationRepository());
      res.json(summary);
    } catch (err) {
      console.error("GET /me/points failed:", err);
      res.status(500).json({ error: "Failed to load points total" });
    }
  });

  // Account page badges section (BACKLOG.md Ref 55) -- every badge the
  // signed-in user has earned, across every neighborhood, mirroring
  // GET /me/points above.
  app.get("/me/badges", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const badges = await getUserBadges(req.appUser!.id, getGamificationRepository());
      res.json(badges);
    } catch (err) {
      console.error("GET /me/badges failed:", err);
      res.status(500).json({ error: "Failed to load badges" });
    }
  });

  // Account page profile summary card (BACKLOG.md Ref 47) -- an all-time,
  // all-neighborhood completed-challenge count, mirroring GET /me/points
  // above.
  app.get(
    "/me/challenges/completed-count",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const summary = await getUserChallengesSummary(req.appUser!.id, getGamificationRepository());
        res.json(summary);
      } catch (err) {
        console.error("GET /me/challenges/completed-count failed:", err);
        res.status(500).json({ error: "Failed to load completed challenge count" });
      }
    }
  );

  // Account page Challenges tab (BACKLOG.md Ref 47) -- every challenge the
  // signed-in user has completed, across every neighborhood, mirroring
  // GET /me/badges above.
  app.get("/me/challenges", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const challenges = await getUserCompletedChallenges(req.appUser!.id, getGamificationRepository());
      res.json(challenges);
    } catch (err) {
      console.error("GET /me/challenges failed:", err);
      res.status(500).json({ error: "Failed to load completed challenges" });
    }
  });

  // Account page Challenges tab: every challenge the signed-in user has
  // started (progress_count > 0) but not yet completed, across every
  // neighborhood they belong to, mirroring GET /me/challenges (completed)
  // above.
  app.get(
    "/me/challenges/active",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const memberships = await listMembershipsForUser(req.appUser!.id, getNeighborhoodMemberRepository());
        const challenges = await getUserActiveChallenges(
          req.appUser!.id,
          memberships.map((m) => ({ neighborhoodId: m.neighborhood_id, name: m.name })),
          getGamificationRepository()
        );
        res.json(challenges);
      } catch (err) {
        console.error("GET /me/challenges/active failed:", err);
        res.status(500).json({ error: "Failed to load active challenges" });
      }
    }
  );

  // BACKLOG.md Ref 61: every badge that exists (earned or not), so the
  // account page can render "locked" badges alongside GET /me/badges'
  // earned ones. Public/no auth -- the badge catalog isn't per-user data.
  app.get("/badges", async (_req, res) => {
    try {
      const badges = await getGamificationRepository().getAllBadges();
      res.json(badges);
    } catch (err) {
      console.error("GET /badges failed:", err);
      res.status(500).json({ error: "Failed to load badge catalog" });
    }
  });

  // My account page (BACKLOG.md "Neighborhoods on landing page and user
  // profile"): neighborhood-joined membership listing for the signed-in
  // user, mirroring GET /me/favorites above.
  app.get(
    "/me/neighborhoods",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const memberships = await listMembershipsForUser(
          req.appUser!.id,
          getNeighborhoodMemberRepository()
        );
        res.json(memberships);
      } catch (err) {
        console.error("GET /me/neighborhoods failed:", err);
        res.status(500).json({ error: "Failed to list joined neighborhoods" });
      }
    }
  );

  // BACKLOG.md "User profiles with public or private visibility": display
  // name / avatar style / public-private toggle, self-service only --
  // req.appUser is always the caller's own row (resolved from their own
  // token), never another user's, so there's no id param to authorize
  // against. avatar_url itself isn't accepted here (BACKLOG.md "Mushroom
  // avatars") -- it's seeded once from the OAuth provider at signup and
  // otherwise read-only, so a client can never point it at an arbitrary
  // (and potentially explicit-content) URL. avatar_style only toggles
  // between that social photo and the account's mushroom.
  app.patch(
    "/me/profile",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      const { display_name, avatar_style, mushroom_customization, username, visibility } = req.body ?? {};
      if (display_name !== undefined && display_name !== null && typeof display_name !== "string") {
        res.status(400).json({ error: "display_name must be a string or null" });
        return;
      }
      if (avatar_style !== undefined && !AVATAR_STYLES.includes(avatar_style)) {
        res.status(400).json({ error: `avatar_style must be one of ${AVATAR_STYLES.join(", ")}` });
        return;
      }
      if (mushroom_customization !== undefined && !isValidMushroomCustomization(mushroom_customization)) {
        res.status(400).json({
          error:
            "mushroom_customization must be null or an approved { cap, stalk, spots, bg, spotCount, spotShape } combination",
        });
        return;
      }
      if (username !== undefined && username !== null && typeof username !== "string") {
        res.status(400).json({ error: "username must be a string or null" });
        return;
      }
      if (
        typeof username === "string" &&
        username.trim() &&
        !USERNAME_PATTERN.test(username.trim().toLowerCase())
      ) {
        res.status(400).json({
          error: "username must be 3-30 characters: lowercase letters, numbers, underscores, or hyphens",
        });
        return;
      }
      if (visibility !== undefined && !PROFILE_VISIBILITIES.includes(visibility)) {
        res.status(400).json({ error: `visibility must be one of ${PROFILE_VISIBILITIES.join(", ")}` });
        return;
      }

      try {
        const updated = await updateProfile(
          req.appUser!,
          {
            ...(display_name !== undefined && { displayName: display_name }),
            ...(avatar_style !== undefined && { avatarStyle: avatar_style }),
            ...(mushroom_customization !== undefined && { mushroomCustomization: mushroom_customization }),
            ...(username !== undefined && { username }),
            ...(visibility !== undefined && { visibility }),
          },
          getAuthRepository()
        );
        const [isAdmin, isSuperAdmin] = await Promise.all([
          getNeighborhoodAdminRepository().isNeighborhoodAdmin(updated.id),
          getSuperAdminRepository().isSuperAdmin(updated.id),
        ]);
        res.json(toAppUser(updated, isAdmin, isSuperAdmin));
      } catch (err) {
        if (err instanceof UsernameTakenError) {
          res.status(409).json({ error: err.message });
          return;
        }
        console.error("PATCH /me/profile failed:", err);
        res.status(500).json({ error: "Failed to update profile" });
      }
    }
  );

  // BACKLOG.md Ref 14/33 "Connect with other users" / "Friends/neighbors on
  // profile": sends a request to the given username, called a "neighbor" in
  // UI copy rather than "friend". If that user already has a pending
  // request out to the caller, the two are connected immediately instead of
  // leaving two pending rows pointed at each other (see connections.ts).
  app.post(
    "/me/connections",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      const { username } = req.body ?? {};
      if (typeof username !== "string" || !username.trim()) {
        res.status(400).json({ error: "username is required" });
        return;
      }

      try {
        const result = await sendConnectionRequest(
          req.appUser!.id,
          username.trim().toLowerCase(),
          getConnectionRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "User not found" });
          return;
        }
        if (result.status === "self") {
          res.status(400).json({ error: "Cannot connect with yourself" });
          return;
        }
        // BACKLOG.md Ref 14/33: only the mutual-interest auto-accept branch
        // (the other user already had a pending request out to us) reaches
        // "accepted" here -- "created"/"already_requested" are still
        // pending, and "already_connected" was already rewarded when it
        // first became accepted. Awaited before responding for the same
        // Netlify-function-freeze reason as awardFavoritePoints above.
        if (result.status === "accepted") {
          await awardNeighborConnectionRewardsForBothSides(result.connection);
        }
        res.status(result.status === "created" ? 201 : 200).json({
          id: result.connection.id,
          requester_id: result.connection.requesterId,
          recipient_id: result.connection.recipientId,
          status: result.connection.status,
          created_at: result.connection.createdAt,
          responded_at: result.connection.respondedAt,
        });
      } catch (err) {
        console.error("POST /me/connections failed:", err);
        res.status(500).json({ error: "Failed to send connection request" });
      }
    }
  );

  // My account page's Neighbors section: every connection involving the
  // caller, joined with the other party's display info. ?status= narrows to
  // just pending or accepted; omitted returns both.
  app.get(
    "/me/connections",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      const status = req.query.status;
      if (status !== undefined && !CONNECTION_STATUSES.includes(status as ConnectionStatus)) {
        res.status(400).json({ error: `status must be one of ${CONNECTION_STATUSES.join(", ")}` });
        return;
      }

      try {
        const connections = await getConnectionRepository().listConnectionsForUser(
          req.appUser!.id,
          status as ConnectionStatus | undefined
        );
        res.json(
          connections.map((c) => ({
            id: c.id,
            status: c.status,
            direction: c.direction,
            created_at: c.createdAt,
            user: {
              id: c.user.id,
              username: c.user.username,
              display_name: c.user.displayName,
              avatar_url: c.user.avatarUrl,
              avatar_style: c.user.avatarStyle,
              mushroom_customization: c.user.mushroomCustomization,
              mushroom_snapshot: c.user.mushroomSnapshot,
            },
          }))
        );
      } catch (err) {
        console.error("GET /me/connections failed:", err);
        res.status(500).json({ error: "Failed to list connections" });
      }
    }
  );

  app.post(
    "/me/connections/:id/accept",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const result = await acceptConnectionRequest(req.appUser!.id, req.params.id, getConnectionRepository());
        if (result.status === "not_found") {
          res.status(404).json({ error: "Connection request not found" });
          return;
        }
        if (result.status === "forbidden") {
          res.status(403).json({ error: "Not your connection request to accept" });
          return;
        }
        if (result.status === "not_pending") {
          res.status(409).json({ error: "Connection request is no longer pending" });
          return;
        }
        await awardNeighborConnectionRewardsForBothSides(result.connection);
        res.json({
          id: result.connection.id,
          requester_id: result.connection.requesterId,
          recipient_id: result.connection.recipientId,
          status: result.connection.status,
          created_at: result.connection.createdAt,
          responded_at: result.connection.respondedAt,
        });
      } catch (err) {
        console.error(`POST /me/connections/${req.params.id}/accept failed:`, err);
        res.status(500).json({ error: "Failed to accept connection request" });
      }
    }
  );

  // Declines a pending incoming request, cancels a pending outgoing
  // request, or removes an already-accepted connection -- all three are a
  // hard delete rather than a status change (connections.ts removeConnection).
  app.delete(
    "/me/connections/:id",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const result = await removeConnection(req.appUser!.id, req.params.id, getConnectionRepository());
        if (result.status === "not_found") {
          res.status(404).json({ error: "Connection not found" });
          return;
        }
        if (result.status === "forbidden") {
          res.status(403).json({ error: "Not your connection to remove" });
          return;
        }
        res.status(204).end();
      } catch (err) {
        console.error(`DELETE /me/connections/${req.params.id} failed:`, err);
        res.status(500).json({ error: "Failed to remove connection" });
      }
    }
  );

  // BACKLOG.md "Public user profiles": the username-keyed public counterpart
  // to /me/profile, mirroring how GET /neighborhoods/:slug is the public
  // lookup alongside the id-keyed neighborhood-admin routes. Returns 404 for
  // both "no such username" and "profile is private" -- a private profile
  // isn't distinguishable from a nonexistent one to an outside caller.
  // Recent check-ins are gated by the same profile-level visibility, since
  // checkin has no per-row privacy field of its own. checkin_count/
  // favorite_count/points_summary let the web app render ProfileSummaryCard
  // here too -- favorite_count is a plain count (the favorited venues
  // themselves stay private; only /me/favorites lists them). neighbor_count
  // is likewise a plain count (BACKLOG.md Ref 14/33) -- the connections
  // themselves stay private to the two parties, only /me/connections lists
  // them. `badges`/`challenges` are full lists like their /me/ equivalents
  // (the profile page itself only surfaces the latest of each).
  app.get("/users/:username", async (req, res) => {
    try {
      const user = await getAuthRepository().getByUsername(req.params.username.toLowerCase());
      if (!user || user.visibility !== "public") {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const [checkins, neighborhoods, badges, challenges, favorites, pointsSummary, neighborCount, connections] =
        await Promise.all([
          getCheckinRepository().listCheckinsForUser(user.id),
          listMembershipsForUser(user.id, getNeighborhoodMemberRepository()),
          getUserBadges(user.id, getGamificationRepository()),
          getUserCompletedChallenges(user.id, getGamificationRepository()),
          getFavoriteRepository().listFavoriteVenuesForUser(user.id),
          getUserPoints(user.id, getGamificationRepository()),
          getConnectionRepository().countAcceptedConnectionsForUser(user.id),
          getConnectionRepository().listConnectionsForUser(user.id, "accepted"),
        ]);
      // Snapshots only (no username/id) -- see PublicUserProfile's
      // neighbor_mushrooms comment for why this is safe to expose alongside
      // the bare neighbor_count, unlike the request-gated neighbor list
      // itself.
      const neighborMushrooms = connections
        .map((c) => c.user.mushroomSnapshot)
        .filter((snapshot): snapshot is NonNullable<typeof snapshot> => snapshot !== null)
        .slice(0, RECENT_CHECKIN_MOSAIC_LIMIT);

      res.json({
        username: user.username,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        avatar_style: user.avatarStyle,
        mushroom_customization: user.mushroomCustomization,
        joined_at: user.createdAt,
        neighborhoods,
        recent_checkins: checkins.slice(0, PUBLIC_PROFILE_CHECKIN_LIMIT).map((c) => ({
          venue_id: c.venueId,
          name: c.name,
          address: c.address,
          checked_in_at: c.checkedInAt,
        })),
        badges,
        challenges,
        checkin_count: checkins.length,
        favorite_count: favorites.length,
        points_summary: pointsSummary,
        neighbor_count: neighborCount,
        neighbor_mushrooms: neighborMushrooms,
      });
    } catch (err) {
      console.error(`GET /users/${req.params.username} failed:`, err);
      res.status(500).json({ error: "Failed to load user profile" });
    }
  });

  // README §5: claim submission is public; verification is manual/admin
  // reviewed (no SMS/email provider wired in yet) via the /admin/claims
  // routes below. Authentication is optional here (attachOptionalAuthUser)
  // rather than required -- any signed-in account (consumer or business, see
  // claimed_by_user_id / GET /business/venues below) gets its claim
  // auto-linked, since account_type can still be promoted to business later
  // via /auth/promote-to-business -- gating this on already being a business
  // account at submission time would silently drop the link for the common
  // "submit a claim, then promote" order. The anonymous contact-info-only
  // path still works unchanged.
  app.post(
    "/venues/:id/claims",
    attachOptionalAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      const { contact_name, contact_method, contact_value, note } = req.body ?? {};
      if (
        typeof contact_name !== "string" ||
        !contact_name ||
        typeof contact_value !== "string" ||
        !contact_value ||
        !CONTACT_METHODS.includes(contact_method)
      ) {
        res.status(400).json({
          error: `contact_name, contact_value, and contact_method (one of ${CONTACT_METHODS.join(", ")}) are required`,
        });
        return;
      }
      if (note !== undefined && typeof note !== "string") {
        res.status(400).json({ error: "note must be a string" });
        return;
      }

      try {
        const result = await submitClaim(
          req.params.id,
          {
            contactName: contact_name,
            contactMethod: contact_method,
            contactValue: contact_value,
            note,
            claimedByUserId: req.appUser?.id ?? null,
          },
          getClaimRepository()
        );

        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Venue not found" });
            return;
          case "already_claimed":
            res.status(409).json({ error: "Venue is already claimed" });
            return;
          case "created":
            res.status(201).json(result.claim);
            return;
        }
      } catch (err) {
        console.error(`POST /venues/${req.params.id}/claims failed:`, err);
        res.status(500).json({ error: "Failed to submit claim" });
      }
    }
  );

  // Admin portal: neighborhood boundary drawing (BACKLOG.md Ref 8, project
  // plan §12.3/§12.6). Gated by adminGate (admin of *any* neighborhood, same
  // rationale as GET /neighborhood-admin/neighborhoods) since a brand-new
  // neighborhood has no :id yet to scope a neighborhoodAdminGate check by.
  app.post("/admin/neighborhoods/preview-boundary", adminGate, async (req, res) => {
    const { boundary_geojson } = req.body ?? {};
    if (!isValidPolygon(boundary_geojson)) {
      res.status(400).json({ error: "boundary_geojson must be a closed GeoJSON Polygon" });
      return;
    }

    try {
      const categories = await getPlacesRepository().listCategories();
      const report = await previewNeighborhoodBoundary(
        boundary_geojson,
        getCachedPlacesClient(),
        categories
      );
      res.json({
        tiles_queried: report.tilesQueried,
        api_calls_made: report.apiCallsMade,
        calls_at_result_cap: report.callsAtResultCap,
        candidates: report.candidates.map((c) => ({
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          address: c.address,
          category_name: c.categoryName,
        })),
      });
    } catch (err) {
      console.error("POST /admin/neighborhoods/preview-boundary failed:", err);
      res.status(500).json({ error: "Failed to preview boundary" });
    }
  });

  // Gated to super admin, not just adminGate's "admin of some neighborhood"
  // (BACKLOG.md) -- until the platform is ready to scale, creating a
  // brand-new neighborhood is a super-admin-only action. The dry-run
  // preview-boundary route just above stays on adminGate since it's shared
  // with the existing-neighborhood boundary-redraw flow (BoundaryMap.tsx),
  // which any neighborhood admin should still be able to preview.
  app.post("/admin/neighborhoods", superAdminGate, async (req, res) => {
    const { name, slug, city, state, country, timezone, boundary_geojson } = req.body ?? {};
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof slug !== "string" ||
      !slug.trim() ||
      typeof city !== "string" ||
      !city.trim() ||
      typeof state !== "string" ||
      !state.trim() ||
      typeof country !== "string" ||
      !country.trim() ||
      typeof timezone !== "string" ||
      !timezone.trim()
    ) {
      res.status(400).json({ error: "name, slug, city, state, country, and timezone are required" });
      return;
    }
    if (!isValidPolygon(boundary_geojson)) {
      res.status(400).json({ error: "boundary_geojson must be a closed GeoJSON Polygon" });
      return;
    }

    try {
      const created = await createNeighborhood(
        { name, slug, city, state, country, timezone, boundaryGeojson: boundary_geojson },
        getNeighborhoodRepository()
      );
      // The creator has no standing admin row for this brand-new
      // neighborhood id -- grant it now so neighborhoodAdminGate doesn't lock
      // them out of the boundary/description/etc. tools right after creating it.
      await getNeighborhoodAdminRepository().addNeighborhoodAdmin(req.appUser!.id, created.id);

      res.status(201).json({
        id: created.id,
        name: created.name,
        slug: created.slug,
        city: created.city,
        state: created.state,
        country: created.country,
        timezone: created.timezone,
        status: created.status,
        boundary_geojson: created.boundaryGeojson,
        center_lat: created.centerLat,
        center_lng: created.centerLng,
      });
    } catch (err) {
      if (err instanceof SlugTakenError) {
        res.status(409).json({ error: err.message });
        return;
      }
      console.error("POST /admin/neighborhoods failed:", err);
      res.status(500).json({ error: "Failed to create neighborhood" });
    }
  });

  app.get("/admin/categories", adminGate, async (_req, res) => {
    try {
      const categories = await listAssignableCategories(getLocationRepository());
      res.json(categories);
    } catch (err) {
      console.error("GET /admin/categories failed:", err);
      res.status(500).json({ error: "Failed to list categories" });
    }
  });

  // Category taxonomy management (BACKLOG.md Ref 4): create/rename/archive
  // actions on the category table itself -- distinct from the mapping tool
  // above, which only reassigns which existing category a venue points to.
  app.get("/admin/category-taxonomy", adminGate, async (_req, res) => {
    try {
      const categories = await listCategoriesForAdmin(getCategoryAdminRepository());
      res.json(categories);
    } catch (err) {
      console.error("GET /admin/category-taxonomy failed:", err);
      res.status(500).json({ error: "Failed to list categories" });
    }
  });

  app.post("/admin/category-taxonomy", adminGate, async (req, res) => {
    const { name, parent_category_id, google_types } = req.body ?? {};
    if (typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (parent_category_id !== null && parent_category_id !== undefined && typeof parent_category_id !== "string") {
      res.status(400).json({ error: "parent_category_id must be a string or null" });
      return;
    }
    if (
      google_types !== undefined &&
      (!Array.isArray(google_types) || !google_types.every((t) => typeof t === "string"))
    ) {
      res.status(400).json({ error: "google_types must be an array of strings" });
      return;
    }

    try {
      const result = await createCategory(
        name,
        parent_category_id ?? null,
        google_types ?? [],
        getCategoryAdminRepository()
      );

      switch (result.status) {
        case "invalid_name":
          res.status(400).json({ error: "name must not be empty" });
          return;
        case "invalid_parent":
          res.status(400).json({ error: "parent_category_id must reference an existing top-level group" });
          return;
        case "created":
          res.status(201).json(result.category);
          return;
      }
    } catch (err) {
      console.error("POST /admin/category-taxonomy failed:", err);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/admin/category-taxonomy/:id", adminGate, async (req, res) => {
    const { name } = req.body ?? {};
    if (typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }

    try {
      const result = await renameCategory(req.params.id, name, getCategoryAdminRepository());

      switch (result.status) {
        case "not_found":
          res.status(404).json({ error: "Category not found" });
          return;
        case "invalid_name":
          res.status(400).json({ error: "name must not be empty" });
          return;
        case "renamed":
          res.json(result.category);
          return;
      }
    } catch (err) {
      console.error(`PATCH /admin/category-taxonomy/${req.params.id} failed:`, err);
      res.status(500).json({ error: "Failed to rename category" });
    }
  });

  app.post("/admin/category-taxonomy/:id/archive", adminGate, async (req, res) => {
    try {
      const result = await archiveCategory(req.params.id, getCategoryAdminRepository());

      switch (result.status) {
        case "not_found":
          res.status(404).json({ error: "Category not found" });
          return;
        case "in_use":
          res.status(409).json({ error: `Category is assigned to ${result.venueCount} venue(s)` });
          return;
        case "has_children":
          res.status(409).json({ error: `Category has ${result.childCount} active subcategory(ies)` });
          return;
        case "archived":
          res.json(result.category);
          return;
      }
    } catch (err) {
      console.error(`POST /admin/category-taxonomy/${req.params.id}/archive failed:`, err);
      res.status(500).json({ error: "Failed to archive category" });
    }
  });

  // README §14.2: the anonymous app_user row gets its is_anonymous flag
  // flipped and auth credentials attached in place -- no data migration.
  // The caller must already hold a valid Supabase Auth session (the
  // Authorization bearer token); this endpoint only links it to app_user.
  app.post("/auth/complete-signup", async (req, res) => {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { anonymous_device_id, account_type } = req.body ?? {};
    if (anonymous_device_id !== undefined && typeof anonymous_device_id !== "string") {
      res.status(400).json({ error: "anonymous_device_id must be a string" });
      return;
    }
    if (account_type !== undefined && !ACCOUNT_TYPES.includes(account_type)) {
      res.status(400).json({ error: `account_type must be one of ${ACCOUNT_TYPES.join(", ")}` });
      return;
    }

    try {
      const verified = await verifyAccessToken(getSupabaseClient(), token);
      if (!verified) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const user = await completeSignup(
        verified,
        account_type ?? "consumer",
        anonymous_device_id ?? null,
        getAuthRepository()
      );
      await awardFounderBadge(user.id, getGamificationRepository());
      const [isAdmin, isSuperAdmin] = await Promise.all([
        getNeighborhoodAdminRepository().isNeighborhoodAdmin(user.id),
        getSuperAdminRepository().isSuperAdmin(user.id),
      ]);
      res.status(200).json(toAppUser(user, isAdmin, isSuperAdmin));
    } catch (err) {
      console.error("POST /auth/complete-signup failed:", err);
      res.status(500).json({ error: "Failed to complete signup" });
    }
  });

  // README §14.2 edge case: merges a device's anonymous check-in history
  // into the account being logged into, if the device had accumulated any
  // under a different app_user row.
  app.post("/auth/complete-login", async (req, res) => {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { anonymous_device_id } = req.body ?? {};
    if (anonymous_device_id !== undefined && typeof anonymous_device_id !== "string") {
      res.status(400).json({ error: "anonymous_device_id must be a string" });
      return;
    }

    try {
      const verified = await verifyAccessToken(getSupabaseClient(), token);
      if (!verified) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const result = await completeLogin(verified, anonymous_device_id ?? null, getAuthRepository());
      if (result.status === "not_signed_up") {
        res.status(404).json({ error: "No account found for this login -- complete signup first" });
        return;
      }
      const [isAdmin, isSuperAdmin] = await Promise.all([
        getNeighborhoodAdminRepository().isNeighborhoodAdmin(result.user.id),
        getSuperAdminRepository().isSuperAdmin(result.user.id),
      ]);
      res.json(toAppUser(result.user, isAdmin, isSuperAdmin));
    } catch (err) {
      console.error("POST /auth/complete-login failed:", err);
      res.status(500).json({ error: "Failed to complete login" });
    }
  });

  app.get("/auth/me", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    const [isAdmin, isSuperAdmin] = await Promise.all([
      getNeighborhoodAdminRepository().isNeighborhoodAdmin(req.appUser!.id),
      getSuperAdminRepository().isSuperAdmin(req.appUser!.id),
    ]);
    res.json(toAppUser(req.appUser!, isAdmin, isSuperAdmin));
  });

  // Any signed-in account can upgrade itself to a business account -- there's
  // no separate business signup path, just this account_type flip in place.
  app.post(
    "/auth/promote-to-business",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const user = await promoteToBusiness(req.appUser!, getAuthRepository());
        const [isAdmin, isSuperAdmin] = await Promise.all([
          getNeighborhoodAdminRepository().isNeighborhoodAdmin(user.id),
          getSuperAdminRepository().isSuperAdmin(user.id),
        ]);
        res.json(toAppUser(user, isAdmin, isSuperAdmin));
      } catch (err) {
        console.error("POST /auth/promote-to-business failed:", err);
        res.status(500).json({ error: "Failed to upgrade to a business account" });
      }
    }
  );

  // Business-account-gated placeholder for the business portal's authoring
  // tools (BACKLOG "Business announcements" etc., which depend on this item
  // for the business-side login) -- proves the account_type gate end-to-end
  // by listing the venues this business account has an approved claim on.
  app.get(
    "/business/venues",
    requireBusinessAccount(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const venues = await getClaimRepository().listClaimedVenuesForUser(req.appUser!.id);
        res.json(
          venues.map((v) => ({ venue_id: v.venueId, name: v.name, address: v.address }))
        );
      } catch (err) {
        console.error("GET /business/venues failed:", err);
        res.status(500).json({ error: "Failed to list claimed venues" });
      }
    }
  );

  // Business owner venue dashboard (BACKLOG.md): follower/check-in stats plus
  // this venue's own announcements/events, for the specific venue this
  // business account holds an approved claim on (enforced by venueOwnerGate,
  // not just "is a business account" like GET /business/venues above).
  app.get("/business/venues/:id/dashboard", venueOwnerGate, async (req, res) => {
    try {
      const venue = await getLocationRepository().getLocationById(req.params.id);
      if (!venue) {
        res.status(404).json({ error: "Venue not found" });
        return;
      }

      const [followerCount, checkinCount, announcements, events, socialLinks] = await Promise.all([
        getFavoriteRepository().countFavoritesForVenue(req.params.id),
        getCheckinRepository().countCheckinsForLocation(req.params.id),
        listAnnouncementsForVenue(req.params.id, getAnnouncementRepository()),
        listEventsForVenue(req.params.id, getEventRepository()),
        getVenueSocialLinks(req.params.id, getClaimRepository()),
      ]);

      const summary: VenueDashboardSummary = {
        venue_id: venue.id,
        name: venue.name,
        address: venue.address ?? "",
        follower_count: followerCount,
        checkin_count: checkinCount,
        announcements,
        events,
        social_links: socialLinks,
      };
      res.json(summary);
    } catch (err) {
      console.error(`GET /business/venues/${req.params.id}/dashboard failed:`, err);
      res.status(500).json({ error: "Failed to load venue dashboard" });
    }
  });

  app.patch("/business/venues/:id/social-links", venueOwnerGate, async (req, res) => {
    const socialLinks = parseSocialLinks(req.body?.social_links);
    if (!socialLinks) {
      res.status(400).json({ error: "social_links must be a map of known platforms to string URLs" });
      return;
    }

    try {
      const updated = await updateVenueSocialLinks(req.params.id, socialLinks, getClaimRepository());
      res.json({ social_links: updated });
    } catch (err) {
      console.error(`PATCH /business/venues/${req.params.id}/social-links failed:`, err);
      res.status(500).json({ error: "Failed to update social links" });
    }
  });

  app.post("/business/venues/:id/announcements", venueOwnerGate, async (req, res) => {
    const { title, body } = req.body ?? {};
    if (typeof title !== "string" || !title || typeof body !== "string" || !body) {
      res.status(400).json({ error: "title and body are required" });
      return;
    }

    try {
      const announcement = await createAnnouncement(
        req.params.id,
        { title, body },
        getAnnouncementRepository()
      );
      res.status(201).json(announcement);
    } catch (err) {
      console.error(`POST /business/venues/${req.params.id}/announcements failed:`, err);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  app.post("/business/venues/:id/events", venueOwnerGate, async (req, res) => {
    const { title, description, start_time, end_time } = req.body ?? {};
    if (
      typeof title !== "string" ||
      !title ||
      typeof description !== "string" ||
      !description ||
      typeof start_time !== "string" ||
      !start_time ||
      typeof end_time !== "string" ||
      !end_time
    ) {
      res
        .status(400)
        .json({ error: "title, description, start_time, and end_time are required" });
      return;
    }

    try {
      const result = await createEvent(
        req.params.id,
        { title, description, startTime: start_time, endTime: end_time },
        getEventRepository()
      );

      switch (result.status) {
        case "invalid_time_range":
          res.status(400).json({ error: "end_time must be after start_time" });
          return;
        case "created":
          res.status(201).json(result.event);
          return;
      }
    } catch (err) {
      console.error(`POST /business/venues/${req.params.id}/events failed:`, err);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Neighborhood profile pages (BACKLOG.md): self-serve authoring surface for
  // a neighborhood's own admins, mirroring the business owner venue
  // dashboard's shape but scoped to Neighborhood instead of Venue. The list
  // route below is gated by adminGate (admin of *any* neighborhood, same as
  // GET /business/venues is gated by "any business account") since it has no
  // :id to scope by; every route below it -- including the claims and venues
  // routes further down, folded in from the old global /admin/claims and
  // /admin/venues (docs/url-map.md refactor) -- is gated by
  // neighborhoodAdminGate, scoped to req.params.id specifically.
  app.get("/neighborhood-admin/neighborhoods", adminGate, async (req, res) => {
    try {
      const neighborhoods = await getNeighborhoodAdminRepository().listNeighborhoodsForAdmin(
        req.appUser!.id
      );
      res.json(
        neighborhoods.map((n) => ({ neighborhood_id: n.neighborhoodId, name: n.name, slug: n.slug }))
      );
    } catch (err) {
      console.error("GET /neighborhood-admin/neighborhoods failed:", err);
      res.status(500).json({ error: "Failed to list administered neighborhoods" });
    }
  });

  app.get(
    "/neighborhood-admin/neighborhoods/:id/dashboard",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const neighborhood = await getNeighborhoodById(req.params.id, getNeighborhoodRepository());
        if (!neighborhood) {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }

        const [pois, events] = await Promise.all([
          listLocationsForNeighborhood(req.params.id, getLocationRepository(), "poi"),
          listEventsForNeighborhood(req.params.id, getEventRepository()),
        ]);

        const summary: NeighborhoodDashboardSummary = {
          neighborhood_id: neighborhood.id,
          name: neighborhood.name,
          slug: neighborhood.slug,
          description: neighborhood.description,
          pois,
          events,
          social_links: neighborhood.social_links,
        };
        res.json(summary);
      } catch (err) {
        console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/dashboard failed:`, err);
        res.status(500).json({ error: "Failed to load neighborhood dashboard" });
      }
    }
  );

  app.patch("/neighborhood-admin/neighborhoods/:id", neighborhoodAdminGate, async (req, res) => {
    const { description } = req.body ?? {};
    if (typeof description !== "string") {
      res.status(400).json({ error: "description is required" });
      return;
    }

    try {
      const result = await updateNeighborhoodDescription(
        req.params.id,
        description,
        getNeighborhoodRepository()
      );
      if (result.status === "not_found") {
        res.status(404).json({ error: "Neighborhood not found" });
        return;
      }
      res.json(result.neighborhood);
    } catch (err) {
      console.error(`PATCH /neighborhood-admin/neighborhoods/${req.params.id} failed:`, err);
      res.status(500).json({ error: "Failed to update neighborhood" });
    }
  });

  // Admin portal: neighborhood boundary drawing (BACKLOG.md Ref 8, project
  // plan §12.6) -- also covers re-editing an existing neighborhood's
  // boundary, not just the create flow above.
  app.get("/neighborhood-admin/neighborhoods/:id/boundary", neighborhoodAdminGate, async (req, res) => {
    try {
      const result = await getNeighborhoodBoundary(req.params.id, getNeighborhoodRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Neighborhood not found" });
        return;
      }
      res.json({
        boundary_geojson: result.boundary.boundaryGeojson,
        center_lat: result.boundary.centerLat,
        center_lng: result.boundary.centerLng,
      });
    } catch (err) {
      console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/boundary failed:`, err);
      res.status(500).json({ error: "Failed to load neighborhood boundary" });
    }
  });

  app.patch(
    "/neighborhood-admin/neighborhoods/:id/boundary",
    neighborhoodAdminGate,
    async (req, res) => {
      const { boundary_geojson } = req.body ?? {};
      if (!isValidPolygon(boundary_geojson)) {
        res.status(400).json({ error: "boundary_geojson must be a closed GeoJSON Polygon" });
        return;
      }

      try {
        const result = await updateNeighborhoodBoundary(
          req.params.id,
          boundary_geojson,
          getNeighborhoodRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }
        res.json({
          boundary_geojson: result.boundary.boundaryGeojson,
          center_lat: result.boundary.centerLat,
          center_lng: result.boundary.centerLng,
        });
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/boundary failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update neighborhood boundary" });
      }
    }
  );

  app.patch(
    "/neighborhood-admin/neighborhoods/:id/social-links",
    neighborhoodAdminGate,
    async (req, res) => {
      const socialLinks = parseSocialLinks(req.body?.social_links);
      if (!socialLinks) {
        res.status(400).json({ error: "social_links must be a map of known platforms to string URLs" });
        return;
      }

      try {
        const result = await updateNeighborhoodSocialLinks(
          req.params.id,
          socialLinks,
          getNeighborhoodRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }
        res.json(result.neighborhood);
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/social-links failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update social links" });
      }
    }
  );

  app.post(
    "/neighborhood-admin/neighborhoods/:id/events",
    neighborhoodAdminGate,
    async (req, res) => {
      const { title, description, start_time, end_time } = req.body ?? {};
      if (
        typeof title !== "string" ||
        !title ||
        typeof description !== "string" ||
        !description ||
        typeof start_time !== "string" ||
        !start_time ||
        typeof end_time !== "string" ||
        !end_time
      ) {
        res
          .status(400)
          .json({ error: "title, description, start_time, and end_time are required" });
        return;
      }

      try {
        const result = await createEventForNeighborhood(
          req.params.id,
          { title, description, startTime: start_time, endTime: end_time },
          getEventRepository()
        );

        switch (result.status) {
          case "invalid_time_range":
            res.status(400).json({ error: "end_time must be after start_time" });
            return;
          case "created":
            res.status(201).json(result.event);
            return;
        }
      } catch (err) {
        console.error(`POST /neighborhood-admin/neighborhoods/${req.params.id}/events failed:`, err);
        res.status(500).json({ error: "Failed to create event" });
      }
    }
  );

  // Manual location creation (BACKLOG.md "POIs and venues managed almost
  // the same") -- only the "+ Add point of interest" admin flow posts here
  // today (kind hardcoded to "poi" client-side); kind "business" is accepted
  // for forward compatibility but has no manual-create UI yet.
  app.post("/neighborhood-admin/neighborhoods/:id/locations", neighborhoodAdminGate, async (req, res) => {
    const { kind, name, description, type, category_id, lat, lng, google_place_id, address } = req.body ?? {};
    if (kind !== "business" && kind !== "poi") {
      res.status(400).json({ error: "kind must be 'business' or 'poi'" });
      return;
    }
    if (typeof name !== "string" || !name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (kind === "poi" && (typeof type !== "string" || !type)) {
      res.status(400).json({ error: "type is required for kind 'poi'" });
      return;
    }
    if (description !== undefined && typeof description !== "string") {
      res.status(400).json({ error: "description must be a string" });
      return;
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      res.status(400).json({ error: "lat and lng are required" });
      return;
    }
    if (google_place_id !== undefined && typeof google_place_id !== "string") {
      res.status(400).json({ error: "google_place_id must be a string" });
      return;
    }
    if (address !== undefined && typeof address !== "string") {
      res.status(400).json({ error: "address must be a string" });
      return;
    }

    try {
      const location = await createLocation(
        req.params.id,
        { kind, name, description, type, categoryId: category_id, lat, lng, googlePlaceId: google_place_id, address },
        getLocationRepository()
      );
      res.status(201).json(location);
    } catch (err) {
      console.error(`POST /neighborhood-admin/neighborhoods/${req.params.id}/locations failed:`, err);
      res.status(500).json({ error: "Failed to create location" });
    }
  });

  app.get("/neighborhood-admin/neighborhoods/:id/locations", neighborhoodAdminGate, async (req, res) => {
    const search = req.query.search;
    if (search !== undefined && typeof search !== "string") {
      res.status(400).json({ error: "search must be a string" });
      return;
    }

    try {
      const items = await listLocationListItemsForNeighborhood(req.params.id, getLocationRepository(), search);
      res.json(items);
    } catch (err) {
      console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/locations failed:`, err);
      res.status(500).json({ error: "Failed to list locations" });
    }
  });

  // Reimport cooldown status (BACKLOG.md "Reimport Locations") -- read-only,
  // never touches Google Places, so both the Locations tab (to show/disable
  // the reimport button before the admin even navigates to the review page)
  // and the review page itself (so "Run review" reflects the same cooldown
  // rather than only failing after the fact with a 429) can check without
  // spending API quota. Registered ahead of the generic GET
  // .../locations/:locationId route below for the same reason
  // .../locations/review is -- see that route's comment.
  app.get(
    "/neighborhood-admin/neighborhoods/:id/locations/review/status",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const [boundaryResult, isSuperAdmin] = await Promise.all([
          getNeighborhoodBoundary(req.params.id, getNeighborhoodRepository()),
          getSuperAdminRepository().isSuperAdmin(req.appUser!.id),
        ]);
        if (boundaryResult.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }

        const cooldown = getLocationsReviewCooldownStatus(
          boundaryResult.boundary.locationsReviewedAt,
          new Date(),
          isSuperAdmin
        );
        res.json({
          last_reviewed_at: cooldown.lastReviewedAt,
          next_allowed_at: cooldown.nextAllowedAt,
          can_run: cooldown.canRun,
        });
      } catch (err) {
        console.error(
          `GET /neighborhood-admin/neighborhoods/${req.params.id}/locations/review/status failed:`,
          err
        );
        res.status(500).json({ error: "Failed to load reimport status" });
      }
    }
  );

  // Bulk Places review (BACKLOG.md Ref 29) -- an admin-triggered dry-run
  // Google Places query against the neighborhood's *saved* boundary (never
  // an unsaved draft -- that's what /admin/neighborhoods/preview-boundary is
  // for), listing places not yet represented as a venue or POI. Costs a real
  // Places API call each time it runs, same as preview-boundary -- rate
  // limited to once per 24h per neighborhood (BACKLOG.md "Reimport
  // Locations") since an earlier unthrottled version of this exhausted a
  // real Google Cloud project's SearchNearbyRequest-per-minute quota.
  //
  // Registered ahead of the generic GET .../locations/:locationId route
  // below -- Express matches routes in registration order, and `:locationId`
  // matches any single path segment including the literal "review", so this
  // has to come first or every "Run review" click 500s with "Failed to fetch
  // location" (the generic route trying, and failing, to look up a location
  // whose id is literally the string "review").
  app.get(
    "/neighborhood-admin/neighborhoods/:id/locations/review",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const [boundaryResult, isSuperAdmin] = await Promise.all([
          getNeighborhoodBoundary(req.params.id, getNeighborhoodRepository()),
          getSuperAdminRepository().isSuperAdmin(req.appUser!.id),
        ]);
        if (boundaryResult.status === "not_found" || !boundaryResult.boundary.boundaryGeojson) {
          res.status(400).json({ error: "Neighborhood has no boundary set" });
          return;
        }

        const cooldown = getLocationsReviewCooldownStatus(
          boundaryResult.boundary.locationsReviewedAt,
          new Date(),
          isSuperAdmin
        );
        if (!cooldown.canRun) {
          res.status(429).json({
            error: "Locations were reimported recently -- try again later",
            next_allowed_at: cooldown.nextAllowedAt,
          });
          return;
        }

        const report = await reviewNeighborhoodLocations(
          req.params.id,
          boundaryResult.boundary.boundaryGeojson,
          getCachedPlacesClient(),
          getPlacesRepository(),
          getLocationRepository()
        );

        const reviewedAt = new Date().toISOString();
        await getNeighborhoodRepository().markLocationsReviewed(req.params.id, reviewedAt);
        const newCooldown = getLocationsReviewCooldownStatus(reviewedAt);

        res.json({
          tiles_queried: report.tilesQueried,
          api_calls_made: report.apiCallsMade,
          calls_at_result_cap: report.callsAtResultCap,
          new_candidates: report.newCandidates.map((c) => ({
            google_place_id: c.googlePlaceId,
            name: c.name,
            lat: c.lat,
            lng: c.lng,
            address: c.address,
            suggested_category_id: c.suggestedCategoryId,
            suggested_category_name: c.suggestedCategoryName,
          })),
          proposed_removals: report.proposedRemovals.map((r) => ({
            id: r.id,
            name: r.name,
            address: r.address,
          })),
          last_reviewed_at: newCooldown.lastReviewedAt,
          next_allowed_at: newCooldown.nextAllowedAt,
        });
      } catch (err) {
        console.error(
          `GET /neighborhood-admin/neighborhoods/${req.params.id}/locations/review failed:`,
          err
        );
        res.status(500).json({ error: "Failed to review locations" });
      }
    }
  );

  const LOCATION_CLASSIFICATIONS: LocationClassification[] = ["business", "poi", "omit"];

  app.post(
    "/neighborhood-admin/neighborhoods/:id/locations/review/commit",
    neighborhoodAdminGate,
    async (req, res) => {
      const { classifications, removals } = req.body ?? {};
      if (!Array.isArray(classifications)) {
        res.status(400).json({ error: "classifications must be an array" });
        return;
      }
      if (!Array.isArray(removals)) {
        res.status(400).json({ error: "removals must be an array" });
        return;
      }
      for (const item of removals) {
        if (typeof item !== "object" || item === null || typeof item.id !== "string" || !item.id) {
          res.status(400).json({ error: "each removal requires an id" });
          return;
        }
      }
      for (const item of classifications) {
        if (
          typeof item !== "object" ||
          item === null ||
          typeof item.google_place_id !== "string" ||
          !item.google_place_id ||
          typeof item.name !== "string" ||
          !item.name ||
          typeof item.lat !== "number" ||
          typeof item.lng !== "number" ||
          typeof item.address !== "string" ||
          !LOCATION_CLASSIFICATIONS.includes(item.classification)
        ) {
          res.status(400).json({
            error:
              "each classification requires google_place_id, name, lat, lng, address, and a valid classification",
          });
          return;
        }
        if (item.classification === "business" && typeof item.category_id !== "string") {
          res.status(400).json({ error: "category_id is required to classify as a business" });
          return;
        }
        if (item.classification === "poi" && typeof item.type !== "string") {
          res.status(400).json({ error: "type is required to classify as a point of interest" });
          return;
        }
      }

      try {
        const result = await commitLocationReview(
          req.params.id,
          classifications.map((item) => ({
            googlePlaceId: item.google_place_id,
            name: item.name,
            lat: item.lat,
            lng: item.lng,
            address: item.address,
            classification: item.classification,
            categoryId: item.category_id,
            type: item.type,
          })),
          removals.map((item) => ({ id: item.id })),
          getPlacesRepository(),
          getLocationRepository()
        );

        res.json({
          created_businesses: result.createdBusinesses,
          created_pois: result.createdPois,
          omitted: result.omitted,
          removed: result.removed,
          failed: result.failed,
        });
      } catch (err) {
        console.error(
          `POST /neighborhood-admin/neighborhoods/${req.params.id}/locations/review/commit failed:`,
          err
        );
        res.status(500).json({ error: "Failed to commit location review" });
      }
    }
  );

  app.get(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const result = await getLocationForNeighborhood(req.params.id, req.params.locationId, getLocationRepository());
        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Location not found" });
            return;
          case "found":
            res.json(result.location);
            return;
        }
      } catch (err) {
        console.error(
          `GET /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId} failed:`,
          err
        );
        res.status(500).json({ error: "Failed to fetch location" });
      }
    }
  );

  // Location edit (BACKLOG.md Ref 29, generalized) -- all fields optional,
  // only the provided fields are patched. Used by the manual POI edit form;
  // businesses don't have a manual edit UI today.
  app.patch(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId",
    neighborhoodAdminGate,
    async (req, res) => {
      const { name, description, type, lat, lng, address } = req.body ?? {};
      if (name !== undefined && (typeof name !== "string" || !name)) {
        res.status(400).json({ error: "name must be a non-empty string" });
        return;
      }
      if (description !== undefined && typeof description !== "string") {
        res.status(400).json({ error: "description must be a string" });
        return;
      }
      if (type !== undefined && (typeof type !== "string" || !type)) {
        res.status(400).json({ error: "type must be a non-empty string" });
        return;
      }
      if (lat !== undefined && typeof lat !== "number") {
        res.status(400).json({ error: "lat must be a number" });
        return;
      }
      if (lng !== undefined && typeof lng !== "number") {
        res.status(400).json({ error: "lng must be a number" });
        return;
      }
      if (address !== undefined && typeof address !== "string") {
        res.status(400).json({ error: "address must be a string" });
        return;
      }

      try {
        const result = await updateLocationForNeighborhood(
          req.params.id,
          req.params.locationId,
          { name, description, type, lat, lng, address },
          getLocationRepository()
        );
        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Location not found" });
            return;
          case "updated":
            res.json(result.location);
            return;
        }
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId} failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update location" });
      }
    }
  );

  // Location hide/restore (BACKLOG.md Ref 11/29), applying uniformly to
  // either kind -- merged from the old venue status + POI status routes.
  app.patch(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId/status",
    neighborhoodAdminGate,
    async (req, res) => {
      const { status } = req.body ?? {};
      if (status !== "active" && status !== "hidden") {
        res.status(400).json({ error: "status must be 'active' or 'hidden'" });
        return;
      }

      try {
        const result = await updateLocationStatusForNeighborhood(
          req.params.id,
          req.params.locationId,
          status,
          getLocationRepository()
        );
        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Location not found" });
            return;
          case "updated":
            res.json(result.location);
            return;
        }
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId}/status failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update location status" });
      }
    }
  );

  // Switch an existing location between business and poi kind in place
  // (BACKLOG.md "POIs and venues managed almost the same") -- replaces the
  // old hide-then-recreate-as-a-new-row "Convert to POI" flow. Blocked while
  // the location is claimed; the admin must reject/revoke the claim first
  // (POST .../claims/:claimId/revoke below).
  app.patch(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId/kind",
    neighborhoodAdminGate,
    async (req, res) => {
      const { kind, category_id, type } = req.body ?? {};
      if (kind !== "business" && kind !== "poi") {
        res.status(400).json({ error: "kind must be 'business' or 'poi'" });
        return;
      }

      try {
        const result = await switchLocationKindForNeighborhood(
          req.params.id,
          req.params.locationId,
          kind,
          { categoryId: category_id, type },
          getLocationRepository()
        );
        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Location not found" });
            return;
          case "already_this_kind":
          case "updated":
            res.json(result.location);
            return;
          case "claimed":
            res.status(409).json({
              error: "Reject or revoke this business's claim before switching it to a point of interest",
            });
            return;
          case "missing_type":
            res.status(400).json({ error: "type is required to switch to a point of interest" });
            return;
          case "invalid_category":
            res.status(400).json({ error: "category_id must reference a valid leaf category" });
            return;
        }
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId}/kind failed:`,
          err
        );
        res.status(500).json({ error: "Failed to switch location kind" });
      }
    }
  );

  // Location delete, POI-kind only (BACKLOG.md Ref 29) -- hard delete,
  // blocked (409) whenever the location has any dependent history, since
  // those rows cascade-delete rather than block the delete at the DB level;
  // hide instead (status endpoint above) when that's the case. A
  // business-kind location can never be deleted here, only hidden.
  app.delete(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const result = await deleteLocationForNeighborhood(req.params.id, req.params.locationId, getLocationRepository());
        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Location not found" });
            return;
          case "business_kind":
            res.status(409).json({ error: "A business can't be deleted — hide it instead" });
            return;
          case "has_dependent_activity":
            res.status(409).json({
              error: "This point of interest has check-in or points history — hide it instead of deleting",
            });
            return;
          case "deleted":
            res.status(204).end();
            return;
        }
      } catch (err) {
        console.error(
          `DELETE /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId} failed:`,
          err
        );
        res.status(500).json({ error: "Failed to delete location" });
      }
    }
  );

  // Business claim review, neighborhood-scoped (docs/url-map.md refactor --
  // was the global GET/POST /admin/claims* family, gated only by adminGate
  // with no per-neighborhood filter).
  app.get("/neighborhood-admin/neighborhoods/:id/claims", neighborhoodAdminGate, async (req, res) => {
    const status = req.query.status;
    if (status !== undefined && !CLAIM_STATUSES.includes(status as BusinessClaimStatus)) {
      res.status(400).json({ error: `status must be one of ${CLAIM_STATUSES.join(", ")}` });
      return;
    }

    try {
      const claims = await listClaimsForNeighborhood(
        req.params.id,
        getClaimRepository(),
        status as BusinessClaimStatus | undefined
      );
      res.json(claims);
    } catch (err) {
      console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/claims failed:`, err);
      res.status(500).json({ error: "Failed to list claims" });
    }
  });

  const neighborhoodClaimReviewHandler =
    (decision: "approve" | "reject") => async (req: express.Request, res: express.Response) => {
      const { reviewed_note } = req.body ?? {};
      if (reviewed_note !== undefined && typeof reviewed_note !== "string") {
        res.status(400).json({ error: "reviewed_note must be a string" });
        return;
      }

      try {
        const result = await reviewClaimForNeighborhood(
          req.params.id,
          req.params.claimId,
          decision,
          reviewed_note ?? null,
          getClaimRepository()
        );

        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Claim not found" });
            return;
          case "already_reviewed":
            res.status(409).json({ error: "Claim has already been reviewed" });
            return;
          case "updated":
            res.json(result.claim);
            return;
        }
      } catch (err) {
        console.error(
          `POST /neighborhood-admin/neighborhoods/${req.params.id}/claims/${req.params.claimId}/${decision} failed:`,
          err
        );
        res.status(500).json({ error: `Failed to ${decision} claim` });
      }
    };

  app.post(
    "/neighborhood-admin/neighborhoods/:id/claims/:claimId/approve",
    neighborhoodAdminGate,
    neighborhoodClaimReviewHandler("approve")
  );
  app.post(
    "/neighborhood-admin/neighborhoods/:id/claims/:claimId/reject",
    neighborhoodAdminGate,
    neighborhoodClaimReviewHandler("reject")
  );

  // Revoke an already-approved claim (BACKLOG.md "POIs and venues managed
  // almost the same") -- reviewClaim only handles pending claims, so this is
  // the admin's only path to clear an approved claim, e.g. before switching
  // that business to POI kind (blocked while claimed).
  app.post(
    "/neighborhood-admin/neighborhoods/:id/claims/:claimId/revoke",
    neighborhoodAdminGate,
    async (req, res) => {
      const { reason } = req.body ?? {};
      if (reason !== undefined && typeof reason !== "string") {
        res.status(400).json({ error: "reason must be a string" });
        return;
      }

      try {
        const result = await revokeApprovedClaimForNeighborhood(
          req.params.id,
          req.params.claimId,
          reason ?? null,
          getClaimRepository()
        );

        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Claim not found" });
            return;
          case "not_approved":
            res.status(409).json({ error: "Only an approved claim can be revoked" });
            return;
          case "revoked":
            res.json(result.claim);
            return;
        }
      } catch (err) {
        console.error(
          `POST /neighborhood-admin/neighborhoods/${req.params.id}/claims/${req.params.claimId}/revoke failed:`,
          err
        );
        res.status(500).json({ error: "Failed to revoke claim" });
      }
    }
  );

  // Location category reassignment, neighborhood-scoped (docs/url-map.md
  // refactor -- was the global GET /admin/venues + PATCH
  // /admin/venues/:id/category family). Business-kind only in practice (the
  // admin UI never shows this dropdown for a POI row).
  app.patch(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId/category",
    neighborhoodAdminGate,
    async (req, res) => {
      const { category_id } = req.body ?? {};
      if (typeof category_id !== "string" || !category_id) {
        res.status(400).json({ error: "category_id is required" });
        return;
      }

      try {
        const result = await reassignLocationCategoryForNeighborhood(
          req.params.id,
          req.params.locationId,
          category_id,
          getLocationRepository()
        );

        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Location not found" });
            return;
          case "invalid_category":
            res.status(400).json({ error: "category_id must reference an existing leaf category" });
            return;
          case "updated":
            res.json(result.location);
            return;
        }
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId}/category failed:`,
          err
        );
        res.status(500).json({ error: "Failed to reassign category" });
      }
    }
  );

  return app;
}
