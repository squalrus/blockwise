import express from "express";
import type {
  AccountType,
  AvatarStyle,
  Badge,
  BusinessClaimContactMethod,
  BusinessClaimStatus,
  CheckinRewardsSummary,
  EventStatus,
  HealthCheckResponse,
  MushroomCustomization,
  NeighborhoodDashboardSummary,
  NeighborhoodProfile,
  NeighborhoodSummary,
  NotificationPreferences,
  OnboardingChecklist,
  ProfileTopCap,
  ProfileVisibility,
  ReportClientErrorRequest,
  SocialLinks,
  SocialPlatform,
  VenueDashboardSummary,
} from "@blockwise/types";
import {
  MUSHROOM_CAPS,
  MUSHROOM_STALKS,
  MUSHROOM_SPOT_SHAPES,
  MUSHROOM_SHAPES,
  resolveMushroomConfig,
} from "@blockwise/types";
import { requireAdmin } from "./admin/requireAdmin";
import { requireNeighborhoodAdmin } from "./admin/requireNeighborhoodAdmin";
import { requireSuperAdmin } from "./admin/requireSuperAdmin";
import { SupabaseNeighborhoodAdminRepository, SupabaseSuperAdminRepository } from "./admin/supabaseRepository";
import { listActivityForUsers, listMyActivity, listRecentActivity, listVenueActivity } from "./activity/activity";
import { SupabaseActivityRepository } from "./activity/supabaseRepository";
import { completeLogin, completeSignup, promoteToBusiness, toAppUser, updateProfile } from "./auth/auth";
import { attachOptionalAuthUser, requireAuthUser, requireBusinessAccount } from "./auth/requireAuthUser";
import { UsernameTakenError } from "./auth/repository";
import { SupabaseAuthRepository } from "./auth/supabaseRepository";
import { verifyAccessToken } from "./auth/verifyToken";
import { RECENT_VISITOR_WINDOW_MS, TOP_VISITORS_LIMIT, performCheckin, toMushroomConfig } from "./checkins/checkin";
import { SupabaseCheckinRepository } from "./checkins/supabaseRepository";
import {
  claimCoupon,
  createCoupon,
  listActiveCouponsForVenues,
  listCouponsForVenue,
  listVenueCouponsForViewer,
  redeemCouponClaim,
} from "./coupons/coupons";
import { SupabaseCouponRepository } from "./coupons/supabaseRepository";
import {
  getVenueIcalFeed,
  getVenueSocialLinks,
  listClaimsForNeighborhood,
  reviewClaim,
  reviewClaimForNeighborhood,
  revokeApprovedClaimForNeighborhood,
  submitClaim,
  updateVenueIcalFeedUrl,
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
  deleteEventForNeighborhood,
  deleteEventForVenue,
  listActiveEventsForVenues,
  listEventsForNeighborhood,
  listEventsForVenue,
  listUpcomingEventsForNeighborhood,
  setEventStatusForNeighborhood,
  setEventStatusForVenue,
} from "./events/events";
import { syncNeighborhoodIcalFeed, syncVenueIcalFeed } from "./events/icalSync";
import { SupabaseEventRepository } from "./events/supabaseRepository";
import { followEvent, getEventFollowStatus, unfollowEvent } from "./eventFollows/eventFollow";
import { SupabaseEventFollowRepository } from "./eventFollows/supabaseRepository";
import {
  listFeedbackForAdmin,
  listMissingVenueFeedbackForNeighborhood,
  submitFeedback,
  updateFeedbackState,
} from "./feedback/feedback";
import { SupabaseFeedbackRepository } from "./feedback/supabaseRepository";
import { addFavorite, getFavoriteStatus, removeFavorite } from "./favorites/favorite";
import { SupabaseFavoriteRepository } from "./favorites/supabaseRepository";
import {
  createBadgeForAdmin,
  listBadgesForAdmin,
  listBadgesForNeighborhoodAdmin,
  updateBadgeForAdmin,
  updateBadgeForNeighborhoodAdmin,
} from "./gamification/badgeAdmin";
import {
  createChallengeForAdmin,
  createChallengeWithBadgeForNeighborhoodAdmin,
  listChallengesForAdmin,
  listChallengesForNeighborhoodAdmin,
  updateChallengeForAdmin,
  updateChallengeForNeighborhoodAdmin,
} from "./gamification/challengeAdmin";
import {
  getUserActiveChallenges,
  getUserChallengesSummary,
  getUserCompletedChallenges,
  listChallengesWithProgress,
} from "./gamification/challenges";
import { evaluateBadgesForCollectionCount } from "./gamification/badges";
import { awardEventFollowBadge } from "./gamification/eventFollowBadge";
import { awardContributorBadge, awardFeedbackGiverBadge } from "./gamification/feedbackBadges";
import { awardFounderBadge } from "./gamification/founderBadge";
import { awardFavoritePoints, getLeaderboard, getUserBadges, getUserPoints } from "./gamification/points";
import { awardCheckinRewards, awardNeighborConnectionRewards } from "./gamification/rewards";
import { awardSqualrusConnectionBadge, SQUALRUS_BADGE_CODE } from "./gamification/squalrusBadge";
import { SupabaseGamificationRepository } from "./gamification/supabaseRepository";
import {
  activateNeighborhood,
  createNeighborhood,
  getNeighborhoodBoundary,
  getNeighborhoodById,
  getNeighborhoodBySlug,
  updateNeighborhoodBoundary,
  updateNeighborhoodDescription,
  updateNeighborhoodIcalFeedUrl,
  updateNeighborhoodIcalSyncSettings,
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
import {
  LiveGeoapifyClient,
  type GeoapifyPlaceDetailsClient,
  type GeoapifyPlacesClient,
  type GeoapifyTextSearchClient,
} from "./places/geoapifyClient";
import { haversineMeters, isValidPolygon } from "./places/geo";
import { InstrumentedPlacesClient } from "./places/instrumentedClient";
import { investigateMissingLocation } from "./places/investigate";
import { MockGeoapifyClient } from "./places/mockGeoapifyClient";
import { previewNeighborhoodBoundary } from "./places/preview";
import { PlacesApiQuotaGuard, QuotaGuardedPlacesClient } from "./places/quotaGuard";
import { SupabasePlacesRepository } from "./places/supabaseRepository";
import { getHappeningNow } from "./locations/happeningNow";
import {
  createLocation,
  deleteLocationForNeighborhood,
  getLocationDetailWithFreshEnrichment,
  getLocationForNeighborhood,
  getVenueLeaderboard,
  listAssignableCategories,
  listLocationListItemsForNeighborhood,
  listLocationsForNeighborhood,
  reassignLocationCategoryForNeighborhood,
  reassignLocationIdentityForNeighborhood,
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
import { getMushroomCollectionForUser, revealMushroomCollectionEntry } from "./mushroomCollection/collection";
import { SupabaseMushroomCollectionRepository } from "./mushroomCollection/supabaseRepository";
import { installErrorLogging } from "./monitoring/errorLogging";
import { requestLoggingMiddleware } from "./monitoring/requestLogging";
import { SupabaseMonitoringRepository } from "./monitoring/supabaseRepository";
import {
  notifyConnectionsOfCheckin,
  notifyFavoritersOfNewCoupon,
  notifyNeighborhoodAdminsOfMissingVenue,
  notifySuperAdminsOfFeedback,
  notifySuperAdminsOfSignup,
  notifyUserOfConnectionAccepted,
  notifyUserOfConnectionRequest,
  sendPushToUsers,
  subscribeToPush,
  unsubscribeFromPush,
} from "./pushSubscriptions/pushSubscriptions";
import { SupabasePushSubscriptionRepository } from "./pushSubscriptions/supabaseRepository";
import { WebPushSender } from "./pushSubscriptions/webPushSender";
import { getSupabaseClient } from "./supabase";
import { listUsersForAdmin } from "./users/users";
import { SupabaseUserRepository } from "./users/supabaseRepository";

const CONTACT_METHODS: BusinessClaimContactMethod[] = ["phone", "email"];
const EVENT_STATUSES: EventStatus[] = ["active", "hidden", "pending"];
const CLAIM_STATUSES: BusinessClaimStatus[] = ["pending", "approved", "rejected"];
const ACCOUNT_TYPES: AccountType[] = ["consumer", "business"];
const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "twitter", "tiktok", "facebook", "website"];
const PROFILE_VISIBILITIES: ProfileVisibility[] = ["public", "private"];
// BACKLOG.md Ref 102 follow-up: the valid keys of NotificationPreferences,
// used to validate PATCH /me/profile's notification_preferences patch.
const NOTIFICATION_PREFERENCE_KEYS: (keyof NotificationPreferences)[] = [
  "checkins",
  "connection_requests",
  "connection_accepted",
  "event_reminders",
  "new_coupons",
];
// BACKLOG.md Ref 94 "Mushroom size reflects recent check-in activity" -- how
// many distinct recent visitors a neighborhood profile's mosaic surfaces at
// once, mirroring locations/supabaseRepository.ts's venue-scoped
// RECENT_CHECKIN_SNAPSHOT_DISTINCT_LIMIT. Matches MushroomField's own
// MAX_MUSHROOMS ceiling, since repeat visits are expressed via size rather
// than consuming extra mosaic slots.
const RECENT_CHECKIN_MOSAIC_LIMIT = 40;
const AVATAR_STYLES: AvatarStyle[] = ["social", "mushroom"];
// BACKLOG.md Ref 75 "Mushroom avatar customizer" -- customizer offers 0
// (bare cap) unlike mushroomConfigForUser's auto-assignment, which excludes
// it (MUSHROOM_CAPS/MUSHROOM_STALKS/MUSHROOM_SPOT_SHAPES imported from
// @blockwise/types above, the single source of truth for the approved
// palette).
const MUSHROOM_MIN_SPOT_COUNT = 0;
const MUSHROOM_MAX_SPOT_COUNT = 6;

// null clears a saved customization back to the hash-derived default -- only
// that or a fully-approved { shape, cap, stalk, spots, bg, spotCount,
// spotShape } combination is accepted. Stalk, spots, and bg are independent
// choices (not one mirroring another), but share the same approved palette.
// spotCount and spotShape are likewise independent choices (any count 0-6
// pairs with any shape), not a fused named pattern. shape (Spored Shape
// Study) is its own independent axis alongside all of the above.
function isValidMushroomCustomization(value: unknown): value is MushroomCustomization | null {
  if (value === null) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;

  const { shape, cap, stalk, spots, bg, spotCount, spotShape } = value as Record<string, unknown>;
  if (typeof shape !== "string" || !(MUSHROOM_SHAPES as string[]).includes(shape)) return false;
  if (typeof cap !== "string" || !MUSHROOM_CAPS.includes(cap)) return false;
  if (typeof stalk !== "string" || !MUSHROOM_STALKS.includes(stalk)) return false;
  if (typeof spots !== "string" || !MUSHROOM_STALKS.includes(spots)) return false;
  if (typeof bg !== "string" || !MUSHROOM_STALKS.includes(bg)) return false;
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

// Mirrors the LiveGeoapifyClient/MockGeoapifyClient choice in
// scripts/backfillOsmIdentity.ts: falls back to mock Place Details when no
// API key is configured, e.g. local dev. Both classes implement GeoapifyPlacesClient
// (searchPlaces) as well as GeoapifyPlaceDetailsClient and
// GeoapifyTextSearchClient, so the same cached instance also backs the
// boundary preview route's search calls and investigate.ts's text lookup.
//
// getPlaceDetails additionally goes through QuotaGuardedPlacesClient (only
// when live -- MockGeoapifyClient never costs anything, so guarding it
// would just make local dev flaky). It sits outside InstrumentedPlacesClient
// so a guardrail trip never reaches Geoapify and never gets logged as an
// attempted call. searchPlaces/searchText are left ungated: both are
// admin-triggered actions (sync, boundary preview, investigate), not
// something that fires on every visitor page view the way enrichment
// refresh does.
function getPlacesClient(): GeoapifyPlacesClient & GeoapifyPlaceDetailsClient & GeoapifyTextSearchClient {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  // Only the real client is instrumented (BACKLOG.md Ref 104 follow-up) --
  // MockGeoapifyClient calls never hit Geoapify, so logging them would just
  // be local-dev noise on the Monitoring tab.
  if (!apiKey) return new MockGeoapifyClient();

  const live = new InstrumentedPlacesClient(new LiveGeoapifyClient(apiKey), getMonitoringRepository);
  const guarded = new QuotaGuardedPlacesClient(live, getPlacesApiQuotaGuard());
  return {
    searchPlaces: (params) => live.searchPlaces(params),
    searchText: (params) => live.searchText(params),
    reverseGeocode: (point) => live.reverseGeocode(point),
    getPlaceDetails: (placeId) => guarded.getPlaceDetails(placeId),
  };
}

let placesApiQuotaGuard: PlacesApiQuotaGuard | undefined;
function getPlacesApiQuotaGuard(): PlacesApiQuotaGuard {
  placesApiQuotaGuard ??= new PlacesApiQuotaGuard(() => getMonitoringRepository().getDayToDateCallCounts());
  return placesApiQuotaGuard;
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

let placesClient: (GeoapifyPlacesClient & GeoapifyPlaceDetailsClient & GeoapifyTextSearchClient) | undefined;
function getCachedPlacesClient(): GeoapifyPlacesClient & GeoapifyPlaceDetailsClient & GeoapifyTextSearchClient {
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

let mushroomCollectionRepository: SupabaseMushroomCollectionRepository | undefined;
function getMushroomCollectionRepository(): SupabaseMushroomCollectionRepository {
  mushroomCollectionRepository ??= new SupabaseMushroomCollectionRepository(getSupabaseClient());
  return mushroomCollectionRepository;
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
      // BACKLOG.md Ref 98: forager collection -- each side collects the
      // other's mushroom "species" the first time they connect, then checks
      // collection_milestone badges only when this call actually grew the
      // collection (a reconnect can't). Not surfaced in the accept
      // response, mirroring awardNeighborConnectionRewards's own
      // neighbor_count_reached badges above, which aren't either.
      const isNewSpecies = await getMushroomCollectionRepository().recordConnectionCollection(userId, otherUserId);
      if (isNewSpecies) {
        const collectionCount = await getMushroomCollectionRepository().countCollectionForUser(userId);
        await evaluateBadgesForCollectionCount(userId, collectionCount, getGamificationRepository());
      }
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

let couponRepository: SupabaseCouponRepository | undefined;
function getCouponRepository(): SupabaseCouponRepository {
  couponRepository ??= new SupabaseCouponRepository(getSupabaseClient());
  return couponRepository;
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

let eventFollowRepository: SupabaseEventFollowRepository | undefined;
function getEventFollowRepository(): SupabaseEventFollowRepository {
  eventFollowRepository ??= new SupabaseEventFollowRepository(getSupabaseClient());
  return eventFollowRepository;
}

let feedbackRepository: SupabaseFeedbackRepository | undefined;
function getFeedbackRepository(): SupabaseFeedbackRepository {
  feedbackRepository ??= new SupabaseFeedbackRepository(getSupabaseClient());
  return feedbackRepository;
}

let pushSubscriptionRepository: SupabasePushSubscriptionRepository | undefined;
function getPushSubscriptionRepository(): SupabasePushSubscriptionRepository {
  pushSubscriptionRepository ??= new SupabasePushSubscriptionRepository(getSupabaseClient());
  return pushSubscriptionRepository;
}

// Constructed lazily on first send, not at createApp() time -- the
// WebPushSender constructor throws if VAPID_* isn't configured, and building
// it eagerly would crash every route including /health the moment the
// function cold-starts with a misconfigured environment (mirrors
// getCachedPlacesClient() above).
let webPushSender: WebPushSender | undefined;
function getWebPushSender(): WebPushSender {
  webPushSender ??= new WebPushSender();
  return webPushSender;
}

let userRepository: SupabaseUserRepository | undefined;
function getUserRepository(): SupabaseUserRepository {
  userRepository ??= new SupabaseUserRepository(getSupabaseClient());
  return userRepository;
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

let monitoringRepository: SupabaseMonitoringRepository | undefined;
function getMonitoringRepository(): SupabaseMonitoringRepository {
  monitoringRepository ??= new SupabaseMonitoringRepository(getSupabaseClient());
  return monitoringRepository;
}

export function createApp() {
  const app = express();

  // BACKLOG.md Ref 104: wraps console.error (every existing "<label>
  // failed:", err call site already follows that convention) so API errors
  // land in error_log without touching each of ~120 call sites, plus catches
  // whatever a route's own try/catch doesn't. Installed once per process,
  // not per request.
  installErrorLogging(getMonitoringRepository);

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

  // BACKLOG.md Ref 104: backs the Monitoring tab's request-volume/latency
  // charts, one row per request -- mounted after the path-prefix stripping
  // above so req.path already matches what every route handler sees.
  app.use(requestLoggingMiddleware(getMonitoringRepository));

  app.use(express.json());

  app.get("/health", (_req, res) => {
    const body: HealthCheckResponse = {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  });

  // Web app's error boundaries and window.onerror/unhandledrejection
  // listener report through here (BACKLOG.md Ref 104), as does the marketing
  // site's equivalent reporter (proxied same-origin via apps/marketing's own
  // /api/* rewrite -- see its netlify.toml/next.config.ts -- so this never
  // needs CORS) -- public, no auth, since a client error can happen before a
  // visitor is signed in at all. `source` distinguishes the two; omitted
  // (older/unpatched callers) defaults to "web".
  app.post("/monitoring/client-errors", async (req, res) => {
    const { message, stack, context, source } = (req.body ?? {}) as Partial<ReportClientErrorRequest>;
    if (typeof message !== "string" || message.length === 0) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    try {
      await getMonitoringRepository().logError({
        source: source === "marketing" ? "marketing" : "web",
        message,
        stack: typeof stack === "string" ? stack : null,
        context: context && typeof context === "object" ? context : null,
      });
      res.status(204).end();
    } catch (err) {
      console.error("POST /monitoring/client-errors failed:", err);
      res.status(500).json({ error: "Failed to log client error" });
    }
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

  // Business owner venue dashboard (BACKLOG.md): read-only, public listing of
  // a venue's own coupons/events, shown on the venue detail page. Authoring
  // is gated (see POST /business/venues/:id/coupons|events below) -- these
  // two routes are read-only for any visitor. Auth is optional (mirrors GET
  // /neighborhoods) so a signed-in visitor's own claim/eligibility state
  // (BACKLOG.md Ref 83) comes back with each coupon; a signed-out visitor
  // just sees the plain listing with every claim null.
  app.get(
    "/venues/:id/coupons",
    attachOptionalAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const coupons = await listVenueCouponsForViewer(req.params.id, req.appUser?.id ?? null, {
          coupon: getCouponRepository(),
          checkin: getCheckinRepository(),
        });
        res.json(coupons);
      } catch (err) {
        console.error(`GET /venues/${req.params.id}/coupons failed:`, err);
        res.status(500).json({ error: "Failed to list coupons" });
      }
    }
  );

  app.post("/coupons/:id/claim", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const result = await claimCoupon(req.params.id, req.appUser!.id, {
        coupon: getCouponRepository(),
        checkin: getCheckinRepository(),
      });
      switch (result.status) {
        case "not_found":
          res.status(404).json({ error: "Coupon not found" });
          return;
        case "not_active":
          res.status(400).json({ error: "This coupon isn't currently active" });
          return;
        case "not_checked_in":
          res.status(403).json({ error: "Check in at this venue to unlock this coupon" });
          return;
        case "unavailable":
          res.status(409).json({ error: "This coupon is sold out" });
          return;
        case "claimed":
          res.status(201).json(result.claim);
          return;
        case "already_claimed":
          res.status(200).json(result.claim);
          return;
      }
    } catch (err) {
      console.error(`POST /coupons/${req.params.id}/claim failed:`, err);
      res.status(500).json({ error: "Failed to claim coupon" });
    }
  });

  // Slide-to-redeem (BACKLOG.md Ref 83/20): the in-person, staff-witnessed
  // counterpart to claiming. Also writes a checkin for the claim's venue
  // when the target-venue cooldown has elapsed since the viewer's last one
  // (Ref 3) -- see redeemCouponClaim's comment.
  app.post(
    "/coupons/claims/:claimId/redeem",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const result = await redeemCouponClaim(req.params.claimId, req.appUser!.id, {
          coupon: getCouponRepository(),
          checkin: getCheckinRepository(),
        });
        if (result.status === "not_found") {
          res.status(404).json({ error: "Claim not found" });
          return;
        }
        res.json(result.claim);
      } catch (err) {
        console.error(`POST /coupons/claims/${req.params.claimId}/redeem failed:`, err);
        res.status(500).json({ error: "Failed to redeem coupon" });
      }
    }
  );

  app.get("/venues/:id/events", async (req, res) => {
    try {
      const events = await listEventsForVenue(req.params.id, getEventRepository());
      res.json(events);
    } catch (err) {
      console.error(`GET /venues/${req.params.id}/events failed:`, err);
      res.status(500).json({ error: "Failed to list events" });
    }
  });

  // Location detail page's Spore Feed tab (BACKLOG.md Ref 101 redesign) --
  // this venue's own check-ins, newest first (unlike the neighborhood-wide
  // Spore feed, a single venue's feed is check-ins only).
  app.get("/venues/:id/activity", async (req, res) => {
    try {
      const activity = await listVenueActivity(req.params.id, getActivityRepository());
      res.json(activity);
    } catch (err) {
      console.error(`GET /venues/${req.params.id}/activity failed:`, err);
      res.status(500).json({ error: "Failed to load activity" });
    }
  });

  // Location detail page's Leaderboard tab (BACKLOG.md Ref 101 redesign) --
  // the same visitCount ranking as VenueDetail.top_visitors (the mosaic's
  // 3-badge podium), at a higher limit.
  app.get("/venues/:id/leaderboard", async (req, res) => {
    try {
      const leaderboard = await getVenueLeaderboard(req.params.id, getLocationRepository());
      res.json(leaderboard);
    } catch (err) {
      console.error(`GET /venues/${req.params.id}/leaderboard failed:`, err);
      res.status(500).json({ error: "Failed to load leaderboard" });
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

      const [pois, venueCount, poiCount, memberCount, checkinCount, visitorMosaic, topVenues] = await Promise.all([
        listLocationsForNeighborhood(neighborhood.id, getLocationRepository(), "poi"),
        getLocationRepository().countActiveLocationsForNeighborhood(neighborhood.id, "business"),
        getLocationRepository().countActiveLocationsForNeighborhood(neighborhood.id, "poi"),
        getNeighborhoodMemberRepository().countMembersForNeighborhood(neighborhood.id),
        getCheckinRepository().countCheckinsForNeighborhood(neighborhood.id),
        getCheckinRepository().listRecentVisitorMushroomsForNeighborhood(neighborhood.id, RECENT_CHECKIN_MOSAIC_LIMIT),
        getCheckinRepository().listTopVenuesForNeighborhood(neighborhood.id, TOP_VISITORS_LIMIT),
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
        recent_checkin_mushrooms: visitorMosaic.mushrooms,
        top_visitors: visitorMosaic.topVisitors,
        top_venues: topVenues,
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
  // user's live progress (BACKLOG.md Ref 6) -- browsable while signed out,
  // but progress only shows for a signed-in account (Ref 86: no more
  // anonymous check-in/favorite history to attribute progress to).
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

        const challenges = await listChallengesWithProgress(
          neighborhood.id,
          req.appUser?.id ?? null,
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

  // Neighborhood-wide Spore feed tab (BACKLOG.md Ref 27's expanded
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

  // Today tab (BACKLOG.md Ref 27, renamed from "Happening now"): events
  // happening today plus businesses/POIs whose cached hours say they're
  // currently open. Route path kept as-is (happening-now) -- only the UI
  // label and the events filter (today vs. this-exact-instant) changed.
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

        // BACKLOG.md Ref 101: forager collection -- collects this
        // neighborhood's own mushroom "species" each time it's freshly
        // joined (a repeat POST while already a member is "already_joined",
        // not "created", so it doesn't double-count), then checks
        // collection_milestone badges only when this call actually grew the
        // collection. Not surfaced in the join response, mirroring
        // awardNeighborConnectionRewards's own collection recording, which
        // isn't either.
        if (result.status === "created") {
          try {
            const userId = req.appUser!.id;
            const isNewSpecies = await getMushroomCollectionRepository().recordNeighborhoodCollection(
              userId,
              req.params.id
            );
            if (isNewSpecies) {
              const collectionCount = await getMushroomCollectionRepository().countCollectionForUser(userId);
              await evaluateBadgesForCollectionCount(userId, collectionCount, getGamificationRepository());
            }
          } catch (err) {
            console.error(`recordNeighborhoodCollection (neighborhood ${req.params.id}) failed:`, err);
          }
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
  app.post("/locations/:id/checkins", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    const { lat, lng } = req.body ?? {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      res.status(400).json({ error: "lat and lng are required" });
      return;
    }

    // Per-phase timing for the Monitoring > Performance "Check-in timing"
    // chart (checkin_timing_log) -- fire-and-forget like every other
    // monitoring write (requestLoggingMiddleware, InstrumentedPlacesClient),
    // so a dropped sample never costs the check-in itself anything.
    const requestStartedAt = Date.now();
    function logCheckinTiming(
      outcome: "created" | "too_far" | "cooldown" | "not_found",
      phases: { geofenceMs: number; rewardsMs?: number; notifyMs?: number; collectionMs?: number }
    ) {
      getMonitoringRepository()
        .logCheckinTiming({ outcome, totalMs: Date.now() - requestStartedAt, ...phases })
        .catch(() => {
          // Best-effort only, mirrors installErrorLogging/requestLoggingMiddleware.
        });
    }

    try {
      const geofenceStartedAt = Date.now();
      const result = await performCheckin(
        req.params.id,
        req.appUser!.id,
        { lat, lng },
        getCheckinRepository()
      );
      const geofenceMs = Date.now() - geofenceStartedAt;

      switch (result.status) {
        case "not_found":
          logCheckinTiming("not_found", { geofenceMs });
          res.status(404).json({ error: "Location not found" });
          return;
        case "too_far":
          logCheckinTiming("too_far", { geofenceMs });
          res
            .status(400)
            .json({ error: "Too far from location to check in", distance_meters: result.distanceMeters });
          return;
        case "cooldown":
          logCheckinTiming("cooldown", { geofenceMs });
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
          const rewardsStartedAt = Date.now();
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
          const rewardsMs = Date.now() - rewardsStartedAt;

          // BACKLOG.md Ref 91: notify the checking-in user's accepted
          // connections. Awaited (not fired-and-forgotten) for the same
          // Netlify/Lambda reason as awardCheckinRewards above -- the
          // container can freeze as soon as res.json() completes -- but a
          // failure here is swallowed the same way, since the check-in
          // already succeeded.
          const notifyStartedAt = Date.now();
          try {
            const venue = await getLocationRepository().getLocationById(req.params.id);
            if (venue) {
              await notifyConnectionsOfCheckin(
                result.checkin.user_id,
                { displayName: req.appUser!.displayName, venueName: venue.name, venueId: venue.id },
                getConnectionRepository(),
                getPushSubscriptionRepository(),
                getWebPushSender(),
                getAuthRepository()
              );
            }
          } catch (err) {
            console.error(`notifyConnectionsOfCheckin (location ${req.params.id}) failed:`, err);
          }
          const notifyMs = Date.now() - notifyStartedAt;

          // BACKLOG.md Ref 98: forager collection -- collects this venue's
          // mushroom "species" the first time (bumps quantity on repeats),
          // then checks collection_milestone badges only when this call
          // actually grew the collection (a repeat check-in can't). Merged
          // into rewards.badges_earned like the other checkin-triggered
          // badges above, so a newly-earned forager tier still flashes in
          // CheckinResultCard's "unlocked" popup -- only the Badges tab's
          // *locked* preview hides un-earned forager tiers (BadgesPage.tsx),
          // since previewing all ~28 of them there would be noisy.
          const collectionStartedAt = Date.now();
          try {
            const isNewSpecies = await getMushroomCollectionRepository().recordVenueCollection(
              result.checkin.user_id,
              req.params.id
            );
            if (isNewSpecies) {
              const collectionCount = await getMushroomCollectionRepository().countCollectionForUser(
                result.checkin.user_id
              );
              const collectionBadges = await evaluateBadgesForCollectionCount(
                result.checkin.user_id,
                collectionCount,
                getGamificationRepository()
              );
              rewards = { ...rewards, badges_earned: [...rewards.badges_earned, ...collectionBadges] };
            }
          } catch (err) {
            console.error(`recordVenueCollection (location ${req.params.id}) failed:`, err);
          }
          const collectionMs = Date.now() - collectionStartedAt;

          logCheckinTiming("created", { geofenceMs, rewardsMs, notifyMs, collectionMs });
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
  // signed-in user.
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

  // Favorite venues (BACKLOG.md): a signed-in-only "I like this place"
  // bookmark, toggled independently of check-ins/claims.
  app.get("/venues/:id/favorites", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const result = await getFavoriteStatus(req.params.id, req.appUser!.id, getFavoriteRepository());
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

  app.post("/venues/:id/favorites", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const result = await addFavorite(req.params.id, req.appUser!.id, getFavoriteRepository());
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

  app.delete("/venues/:id/favorites", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const result = await removeFavorite(req.params.id, req.appUser!.id, getFavoriteRepository());
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

  // Forager collection (BACKLOG.md Ref 98): every mushroom "species" the
  // signed-in user has collected via check-in or neighbor connection.
  app.get("/me/collection", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const entries = await getMushroomCollectionForUser(req.appUser!.id, getMushroomCollectionRepository());
      res.json(entries);
    } catch (err) {
      console.error("GET /me/collection failed:", err);
      res.status(500).json({ error: "Failed to list mushroom collection" });
    }
  });

  // Flips a single collection entry's face-down "new species" state to
  // revealed (BACKLOG.md Ref 98 follow-up) -- the Collection tab's tap-to-
  // flip card interaction. Idempotent; 404 covers both "no such entry" and
  // "not your entry" the same way, mirroring other ownership-scoped routes.
  app.post(
    "/me/collection/:id/reveal",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const entry = await revealMushroomCollectionEntry(
          req.appUser!.id,
          req.params.id,
          getMushroomCollectionRepository()
        );
        if (!entry) {
          res.status(404).json({ error: "Collection entry not found" });
          return;
        }
        res.json(entry);
      } catch (err) {
        console.error(`POST /me/collection/${req.params.id}/reveal failed:`, err);
        res.status(500).json({ error: "Failed to reveal collection entry" });
      }
    }
  );

  // Spore Feed pin (BACKLOG.md Ref 83): active coupons at every venue the
  // signed-in user favorites (favoriting is the follow relationship, per
  // VenueDashboardSummary's follower_count), mirroring GET /me/events'
  // followed-events listing that powers the "Today" pin.
  app.get("/me/coupons", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const favorites = await getFavoriteRepository().listFavoriteVenuesForUser(req.appUser!.id);
      const coupons = await listActiveCouponsForVenues(
        favorites.map((f) => f.venueId),
        req.appUser!.id,
        { coupon: getCouponRepository(), checkin: getCheckinRepository() }
      );
      res.json(coupons);
    } catch (err) {
      console.error("GET /me/coupons failed:", err);
      res.status(500).json({ error: "Failed to list coupons" });
    }
  });

  // Follow events (BACKLOG.md Ref 81): a signed-in-only bookmark on an
  // event, mirroring the favorite-venues routes above.
  app.get("/events/:id/follow", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const result = await getEventFollowStatus(req.params.id, req.appUser!.id, getEventFollowRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json({ following: result.following });
    } catch (err) {
      console.error(`GET /events/${req.params.id}/follow failed:`, err);
      res.status(500).json({ error: "Failed to load follow status" });
    }
  });

  app.post("/events/:id/follow", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const result = await followEvent(req.params.id, req.appUser!.id, getEventFollowRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (result.status === "created") {
        // BACKLOG.md Ref 81: "Event Scout" badge on a user's first-ever
        // event follow -- awaited before the response is sent, same
        // Netlify/Lambda-freeze reasoning as awardFavoritePoints above.
        try {
          await awardEventFollowBadge(result.follow.user_id, getGamificationRepository());
        } catch (err) {
          console.error(`awardEventFollowBadge (user ${result.follow.user_id}) failed:`, err);
        }
      }
      res.status(result.status === "created" ? 201 : 200).json(result.follow);
    } catch (err) {
      console.error(`POST /events/${req.params.id}/follow failed:`, err);
      res.status(500).json({ error: "Failed to follow event" });
    }
  });

  app.delete("/events/:id/follow", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const result = await unfollowEvent(req.params.id, req.appUser!.id, getEventFollowRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.status(204).end();
    } catch (err) {
      console.error(`DELETE /events/${req.params.id}/follow failed:`, err);
      res.status(500).json({ error: "Failed to unfollow event" });
    }
  });

  // My account page's Events tab (BACKLOG.md Ref 81): event-joined listing
  // of events the signed-in user follows, mirroring GET /me/favorites above.
  app.get("/me/events", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const events = await getEventFollowRepository().listFollowedEventsForUser(req.appUser!.id);
      res.json(
        events.map((e) => ({
          id: e.eventId,
          venue_id: e.venueId,
          neighborhood_id: e.neighborhoodId,
          venue_name: e.venueName,
          title: e.title,
          description: e.description,
          start_time: e.startTime,
          end_time: e.endTime,
          created_at: e.createdEventAt,
          source: e.source,
          location: e.location,
          status: e.status,
          followed_at: e.followedAt,
        }))
      );
    } catch (err) {
      console.error("GET /me/events failed:", err);
      res.status(500).json({ error: "Failed to list followed events" });
    }
  });

  // Spore Feed pin (BACKLOG.md Ref 87): active events at every venue the
  // signed-in user favorites, mirroring GET /me/coupons' composition of
  // FavoriteRepository.listFavoriteVenuesForUser + listActiveCouponsForVenues.
  // Kept separate from GET /me/events (explicit per-event follows) rather
  // than folded in -- the two lists have different id sources (favorite vs.
  // event_follow), and the Spore Feed page de-dupes them itself so a
  // followed event at a favorited venue isn't rendered twice.
  app.get("/me/events-from-favorites", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const favorites = await getFavoriteRepository().listFavoriteVenuesForUser(req.appUser!.id);
      const events = await listActiveEventsForVenues(
        favorites.map((f) => f.venueId),
        getEventRepository()
      );
      res.json(events);
    } catch (err) {
      console.error("GET /me/events-from-favorites failed:", err);
      res.status(500).json({ error: "Failed to list events" });
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

  // "First run" checklist (join a neighborhood, set a username, customize
  // your mushroom, check in somewhere, make a friend) -- every field is
  // derived from data that already exists for its own reason rather than a
  // dedicated onboarding-progress table, mirroring how GET /me/points etc.
  // above are thin reads over existing repositories. getLastCheckinAnywhere
  // and countAcceptedConnectionsForUser are already used for the cooldown
  // check and the account page's Neighbors count respectively; membership
  // reuses the same "any row at all" check joinNeighborhood itself makes
  // (neighborhoodMembers.ts's hadAnyMembership) rather than the heavier
  // neighborhood-joined listMembershipsForUser wrapper.
  app.get("/me/onboarding", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const userId = req.appUser!.id;
      const [memberships, lastCheckin, connectionCount] = await Promise.all([
        getNeighborhoodMemberRepository().listMembershipsForUser(userId),
        getCheckinRepository().getLastCheckinAnywhere(userId),
        getConnectionRepository().countAcceptedConnectionsForUser(userId),
      ]);
      const checklist: OnboardingChecklist = {
        has_neighborhood: memberships.length > 0,
        has_username: req.appUser!.username !== null,
        has_customized_mushroom: req.appUser!.mushroomCustomization !== null,
        has_checkin: lastCheckin !== null,
        has_connection: connectionCount > 0,
      };
      res.json(checklist);
    } catch (err) {
      console.error("GET /me/onboarding failed:", err);
      res.status(500).json({ error: "Failed to load onboarding checklist" });
    }
  });

  // BACKLOG.md Ref 61: every badge that exists (earned or not), so the
  // account page can render "locked" badges alongside GET /me/badges'
  // earned ones. Public/no auth -- the badge catalog isn't per-user data.
  // squalrus_connection is excluded -- it's an easter egg (see
  // gamification/squalrusBadge.ts) that shouldn't be spoiled as a "locked"
  // goal; a user who earns it still sees it via GET /me/badges.
  app.get("/badges", async (_req, res) => {
    try {
      const badges = await getGamificationRepository().getAllBadges();
      const publicBadges: Badge[] = badges
        .filter((b) => b.code !== SQUALRUS_BADGE_CODE)
        .map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          description: b.description,
          icon: b.icon,
          neighborhood_id: b.neighborhoodId,
        }));
      res.json(publicBadges);
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
      const { display_name, avatar_style, mushroom_customization, username, visibility, notification_preferences } =
        req.body ?? {};
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
            "mushroom_customization must be null or an approved { shape, cap, stalk, spots, bg, spotCount, spotShape } combination",
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
      if (notification_preferences !== undefined) {
        if (typeof notification_preferences !== "object" || notification_preferences === null) {
          res.status(400).json({ error: "notification_preferences must be an object" });
          return;
        }
        for (const [key, value] of Object.entries(notification_preferences)) {
          if (!NOTIFICATION_PREFERENCE_KEYS.includes(key as keyof NotificationPreferences)) {
            res.status(400).json({
              error: `notification_preferences keys must be one of ${NOTIFICATION_PREFERENCE_KEYS.join(", ")}`,
            });
            return;
          }
          if (typeof value !== "boolean") {
            res.status(400).json({ error: `notification_preferences.${key} must be a boolean` });
            return;
          }
        }
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
            ...(notification_preferences !== undefined && { notificationPreferences: notification_preferences }),
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
          try {
            const otherUserId =
              result.connection.requesterId === req.appUser!.id
                ? result.connection.recipientId
                : result.connection.requesterId;
            await notifyUserOfConnectionAccepted(
              otherUserId,
              req.appUser!.displayName,
              getPushSubscriptionRepository(),
              getWebPushSender(),
              getAuthRepository()
            );
          } catch (err) {
            console.error("notifyUserOfConnectionAccepted failed:", err);
          }
        } else if (result.status === "created") {
          try {
            await notifyUserOfConnectionRequest(
              result.connection.recipientId,
              req.appUser!.displayName,
              getPushSubscriptionRepository(),
              getWebPushSender(),
              getAuthRepository()
            );
          } catch (err) {
            console.error("notifyUserOfConnectionRequest failed:", err);
          }
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
            },
          }))
        );
      } catch (err) {
        console.error("GET /me/connections failed:", err);
        res.status(500).json({ error: "Failed to list connections" });
      }
    }
  );

  // /account's Spore Feed tab (BACKLOG.md Ref 81): the same activity types
  // as GET /neighborhoods/:id/activity, but scoped to the caller's accepted
  // neighbor connections instead of a whole neighborhood.
  app.get("/me/feed", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const connections = await getConnectionRepository().listConnectionsForUser(req.appUser!.id, "accepted");
      const feed = await listActivityForUsers(
        connections.map((c) => c.user.id),
        getActivityRepository()
      );
      res.json(feed);
    } catch (err) {
      console.error("GET /me/feed failed:", err);
      res.status(500).json({ error: "Failed to load feed" });
    }
  });

  // /account's My Activity tab (BACKLOG.md Ref 81 follow-up, renamed from
  // the old check-ins-only tab): every activity type for the signed-in
  // user's own actions, unmasked (see listMyActivity's doc comment) since
  // it's the account viewing its own data.
  app.get("/me/activity", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    try {
      const activity = await listMyActivity(
        req.appUser!.id,
        req.appUser!.displayName,
        req.appUser!.username,
        getActivityRepository()
      );
      res.json(activity);
    } catch (err) {
      console.error("GET /me/activity failed:", err);
      res.status(500).json({ error: "Failed to load activity" });
    }
  });

  // BETA-prep: signed-in-only bug report/feature request submission, tracked
  // through a triage lifecycle (feedback/repository.ts's FeedbackState) --
  // triaged in the super admin shell's Feedback tab, see GET/PATCH
  // /admin/feedback below. Awards the "Feedback Giver" badge on every call;
  // awardBadgeByCode's unique-violation swallow makes it safe to call
  // unconditionally rather than separately tracking whether this is the
  // user's first submission.
  app.post("/me/feedback", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    const { type, comment, neighborhood_id, venue_name } = req.body ?? {};
    if (typeof type !== "string") {
      res.status(400).json({ error: "type is required" });
      return;
    }
    if (comment !== undefined && typeof comment !== "string") {
      res.status(400).json({ error: "comment must be a string" });
      return;
    }
    if (neighborhood_id !== undefined && typeof neighborhood_id !== "string") {
      res.status(400).json({ error: "neighborhood_id must be a string" });
      return;
    }
    if (venue_name !== undefined && typeof venue_name !== "string") {
      res.status(400).json({ error: "venue_name must be a string" });
      return;
    }

    try {
      const result = await submitFeedback(
        {
          userId: req.appUser!.id,
          type,
          comment: comment ?? "",
          neighborhoodId: neighborhood_id,
          venueName: venue_name,
        },
        getFeedbackRepository()
      );
      if (result.status === "invalid") {
        res.status(400).json({ error: result.message });
        return;
      }

      try {
        await awardFeedbackGiverBadge(req.appUser!.id, getGamificationRepository());
      } catch (err) {
        console.error(`awardFeedbackGiverBadge (user ${req.appUser!.id}) failed:`, err);
      }

      // Routed to the reported neighborhood's own admins for "missing_venue"
      // (BACKLOG.md Ref 80/96), every other type still goes to super admins
      // -- these are mutually exclusive recipients, never both.
      const submissionType = result.submission.type;
      try {
        if (submissionType === "missing_venue") {
          const reportedNeighborhood = await getNeighborhoodById(
            result.submission.neighborhood_id!,
            getNeighborhoodRepository()
          );
          if (reportedNeighborhood) {
            await notifyNeighborhoodAdminsOfMissingVenue(
              { displayName: req.appUser!.displayName, venueName: result.submission.venue_name ?? "a venue" },
              result.submission.neighborhood_id!,
              reportedNeighborhood.slug,
              getNeighborhoodAdminRepository(),
              getPushSubscriptionRepository(),
              getWebPushSender()
            );
          }
        } else {
          await notifySuperAdminsOfFeedback(
            { displayName: req.appUser!.displayName, type: submissionType },
            getSuperAdminRepository(),
            getPushSubscriptionRepository(),
            getWebPushSender()
          );
        }
      } catch (err) {
        console.error("feedback push notification failed:", err);
      }

      res.status(201).json(result.submission);
    } catch (err) {
      console.error("POST /me/feedback failed:", err);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Admin triage list -- surfaced in the super admin shell's Feedback tab.
  // Gated to superAdminGate (moved from adminGate along with the web UI,
  // mirroring /admin/category-taxonomy's move) since feedback isn't scoped
  // to any one neighborhood or business.
  app.get("/admin/feedback", superAdminGate, async (_req, res) => {
    try {
      const submissions = await listFeedbackForAdmin(getFeedbackRepository());
      res.json(submissions);
    } catch (err) {
      console.error("GET /admin/feedback failed:", err);
      res.status(500).json({ error: "Failed to list feedback" });
    }
  });

  // Awards the "Contributor" badge when a submission is marked "done" --
  // the only state transition that awards anything, so it's checked here
  // rather than inside updateFeedbackState itself (mirrors where
  // awardEventFollowBadge is called, at the route layer rather than inside
  // the domain function).
  app.patch("/admin/feedback/:id", superAdminGate, async (req, res) => {
    const { state } = req.body ?? {};
    if (typeof state !== "string") {
      res.status(400).json({ error: "state is required" });
      return;
    }

    try {
      const result = await updateFeedbackState(req.params.id, state, getFeedbackRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Submission not found" });
        return;
      }
      if (result.status === "invalid") {
        res.status(400).json({ error: result.message });
        return;
      }

      if (result.submission.state === "done") {
        try {
          await awardContributorBadge(result.submission.user_id, getGamificationRepository());
        } catch (err) {
          console.error(`awardContributorBadge (user ${result.submission.user_id}) failed:`, err);
        }
      }

      res.json(result.submission);
    } catch (err) {
      console.error(`PATCH /admin/feedback/${req.params.id} failed:`, err);
      res.status(500).json({ error: "Failed to update feedback" });
    }
  });

  // /admin/feedback's sibling for "missing_venue" submissions (BACKLOG.md Ref
  // 80/96) -- neighborhoodAdminGate-scoped (not superAdminGate) since these
  // are only ever triaged by the reported neighborhood's own admins.
  app.get("/neighborhood-admin/neighborhoods/:id/feedback", neighborhoodAdminGate, async (req, res) => {
    try {
      const submissions = await listMissingVenueFeedbackForNeighborhood(req.params.id, getFeedbackRepository());
      res.json(submissions);
    } catch (err) {
      console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/feedback failed:`, err);
      res.status(500).json({ error: "Failed to list feedback" });
    }
  });

  app.patch(
    "/neighborhood-admin/neighborhoods/:id/feedback/:feedbackId",
    neighborhoodAdminGate,
    async (req, res) => {
      const { state } = req.body ?? {};
      if (typeof state !== "string") {
        res.status(400).json({ error: "state is required" });
        return;
      }

      try {
        // Confirms the submission is both a "missing_venue" report AND
        // belongs to *this* neighborhood before allowing the state change --
        // without this, an admin of neighborhood A could PATCH a report that
        // actually belongs to neighborhood B just by guessing its id, since
        // updateFeedbackState below only takes a bare submission id.
        const existing = await getFeedbackRepository().getSubmission(req.params.feedbackId);
        if (!existing || existing.type !== "missing_venue" || existing.neighborhoodId !== req.params.id) {
          res.status(404).json({ error: "Submission not found" });
          return;
        }

        const result = await updateFeedbackState(req.params.feedbackId, state, getFeedbackRepository());
        if (result.status === "not_found") {
          res.status(404).json({ error: "Submission not found" });
          return;
        }
        if (result.status === "invalid") {
          res.status(400).json({ error: result.message });
          return;
        }

        res.json(result.submission);
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/feedback/${req.params.feedbackId} failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update feedback" });
      }
    }
  );

  // BACKLOG.md Ref 89: registers a browser/device's web push subscription
  // (the client already called pushManager.subscribe() with the VAPID public
  // key -- this just persists the resulting endpoint/keys). Upserts on
  // endpoint, so re-subscribing the same browser replaces the stale row.
  app.post("/me/push-subscriptions", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    const { endpoint, keys } = req.body ?? {};

    try {
      const result = await subscribeToPush(req.appUser!.id, { endpoint, keys }, getPushSubscriptionRepository());
      if (result.status === "invalid") {
        res.status(400).json({ error: result.message });
        return;
      }
      res.status(201).json(result.subscription);
    } catch (err) {
      console.error("POST /me/push-subscriptions failed:", err);
      res.status(500).json({ error: "Failed to register push subscription" });
    }
  });

  app.delete(
    "/me/push-subscriptions/:id",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const result = await unsubscribeFromPush(req.appUser!.id, req.params.id, getPushSubscriptionRepository());
        if (result.status === "not_found") {
          res.status(404).json({ error: "Subscription not found" });
          return;
        }
        if (result.status === "forbidden") {
          res.status(403).json({ error: "Not your subscription to remove" });
          return;
        }
        res.status(204).end();
      } catch (err) {
        console.error(`DELETE /me/push-subscriptions/${req.params.id} failed:`, err);
        res.status(500).json({ error: "Failed to remove push subscription" });
      }
    }
  );

  // Manual/test trigger only (BACKLOG.md Ref 89 open question) -- sends a
  // push to the calling admin's own subscriptions by default, or to a chosen
  // user_id (Users tab "Send test push" action) so the install+push path can
  // be verified against any account, not just the admin's own. Gated to
  // superAdminGate rather than adminGate, matching GET /admin/users, since
  // targeting an arbitrary user_id is a stronger power than the self-only
  // version this started as. Wiring a real trigger (e.g. Ref 9 neighborhood
  // notifications) into sendPushToUsers is a separate future change; this
  // route exists so that function has a first caller today.
  app.post("/admin/push-subscriptions/test-send", superAdminGate, async (req, res) => {
    const { title, body, userId, url } = req.body ?? {};
    if (typeof title !== "string" || !title.trim() || typeof body !== "string" || !body.trim()) {
      res.status(400).json({ error: "title and body are required" });
      return;
    }
    if (userId !== undefined && typeof userId !== "string") {
      res.status(400).json({ error: "userId must be a string" });
      return;
    }
    if (url !== undefined && typeof url !== "string") {
      res.status(400).json({ error: "url must be a string" });
      return;
    }

    try {
      const summary = await sendPushToUsers(
        [userId ?? req.appUser!.id],
        { title, body, url },
        getPushSubscriptionRepository(),
        getWebPushSender()
      );
      res.json(summary);
    } catch (err) {
      console.error("POST /admin/push-subscriptions/test-send failed:", err);
      res.status(500).json({ error: "Failed to send test push" });
    }
  });

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
        try {
          await notifyUserOfConnectionAccepted(
            result.connection.requesterId,
            req.appUser!.displayName,
            getPushSubscriptionRepository(),
            getWebPushSender(),
            getAuthRepository()
          );
        } catch (err) {
          console.error("notifyUserOfConnectionAccepted failed:", err);
        }
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

  // Reverse "Top Caps" lookup for GET /users/:username below -- among the
  // venues this user has actually visited within the rolling 60-day window
  // (RECENT_VISITOR_WINDOW_MS) and every neighborhood they belong to, which
  // ones currently rank them in that place's own top 3 by visit count
  // (TOP_VISITORS_LIMIT). Bounded to MAX_TOP_CAP_VENUE_CANDIDATES
  // most-visited-by-this-user venues, sorted by their own visit count within
  // the window, so a very active profile doesn't trigger one
  // venue-leaderboard query pair per distinct venue it's ever visited --
  // fine at pilot scale (mirrors the handler's own existing 8-way Promise.all
  // fan-out), revisit if that cap starts missing real Top Caps for heavy
  // users. Neighborhood membership lists are typically tiny (1-5 rows) so no
  // equivalent cap is needed there. `username` is required (not just
  // user.id) since resolveTopVisitors/listRecentVisitorMushroomsForNeighborhood
  // name ranked visitors by username, never by id.
  const MAX_TOP_CAP_VENUE_CANDIDATES = 8;
  async function resolveProfileTopCaps(
    username: string | null,
    checkins: { venueId: string; name: string; checkedInAt: string }[],
    neighborhoods: { neighborhood_id: string; slug: string; name: string }[]
  ): Promise<ProfileTopCap[]> {
    if (!username) return [];

    const windowStart = Date.now() - RECENT_VISITOR_WINDOW_MS;
    const venueVisits = new Map<string, { name: string; count: number }>();
    for (const c of checkins) {
      if (new Date(c.checkedInAt).getTime() < windowStart) continue;
      const entry = venueVisits.get(c.venueId);
      if (entry) entry.count += 1;
      else venueVisits.set(c.venueId, { name: c.name, count: 1 });
    }
    const candidateVenues = [...venueVisits.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, MAX_TOP_CAP_VENUE_CANDIDATES);

    const [venueCaps, neighborhoodCaps] = await Promise.all([
      Promise.all(
        candidateVenues.map(async ([venueId, info]): Promise<ProfileTopCap | null> => {
          const leaderboard = await getVenueLeaderboard(venueId, getLocationRepository(), TOP_VISITORS_LIMIT);
          const rank = leaderboard.findIndex((v) => v.username === username);
          if (rank === -1) return null;
          return { kind: "venue", id: venueId, name: info.name, rank: rank + 1, visit_count: leaderboard[rank].visitCount };
        })
      ),
      Promise.all(
        neighborhoods.map(async (n): Promise<ProfileTopCap | null> => {
          const { topVisitors } = await getCheckinRepository().listRecentVisitorMushroomsForNeighborhood(
            n.neighborhood_id,
            TOP_VISITORS_LIMIT
          );
          const rank = topVisitors.findIndex((v) => v.username === username);
          if (rank === -1) return null;
          return {
            kind: "neighborhood",
            id: n.neighborhood_id,
            slug: n.slug,
            name: n.name,
            rank: rank + 1,
            visit_count: topVisitors[rank].visitCount,
          };
        })
      ),
    ]);

    return [...venueCaps, ...neighborhoodCaps]
      .filter((cap): cap is ProfileTopCap => cap !== null)
      .sort((a, b) => a.rank - b.rank || b.visit_count - a.visit_count);
  }

  // BACKLOG.md "Public user profiles": the username-keyed public counterpart
  // to /me/profile, mirroring how GET /neighborhoods/:slug is the public
  // lookup alongside the id-keyed neighborhood-admin routes. Returns 404 for
  // both "no such username" and "profile is private" -- a private profile
  // isn't distinguishable from a nonexistent one to an outside caller.
  // Recent check-ins are gated by the same profile-level visibility, since
  // checkin has no per-row privacy field of its own. checkin_count/
  // collection_count/points_summary let the web app render ProfileSummaryCard
  // here too -- collection_count is a plain count (the collected species
  // themselves stay private; only /me/collection lists them). neighbor_count
  // is likewise a plain count (BACKLOG.md Ref 14/33) -- the connections
  // themselves stay private to the two parties, only /me/connections lists
  // them. `badges`/`challenges` are full lists like their /me/ equivalents.
  app.get("/users/:username", async (req, res) => {
    try {
      const user = await getAuthRepository().getByUsername(req.params.username.toLowerCase());
      if (!user || user.visibility !== "public") {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const [checkins, neighborhoods, badges, challenges, collectionCount, pointsSummary, neighborCount, connections] =
        await Promise.all([
          getCheckinRepository().listCheckinsForUser(user.id),
          listMembershipsForUser(user.id, getNeighborhoodMemberRepository()),
          getUserBadges(user.id, getGamificationRepository()),
          getUserCompletedChallenges(user.id, getGamificationRepository()),
          getMushroomCollectionRepository().countCollectionForUser(user.id),
          getUserPoints(user.id, getGamificationRepository()),
          getConnectionRepository().countAcceptedConnectionsForUser(user.id),
          getConnectionRepository().listConnectionsForUser(user.id, "accepted"),
        ]);
      // Live-resolved configs only (no username/id) -- see PublicUserProfile's
      // neighbor_mushrooms comment for why this is safe to expose alongside
      // the bare neighbor_count, unlike the request-gated neighbor list
      // itself.
      const neighborMushrooms = connections.map((c) =>
        resolveMushroomConfig(c.user.id, toMushroomConfig(c.user.mushroomCustomization))
      );
      const topCaps = await resolveProfileTopCaps(user.username, checkins, neighborhoods);

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
        collection_count: collectionCount,
        points_summary: pointsSummary,
        neighbor_count: neighborCount,
        neighbor_mushrooms: neighborMushrooms,
        top_caps: topCaps,
      });
    } catch (err) {
      console.error(`GET /users/${req.params.username} failed:`, err);
      res.status(500).json({ error: "Failed to load user profile" });
    }
  });

  // GET /me/connections' "trust signal before connecting" counterpart: how
  // many of the caller's own accepted neighbors are also an accepted
  // neighbor of :username. getUserIdByUsername (not
  // getAuthRepository().getByUsername) since ConnectionRepository is
  // self-contained by design (see its own interface comment) and this route
  // needs nothing else about the target account -- an unknown username or
  // the caller's own username both just resolve to a 0 count rather than a
  // distinct error, since neither is a real "mutual neighbors" answer worth
  // a special-cased response.
  app.get(
    "/me/connections/mutual/:username",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const targetId = await getConnectionRepository().getUserIdByUsername(req.params.username.toLowerCase());
        if (!targetId || targetId === req.appUser!.id) {
          res.json({ count: 0 });
          return;
        }

        const [viewerConnections, targetConnections] = await Promise.all([
          getConnectionRepository().listConnectionsForUser(req.appUser!.id, "accepted"),
          getConnectionRepository().listConnectionsForUser(targetId, "accepted"),
        ]);
        const targetNeighborIds = new Set(targetConnections.map((c) => c.user.id));
        const count = viewerConnections.filter((c) => targetNeighborIds.has(c.user.id)).length;
        res.json({ count });
      } catch (err) {
        console.error(`GET /me/connections/mutual/${req.params.username} failed:`, err);
        res.status(500).json({ error: "Failed to compute mutual neighbors" });
      }
    }
  );

  // README §5: claim submission requires a signed-in account (BACKLOG.md
  // Ref 32) -- ties every claim to a specific account for follow-up and
  // cuts down on anonymous spam/false claims. Verification itself stays
  // manual/admin reviewed (no SMS/email provider wired in yet) via the
  // /admin/claims routes below. Any signed-in account (consumer or
  // business, see claimed_by_user_id / GET /business/venues below) can
  // claim, since account_type can still be promoted to business later via
  // /auth/promote-to-business -- gating this on already being a business
  // account at submission time would silently drop the link for the common
  // "submit a claim, then promote" order.
  app.post(
    "/venues/:id/claims",
    requireAuthUser(getSupabaseClient, getAuthRepository),
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
            claimedByUserId: req.appUser!.id,
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
    const { name, city, state, country, timezone, boundary_geojson } = req.body ?? {};
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof city !== "string" ||
      !city.trim() ||
      typeof state !== "string" ||
      !state.trim() ||
      typeof country !== "string" ||
      !country.trim() ||
      typeof timezone !== "string" ||
      !timezone.trim()
    ) {
      res.status(400).json({ error: "name, city, state, country, and timezone are required" });
      return;
    }
    if (!isValidPolygon(boundary_geojson)) {
      res.status(400).json({ error: "boundary_geojson must be a closed GeoJSON Polygon" });
      return;
    }

    try {
      const created = await createNeighborhood(
        { name, city, state, country, timezone, boundaryGeojson: boundary_geojson },
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

  // BACKLOG.md Ref 107 / project plan §12.3 step 5: the "deliberate step"
  // that takes a neighborhood live once its venue data is clean. Gated to
  // superAdminGate like creation itself, not neighborhoodAdminGate -- a
  // neighborhood admin can curate but shouldn't unilaterally decide the
  // neighborhood is ready to appear in the public picker/geolocation match.
  app.post("/admin/neighborhoods/:id/activate", superAdminGate, async (req, res) => {
    try {
      const result = await activateNeighborhood(req.params.id, getNeighborhoodRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Neighborhood not found" });
        return;
      }
      res.json({ status: result.neighborhood.status });
    } catch (err) {
      console.error(`POST /admin/neighborhoods/${req.params.id}/activate failed:`, err);
      res.status(500).json({ error: "Failed to activate neighborhood" });
    }
  });

  // Super admin UI (BACKLOG.md), starting with a platform-wide user list --
  // gated to superAdminGate rather than adminGate since it isn't scoped to
  // any one neighborhood or business and exposes every account, not just
  // ones an admin happens to be able to reach otherwise.
  app.get("/admin/users", superAdminGate, async (_req, res) => {
    try {
      const users = await listUsersForAdmin(getUserRepository(), getPushSubscriptionRepository());
      res.json(users);
    } catch (err) {
      console.error("GET /admin/users failed:", err);
      res.status(500).json({ error: "Failed to list users" });
    }
  });

  // Super-admin Monitoring tab (BACKLOG.md Ref 104) -- ?minutes= clamped to
  // [5, 129600] (5 minutes .. 90 days), defaulting to 10080 (7 days;
  // errors/requests are noisier day-to-day than neighborhood/venue
  // analytics, so a shorter default window), backed by a single
  // get_monitoring_analytics RPC covering all six charts. Minutes rather
  // than days so the range control can offer 5-minute/1-hour options
  // alongside 24h/7d/30d for watching a live incident, not just day-level
  // history. ?domain= and ?version= (BACKLOG.md Ref 104 follow-ups) narrow
  // every chart to one deployment's rows (e.g. "app.tryspored.com")
  // and/or one shipped release (e.g. "0.81.0") -- either omitted/empty
  // keeps everything for that axis. ?status_class= (one of 2xx/3xx/4xx/5xx)
  // narrows recent_requests to that family -- anything else is treated as
  // absent rather than erroring, same as an unrecognized domain/version.
  const STATUS_CLASSES = new Set(["2xx", "3xx", "4xx", "5xx"]);
  const ERROR_SOURCES = new Set(["api", "web", "marketing"]);
  const ROUTE_SCOPES = new Set(["admin", "auth", "app"]);
  app.get("/admin/monitoring/analytics", superAdminGate, async (req, res) => {
    try {
      const rawMinutes = Number(req.query.minutes);
      const minutes = Number.isFinite(rawMinutes) ? Math.min(Math.max(Math.trunc(rawMinutes), 5), 129600) : 10080;
      const rawDomain = req.query.domain;
      const domain = typeof rawDomain === "string" && rawDomain.trim() ? rawDomain.trim() : null;
      const rawVersion = req.query.version;
      const version = typeof rawVersion === "string" && rawVersion.trim() ? rawVersion.trim() : null;
      const rawStatusClass = req.query.status_class;
      const statusClass = typeof rawStatusClass === "string" && STATUS_CLASSES.has(rawStatusClass) ? rawStatusClass : null;
      const rawErrorSource = req.query.source;
      const errorSource = typeof rawErrorSource === "string" && ERROR_SOURCES.has(rawErrorSource) ? rawErrorSource : null;
      const rawRouteScope = req.query.route_scope;
      const routeScope = typeof rawRouteScope === "string" && ROUTE_SCOPES.has(rawRouteScope) ? rawRouteScope : null;
      const analytics = await getMonitoringRepository().getAnalytics(
        minutes,
        domain,
        version,
        statusClass,
        errorSource,
        routeScope
      );
      res.json(analytics);
    } catch (err) {
      console.error("GET /admin/monitoring/analytics failed:", err);
      res.status(500).json({ error: "Failed to load monitoring analytics" });
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
  // Gated to superAdminGate (moved from adminGate along with the web UI's
  // move from the old standalone /admin/category-taxonomy into the super
  // admin shell) since it's a platform-wide taxonomy edit, not scoped to
  // any one neighborhood.
  app.get("/admin/category-taxonomy", superAdminGate, async (_req, res) => {
    try {
      const categories = await listCategoriesForAdmin(getCategoryAdminRepository());
      res.json(categories);
    } catch (err) {
      console.error("GET /admin/category-taxonomy failed:", err);
      res.status(500).json({ error: "Failed to list categories" });
    }
  });

  app.post("/admin/category-taxonomy", superAdminGate, async (req, res) => {
    const { name, parent_category_id, geoapify_categories } = req.body ?? {};
    if (typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (parent_category_id !== null && parent_category_id !== undefined && typeof parent_category_id !== "string") {
      res.status(400).json({ error: "parent_category_id must be a string or null" });
      return;
    }
    if (
      geoapify_categories !== undefined &&
      (!Array.isArray(geoapify_categories) || !geoapify_categories.every((t) => typeof t === "string"))
    ) {
      res.status(400).json({ error: "geoapify_categories must be an array of strings" });
      return;
    }

    try {
      const result = await createCategory(
        name,
        parent_category_id ?? null,
        geoapify_categories ?? [],
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

  app.patch("/admin/category-taxonomy/:id", superAdminGate, async (req, res) => {
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

  app.post("/admin/category-taxonomy/:id/archive", superAdminGate, async (req, res) => {
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

  // BACKLOG.md Ref 108: minimal super-admin authoring for app-wide vs
  // neighborhood-specific challenges, mirroring /admin/category-taxonomy
  // above. GET/POST/PATCH only, no archive/delete -- a challenge with
  // completions attached is left in place, matching how challenges have
  // always been managed (hand-edited rows, never removed).
  app.get("/admin/challenges", superAdminGate, async (_req, res) => {
    try {
      const challenges = await listChallengesForAdmin(getGamificationRepository(), getNeighborhoodRepository());
      res.json(challenges);
    } catch (err) {
      console.error("GET /admin/challenges failed:", err);
      res.status(500).json({ error: "Failed to list challenges" });
    }
  });

  app.post("/admin/challenges", superAdminGate, async (req, res) => {
    const {
      neighborhood_id,
      title,
      description,
      category_id,
      target_kind,
      target_count,
      target_count_live,
      points_reward,
      badge_id,
      starts_at,
      ends_at,
    } = req.body ?? {};
    if (neighborhood_id !== null && typeof neighborhood_id !== "string") {
      res.status(400).json({ error: "neighborhood_id must be a string or null" });
      return;
    }
    if (typeof title !== "string") {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (category_id !== undefined && category_id !== null && typeof category_id !== "string") {
      res.status(400).json({ error: "category_id must be a string or null" });
      return;
    }
    if (target_kind !== undefined && target_kind !== null && target_kind !== "poi" && target_kind !== "any") {
      res.status(400).json({ error: "target_kind must be 'poi', 'any', or null" });
      return;
    }
    if (typeof target_count !== "number" || target_count < 1) {
      res.status(400).json({ error: "target_count must be a positive number" });
      return;
    }
    if (target_count_live !== undefined && typeof target_count_live !== "boolean") {
      res.status(400).json({ error: "target_count_live must be a boolean" });
      return;
    }
    if (typeof points_reward !== "number" || points_reward < 0) {
      res.status(400).json({ error: "points_reward must be a non-negative number" });
      return;
    }
    if (badge_id !== undefined && badge_id !== null && typeof badge_id !== "string") {
      res.status(400).json({ error: "badge_id must be a string or null" });
      return;
    }
    if (typeof starts_at !== "string") {
      res.status(400).json({ error: "starts_at is required" });
      return;
    }
    if (ends_at !== undefined && ends_at !== null && typeof ends_at !== "string") {
      res.status(400).json({ error: "ends_at must be a string or null" });
      return;
    }

    try {
      const result = await createChallengeForAdmin(
        {
          neighborhoodId: neighborhood_id ?? null,
          title,
          description: description ?? null,
          categoryId: category_id ?? null,
          targetKind: target_kind ?? null,
          targetCount: target_count,
          targetCountLive: target_count_live ?? false,
          pointsReward: points_reward,
          badgeId: badge_id ?? null,
          startsAt: starts_at,
          endsAt: ends_at ?? null,
        },
        getGamificationRepository(),
        getNeighborhoodRepository(),
        getCategoryAdminRepository()
      );

      switch (result.status) {
        case "invalid_title":
          res.status(400).json({ error: "title must not be empty" });
          return;
        case "invalid_target":
          res.status(400).json({ error: "exactly one of category_id/target_kind is required" });
          return;
        case "invalid_live_target":
          res.status(400).json({ error: "target_count_live is only valid when target_kind is 'poi'" });
          return;
        case "invalid_neighborhood":
          res.status(400).json({ error: "neighborhood_id does not reference an existing neighborhood" });
          return;
        case "invalid_category":
          res.status(400).json({ error: "category_id does not reference an existing category" });
          return;
        case "invalid_dates":
          res.status(400).json({ error: "ends_at must be after starts_at" });
          return;
        case "created":
          res.status(201).json(result.challenge);
          return;
      }
    } catch (err) {
      console.error("POST /admin/challenges failed:", err);
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  app.patch("/admin/challenges/:id", superAdminGate, async (req, res) => {
    const { title, description, category_id, target_kind, target_count, target_count_live, points_reward, badge_id, ends_at } =
      req.body ?? {};
    if (title !== undefined && typeof title !== "string") {
      res.status(400).json({ error: "title must be a string" });
      return;
    }
    if (category_id !== undefined && category_id !== null && typeof category_id !== "string") {
      res.status(400).json({ error: "category_id must be a string or null" });
      return;
    }
    if (target_kind !== undefined && target_kind !== null && target_kind !== "poi" && target_kind !== "any") {
      res.status(400).json({ error: "target_kind must be 'poi', 'any', or null" });
      return;
    }
    if (target_count !== undefined && (typeof target_count !== "number" || target_count < 1)) {
      res.status(400).json({ error: "target_count must be a positive number" });
      return;
    }
    if (target_count_live !== undefined && typeof target_count_live !== "boolean") {
      res.status(400).json({ error: "target_count_live must be a boolean" });
      return;
    }
    if (points_reward !== undefined && (typeof points_reward !== "number" || points_reward < 0)) {
      res.status(400).json({ error: "points_reward must be a non-negative number" });
      return;
    }
    if (badge_id !== undefined && badge_id !== null && typeof badge_id !== "string") {
      res.status(400).json({ error: "badge_id must be a string or null" });
      return;
    }
    if (ends_at !== undefined && ends_at !== null && typeof ends_at !== "string") {
      res.status(400).json({ error: "ends_at must be a string or null" });
      return;
    }

    try {
      const result = await updateChallengeForAdmin(
        req.params.id,
        {
          title,
          description: description === undefined ? undefined : (description ?? null),
          categoryId: category_id,
          targetKind: target_kind,
          targetCount: target_count,
          targetCountLive: target_count_live,
          pointsReward: points_reward,
          badgeId: badge_id,
          endsAt: ends_at,
        },
        getGamificationRepository(),
        getNeighborhoodRepository(),
        getCategoryAdminRepository()
      );

      switch (result.status) {
        case "not_found":
          res.status(404).json({ error: "Challenge not found" });
          return;
        case "invalid_title":
          res.status(400).json({ error: "title must not be empty" });
          return;
        case "invalid_target":
          res.status(400).json({ error: "exactly one of category_id/target_kind is required" });
          return;
        case "invalid_category":
          res.status(400).json({ error: "category_id does not reference an existing category" });
          return;
        case "invalid_live_target":
          res.status(400).json({ error: "target_count_live is only valid when target_kind is 'poi'" });
          return;
        case "updated":
          res.json(result.challenge);
          return;
      }
    } catch (err) {
      // challenge_dates_check (ends_at > starts_at) is only enforceable here
      // -- this route doesn't re-validate against the row's own starts_at,
      // so a bad ends_at surfaces as a DB constraint violation instead.
      if (err instanceof Error && err.message.includes("challenge_dates_check")) {
        res.status(400).json({ error: "ends_at must be after starts_at" });
        return;
      }
      console.error(`PATCH /admin/challenges/${req.params.id} failed:`, err);
      res.status(500).json({ error: "Failed to update challenge" });
    }
  });

  // Super admin Badges view (BACKLOG.md Ref 108): every badge exists is
  // already app-wide by construction (badge/badge_rule carry no
  // neighborhood_id), so this is read-mostly -- classification (app-wide vs.
  // neighborhood-specific) is derived from what earns each badge (a global
  // rule, an app-wide challenge, or only neighborhood-scoped challenges), not
  // stored. Create/edit cover name/description/icon only -- authoring a
  // badge_rule's ~9 rule types isn't exposed here.
  app.get("/admin/badges", superAdminGate, async (_req, res) => {
    try {
      const badges = await listBadgesForAdmin(getGamificationRepository(), getNeighborhoodRepository());
      res.json(badges);
    } catch (err) {
      console.error("GET /admin/badges failed:", err);
      res.status(500).json({ error: "Failed to list badges" });
    }
  });

  app.post("/admin/badges", superAdminGate, async (req, res) => {
    const { name, description, icon, neighborhood_id } = req.body ?? {};
    if (typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (description !== undefined && description !== null && typeof description !== "string") {
      res.status(400).json({ error: "description must be a string or null" });
      return;
    }
    if (icon !== undefined && icon !== null && typeof icon !== "string") {
      res.status(400).json({ error: "icon must be a string or null" });
      return;
    }
    if (neighborhood_id !== undefined && neighborhood_id !== null && typeof neighborhood_id !== "string") {
      res.status(400).json({ error: "neighborhood_id must be a string or null" });
      return;
    }

    try {
      const result = await createBadgeForAdmin(
        name,
        description ?? null,
        icon ?? null,
        neighborhood_id ?? null,
        getGamificationRepository(),
        getNeighborhoodRepository()
      );

      switch (result.status) {
        case "invalid_name":
          res.status(400).json({ error: "name must not be empty" });
          return;
        case "invalid_neighborhood":
          res.status(400).json({ error: "neighborhood_id does not reference an existing neighborhood" });
          return;
        case "code_taken":
          res.status(409).json({ error: "A badge with this name (or a very similar one) already exists" });
          return;
        case "created":
          res.status(201).json(result.badge);
          return;
      }
    } catch (err) {
      console.error("POST /admin/badges failed:", err);
      res.status(500).json({ error: "Failed to create badge" });
    }
  });

  app.patch("/admin/badges/:id", superAdminGate, async (req, res) => {
    const { name, description, icon } = req.body ?? {};
    if (name !== undefined && typeof name !== "string") {
      res.status(400).json({ error: "name must be a string" });
      return;
    }
    if (description !== undefined && description !== null && typeof description !== "string") {
      res.status(400).json({ error: "description must be a string or null" });
      return;
    }
    if (icon !== undefined && icon !== null && typeof icon !== "string") {
      res.status(400).json({ error: "icon must be a string or null" });
      return;
    }

    try {
      const result = await updateBadgeForAdmin(
        req.params.id,
        { name, description, icon },
        getGamificationRepository(),
        getNeighborhoodRepository()
      );

      switch (result.status) {
        case "not_found":
          res.status(404).json({ error: "Badge not found" });
          return;
        case "invalid_name":
          res.status(400).json({ error: "name must not be empty" });
          return;
        case "updated":
          res.json(result.badge);
          return;
      }
    } catch (err) {
      console.error(`PATCH /admin/badges/${req.params.id} failed:`, err);
      res.status(500).json({ error: "Failed to update badge" });
    }
  });

  // The caller must already hold a valid Supabase Auth session (the
  // Authorization bearer token); this endpoint creates the app_user row for
  // a newly authenticated user.
  app.post("/auth/complete-signup", async (req, res) => {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { account_type } = req.body ?? {};
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

      // completeSignup is idempotent for a repeat call by the same auth user
      // (see auth.ts) -- checked for separately here (rather than having
      // completeSignup report it) so the super-admin signup alert below only
      // fires for a genuinely new account, not every retried/duplicate call.
      const existedAlready = (await getAuthRepository().getByAuthUserId(verified.authUserId)) !== null;
      const user = await completeSignup(verified, account_type ?? "consumer", getAuthRepository());
      await awardFounderBadge(user.id, getGamificationRepository());
      const [isAdmin, isSuperAdmin] = await Promise.all([
        getNeighborhoodAdminRepository().isNeighborhoodAdmin(user.id),
        getSuperAdminRepository().isSuperAdmin(user.id),
      ]);

      if (!existedAlready) {
        try {
          await notifySuperAdminsOfSignup(
            { displayName: user.displayName, email: user.email },
            getSuperAdminRepository(),
            getPushSubscriptionRepository(),
            getWebPushSender()
          );
        } catch (err) {
          console.error("notifySuperAdminsOfSignup failed:", err);
        }
      }

      res.status(200).json(toAppUser(user, isAdmin, isSuperAdmin));
    } catch (err) {
      console.error("POST /auth/complete-signup failed:", err);
      res.status(500).json({ error: "Failed to complete signup" });
    }
  });

  app.post("/auth/complete-login", async (req, res) => {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const verified = await verifyAccessToken(getSupabaseClient(), token);
      if (!verified) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const result = await completeLogin(verified, getAuthRepository());
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
  // tools (BACKLOG "Venue coupons" etc., which depend on this item for the
  // business-side login) -- proves the account_type gate end-to-end by
  // listing the venues this business account has an approved claim on.
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
  // this venue's own coupons/events, for the specific venue this business
  // account holds an approved claim on (enforced by venueOwnerGate, not just
  // "is a business account" like GET /business/venues above).
  app.get("/business/venues/:id/dashboard", venueOwnerGate, async (req, res) => {
    try {
      const venue = await getLocationRepository().getLocationById(req.params.id);
      if (!venue) {
        res.status(404).json({ error: "Venue not found" });
        return;
      }

      const [followerCount, checkinCount, coupons, events, socialLinks, icalFeed] = await Promise.all([
        getFavoriteRepository().countFavoritesForVenue(req.params.id),
        getCheckinRepository().countCheckinsForLocation(req.params.id),
        listCouponsForVenue(req.params.id, getCouponRepository()),
        listEventsForVenue(req.params.id, getEventRepository(), true),
        getVenueSocialLinks(req.params.id, getClaimRepository()),
        getVenueIcalFeed(req.params.id, getClaimRepository()),
      ]);

      const summary: VenueDashboardSummary = {
        venue_id: venue.id,
        name: venue.name,
        address: venue.address ?? "",
        follower_count: followerCount,
        checkin_count: checkinCount,
        coupons,
        events,
        social_links: socialLinks,
        ical_feed_url: icalFeed.icalFeedUrl,
        ical_synced_at: icalFeed.icalSyncedAt,
      };
      res.json(summary);
    } catch (err) {
      console.error(`GET /business/venues/${req.params.id}/dashboard failed:`, err);
      res.status(500).json({ error: "Failed to load venue dashboard" });
    }
  });

  // Analytics tab (charts/breakdowns of activity for this venue) -- mirrors
  // GET /neighborhood-admin/neighborhoods/:id/analytics: ?days= clamped to
  // [1, 90], defaulting to 30, backed by a single get_venue_analytics RPC
  // covering all six charts.
  app.get("/business/venues/:id/analytics", venueOwnerGate, async (req, res) => {
    try {
      const rawDays = Number(req.query.days);
      const days = Number.isFinite(rawDays) ? Math.min(Math.max(Math.trunc(rawDays), 1), 90) : 30;
      const analytics = await getLocationRepository().getAnalytics(req.params.id, days);
      res.json(analytics);
    } catch (err) {
      console.error(`GET /business/venues/${req.params.id}/analytics failed:`, err);
      res.status(500).json({ error: "Failed to load venue analytics" });
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

  // iCal/webcal event feed import (BACKLOG.md Ref 30) -- lets a claimed
  // business publish an external calendar feed that syncs into its events
  // list instead of manual EventForm entry for each one.
  app.patch("/business/venues/:id/ical-feed", venueOwnerGate, async (req, res) => {
    const { ical_feed_url } = req.body ?? {};
    if (typeof ical_feed_url !== "string") {
      res.status(400).json({ error: "ical_feed_url is required" });
      return;
    }

    try {
      const result = await updateVenueIcalFeedUrl(req.params.id, ical_feed_url, getClaimRepository());
      if (result.status === "invalid_url") {
        res.status(400).json({ error: "ical_feed_url must be a valid http(s):// or webcal:// URL" });
        return;
      }
      res.json({ ical_feed_url: result.icalFeedUrl });
    } catch (err) {
      console.error(`PATCH /business/venues/${req.params.id}/ical-feed failed:`, err);
      res.status(500).json({ error: "Failed to update calendar feed URL" });
    }
  });

  app.post("/business/venues/:id/ical-feed/sync", venueOwnerGate, async (req, res) => {
    try {
      const outcome = await syncVenueIcalFeed(
        req.params.id,
        getClaimRepository(),
        getEventRepository(),
        getLocationRepository()
      );
      switch (outcome.status) {
        case "not_found":
          res.status(404).json({ error: "Venue not found" });
          return;
        case "no_feed_configured":
          res.status(400).json({ error: "No calendar feed URL is configured for this venue" });
          return;
        case "fetch_error":
          res.status(502).json({ error: `Failed to fetch calendar feed: ${outcome.message}` });
          return;
        case "synced":
          res.json({ imported: outcome.result.imported, updated: outcome.result.updated, synced_at: outcome.syncedAt });
          return;
      }
    } catch (err) {
      console.error(`POST /business/venues/${req.params.id}/ical-feed/sync failed:`, err);
      res.status(500).json({ error: "Failed to sync calendar feed" });
    }
  });

  app.post("/business/venues/:id/coupons", venueOwnerGate, async (req, res) => {
    const { title, description, terms, quantity, start_at, end_at } = req.body ?? {};
    if (typeof title !== "string" || !title || typeof description !== "string" || !description) {
      res.status(400).json({ error: "title and description are required" });
      return;
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({ error: "quantity must be a positive integer" });
      return;
    }
    if (typeof start_at !== "string" || typeof end_at !== "string") {
      res.status(400).json({ error: "start_at and end_at are required" });
      return;
    }

    try {
      const result = await createCoupon(
        req.params.id,
        {
          title,
          description,
          terms: typeof terms === "string" && terms ? terms : null,
          quantity,
          startAt: start_at,
          endAt: end_at,
        },
        getCouponRepository()
      );
      if (result.status === "invalid_time_range") {
        res.status(400).json({ error: "end_at must be after start_at" });
        return;
      }

      // BACKLOG.md Ref 102 follow-up: notify this venue's favoriters.
      // Awaited before the response (not fired-and-forgotten after it) for
      // the same Netlify/Lambda reason as notifyConnectionsOfCheckin -- the
      // container can freeze as soon as res.json() completes -- but a
      // failure here is swallowed, since the coupon itself already succeeded.
      try {
        const venue = await getLocationRepository().getLocationById(req.params.id);
        if (venue) {
          await notifyFavoritersOfNewCoupon(
            req.params.id,
            venue.name,
            title,
            getFavoriteRepository(),
            getPushSubscriptionRepository(),
            getWebPushSender(),
            getAuthRepository()
          );
        }
      } catch (err) {
        console.error(`notifyFavoritersOfNewCoupon (venue ${req.params.id}) failed:`, err);
      }

      res.status(201).json(result.coupon);
    } catch (err) {
      console.error(`POST /business/venues/${req.params.id}/coupons failed:`, err);
      res.status(500).json({ error: "Failed to create coupon" });
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

  app.delete("/business/venues/:id/events/:eventId", venueOwnerGate, async (req, res) => {
    try {
      const result = await deleteEventForVenue(req.params.id, req.params.eventId, getEventRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      if (result.status === "forbidden") {
        res.status(403).json({ error: "Only manually added events can be deleted" });
        return;
      }
      res.status(204).end();
    } catch (err) {
      console.error(`DELETE /business/venues/${req.params.id}/events/${req.params.eventId} failed:`, err);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // Hide/restore (BACKLOG.md Ref 30 follow-up) -- unlike DELETE above, hiding
  // an iCal-imported event survives future "Sync now" runs, since the sync's
  // upsert never overwrites status. Manually created events can be hidden
  // too, for the same "keep it but don't show it" case.
  app.patch("/business/venues/:id/events/:eventId/status", venueOwnerGate, async (req, res) => {
    const { status } = req.body ?? {};
    if (!EVENT_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${EVENT_STATUSES.join(", ")}` });
      return;
    }

    try {
      const result = await setEventStatusForVenue(req.params.id, req.params.eventId, status, getEventRepository());
      if (result.status === "not_found") {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json(result.event);
    } catch (err) {
      console.error(
        `PATCH /business/venues/${req.params.id}/events/${req.params.eventId}/status failed:`,
        err
      );
      res.status(500).json({ error: "Failed to update event status" });
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
          ical_feed_url: neighborhood.icalFeedUrl,
          ical_synced_at: neighborhood.icalSyncedAt,
          ical_auto_sync_enabled: neighborhood.icalAutoSyncEnabled,
          ical_auto_approve_events: neighborhood.icalAutoApproveEvents,
          status: neighborhood.status,
        };
        res.json(summary);
      } catch (err) {
        console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/dashboard failed:`, err);
        res.status(500).json({ error: "Failed to load neighborhood dashboard" });
      }
    }
  );

  // Analytics tab (charts/breakdowns of locations + activity within a
  // neighborhood) -- ?days= clamped to [1, 90], defaulting to 30, backed by
  // a single get_neighborhood_analytics RPC covering all four charts.
  app.get(
    "/neighborhood-admin/neighborhoods/:id/analytics",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const rawDays = Number(req.query.days);
        const days = Number.isFinite(rawDays) ? Math.min(Math.max(Math.trunc(rawDays), 1), 90) : 30;
        const analytics = await getNeighborhoodRepository().getAnalytics(req.params.id, days);
        res.json(analytics);
      } catch (err) {
        console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/analytics failed:`, err);
        res.status(500).json({ error: "Failed to load neighborhood analytics" });
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

  // iCal/webcal event feed import (BACKLOG.md Ref 30) -- lets a neighborhood
  // publish an external calendar feed that syncs into its events list
  // instead of manual EventForm entry for each one.
  app.patch(
    "/neighborhood-admin/neighborhoods/:id/ical-feed",
    neighborhoodAdminGate,
    async (req, res) => {
      const { ical_feed_url } = req.body ?? {};
      if (typeof ical_feed_url !== "string") {
        res.status(400).json({ error: "ical_feed_url is required" });
        return;
      }

      try {
        const result = await updateNeighborhoodIcalFeedUrl(
          req.params.id,
          ical_feed_url,
          getNeighborhoodRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }
        if (result.status === "invalid_url") {
          res.status(400).json({ error: "ical_feed_url must be a valid http(s):// or webcal:// URL" });
          return;
        }
        res.json({ ical_feed_url: result.neighborhood.icalFeedUrl });
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/ical-feed failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update calendar feed URL" });
      }
    }
  );

  // Nightly auto-sync + "trust this feed" auto-approve toggles -- each
  // independently PATCHable from its own switch in IcalFeedForm.tsx, so at
  // least one (but not necessarily both) of the two fields must be present.
  app.patch(
    "/neighborhood-admin/neighborhoods/:id/ical-sync-settings",
    neighborhoodAdminGate,
    async (req, res) => {
      const { ical_auto_sync_enabled, ical_auto_approve_events } = req.body ?? {};
      if (ical_auto_sync_enabled === undefined && ical_auto_approve_events === undefined) {
        res
          .status(400)
          .json({ error: "ical_auto_sync_enabled and/or ical_auto_approve_events is required" });
        return;
      }
      if (
        (ical_auto_sync_enabled !== undefined && typeof ical_auto_sync_enabled !== "boolean") ||
        (ical_auto_approve_events !== undefined && typeof ical_auto_approve_events !== "boolean")
      ) {
        res.status(400).json({ error: "ical_auto_sync_enabled and ical_auto_approve_events must be booleans" });
        return;
      }

      try {
        const result = await updateNeighborhoodIcalSyncSettings(
          req.params.id,
          { autoSyncEnabled: ical_auto_sync_enabled, autoApproveEvents: ical_auto_approve_events },
          getNeighborhoodRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }
        res.json({
          ical_auto_sync_enabled: result.neighborhood.icalAutoSyncEnabled,
          ical_auto_approve_events: result.neighborhood.icalAutoApproveEvents,
        });
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/ical-sync-settings failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update calendar sync settings" });
      }
    }
  );

  app.post(
    "/neighborhood-admin/neighborhoods/:id/ical-feed/sync",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const outcome = await syncNeighborhoodIcalFeed(
          req.params.id,
          getNeighborhoodRepository(),
          getEventRepository()
        );
        switch (outcome.status) {
          case "not_found":
            res.status(404).json({ error: "Neighborhood not found" });
            return;
          case "no_feed_configured":
            res.status(400).json({ error: "No calendar feed URL is configured for this neighborhood" });
            return;
          case "fetch_error":
            res.status(502).json({ error: `Failed to fetch calendar feed: ${outcome.message}` });
            return;
          case "synced":
            res.json({
              imported: outcome.result.imported,
              updated: outcome.result.updated,
              synced_at: outcome.syncedAt,
            });
            return;
        }
      } catch (err) {
        console.error(
          `POST /neighborhood-admin/neighborhoods/${req.params.id}/ical-feed/sync failed:`,
          err
        );
        res.status(500).json({ error: "Failed to sync calendar feed" });
      }
    }
  );

  // Lightweight list endpoint, filterable by ?status= -- mirrors the claims
  // list route's ?status=pending pattern (used by the sidebar's
  // pendingClaimCount fetch). The events *page* itself still reads off the
  // heavier /dashboard endpoint (which also fetches POIs); this exists for
  // the sidebar's pendingEventCount fetch, which only needs the count.
  app.get(
    "/neighborhood-admin/neighborhoods/:id/events",
    neighborhoodAdminGate,
    async (req, res) => {
      const status = req.query.status;
      if (status !== undefined && !EVENT_STATUSES.includes(status as EventStatus)) {
        res.status(400).json({ error: `status must be one of: ${EVENT_STATUSES.join(", ")}` });
        return;
      }

      try {
        const events = await listEventsForNeighborhood(req.params.id, getEventRepository());
        res.json(status === undefined ? events : events.filter((e) => e.status === status));
      } catch (err) {
        console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/events failed:`, err);
        res.status(500).json({ error: "Failed to list events" });
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

  app.delete(
    "/neighborhood-admin/neighborhoods/:id/events/:eventId",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const result = await deleteEventForNeighborhood(
          req.params.id,
          req.params.eventId,
          getEventRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Event not found" });
          return;
        }
        if (result.status === "forbidden") {
          res.status(403).json({ error: "Only manually added events can be deleted" });
          return;
        }
        res.status(204).end();
      } catch (err) {
        console.error(
          `DELETE /neighborhood-admin/neighborhoods/${req.params.id}/events/${req.params.eventId} failed:`,
          err
        );
        res.status(500).json({ error: "Failed to delete event" });
      }
    }
  );

  // Hide/restore (BACKLOG.md Ref 30 follow-up) -- unlike DELETE above, hiding
  // an iCal-imported event survives future "Sync now" runs, since the sync's
  // upsert never overwrites status. Manually created events can be hidden
  // too, for the same "keep it but don't show it" case.
  app.patch(
    "/neighborhood-admin/neighborhoods/:id/events/:eventId/status",
    neighborhoodAdminGate,
    async (req, res) => {
      const { status } = req.body ?? {};
      if (!EVENT_STATUSES.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${EVENT_STATUSES.join(", ")}` });
        return;
      }

      try {
        const result = await setEventStatusForNeighborhood(
          req.params.id,
          req.params.eventId,
          status,
          getEventRepository()
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Event not found" });
          return;
        }
        res.json(result.event);
      } catch (err) {
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/events/${req.params.eventId}/status failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update event status" });
      }
    }
  );

  // Neighborhood-admin Challenges tab (BACKLOG.md Ref 108) -- a
  // neighborhood-scoped slice of the same minimal authoring flow as
  // superAdminGate's /admin/challenges above, forced to this neighborhood's
  // own id (neighborhood_id is never accepted from the request body, and
  // updates are ownership-scoped) rather than exposing app-wide creation or
  // cross-neighborhood editing to a neighborhood admin.
  app.get("/neighborhood-admin/neighborhoods/:id/challenges", neighborhoodAdminGate, async (req, res) => {
    try {
      const neighborhood = await getNeighborhoodById(req.params.id, getNeighborhoodRepository());
      if (!neighborhood) {
        res.status(404).json({ error: "Neighborhood not found" });
        return;
      }
      const challenges = await listChallengesForNeighborhoodAdmin(
        req.params.id,
        neighborhood.name,
        getGamificationRepository()
      );
      res.json(challenges);
    } catch (err) {
      console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/challenges failed:`, err);
      res.status(500).json({ error: "Failed to list challenges" });
    }
  });

  // Every neighborhood-admin challenge is required to come with its own
  // badge (user request) -- badge_id is gone from this route's body,
  // replaced with badge_name (required)/badge_description/badge_icon,
  // which mint a new badge scoped to this neighborhood alongside the
  // challenge. Distinct from superAdminGate's /admin/challenges, which
  // keeps badge_id as an optional pick from any existing badge -- super
  // admin manages badges and challenges as two separate tools by design.
  app.post("/neighborhood-admin/neighborhoods/:id/challenges", neighborhoodAdminGate, async (req, res) => {
    const {
      title,
      description,
      category_id,
      target_kind,
      target_count,
      target_count_live,
      points_reward,
      starts_at,
      ends_at,
      badge_name,
      badge_description,
      badge_icon,
    } = req.body ?? {};
    if (typeof title !== "string") {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (category_id !== undefined && category_id !== null && typeof category_id !== "string") {
      res.status(400).json({ error: "category_id must be a string or null" });
      return;
    }
    if (target_kind !== undefined && target_kind !== null && target_kind !== "poi" && target_kind !== "any") {
      res.status(400).json({ error: "target_kind must be 'poi', 'any', or null" });
      return;
    }
    if (typeof target_count !== "number" || target_count < 1) {
      res.status(400).json({ error: "target_count must be a positive number" });
      return;
    }
    if (target_count_live !== undefined && typeof target_count_live !== "boolean") {
      res.status(400).json({ error: "target_count_live must be a boolean" });
      return;
    }
    if (typeof points_reward !== "number" || points_reward < 0) {
      res.status(400).json({ error: "points_reward must be a non-negative number" });
      return;
    }
    if (typeof starts_at !== "string") {
      res.status(400).json({ error: "starts_at is required" });
      return;
    }
    if (ends_at !== undefined && ends_at !== null && typeof ends_at !== "string") {
      res.status(400).json({ error: "ends_at must be a string or null" });
      return;
    }
    if (typeof badge_name !== "string") {
      res.status(400).json({ error: "badge_name is required" });
      return;
    }
    if (badge_description !== undefined && badge_description !== null && typeof badge_description !== "string") {
      res.status(400).json({ error: "badge_description must be a string or null" });
      return;
    }
    if (badge_icon !== undefined && badge_icon !== null && typeof badge_icon !== "string") {
      res.status(400).json({ error: "badge_icon must be a string or null" });
      return;
    }

    try {
      const neighborhood = await getNeighborhoodById(req.params.id, getNeighborhoodRepository());
      if (!neighborhood) {
        res.status(404).json({ error: "Neighborhood not found" });
        return;
      }

      const result = await createChallengeWithBadgeForNeighborhoodAdmin(
        req.params.id,
        neighborhood.name,
        {
          title,
          description: description ?? null,
          categoryId: category_id ?? null,
          targetKind: target_kind ?? null,
          targetCount: target_count,
          targetCountLive: target_count_live ?? false,
          pointsReward: points_reward,
          startsAt: starts_at,
          endsAt: ends_at ?? null,
        },
        { name: badge_name, description: badge_description ?? null, icon: badge_icon ?? null },
        getGamificationRepository(),
        getCategoryAdminRepository()
      );

      switch (result.status) {
        case "invalid_title":
          res.status(400).json({ error: "title must not be empty" });
          return;
        case "invalid_target":
          res.status(400).json({ error: "exactly one of category_id/target_kind is required" });
          return;
        case "invalid_live_target":
          res.status(400).json({ error: "target_count_live is only valid when target_kind is 'poi'" });
          return;
        case "invalid_category":
          res.status(400).json({ error: "category_id does not reference an existing category" });
          return;
        case "invalid_dates":
          res.status(400).json({ error: "ends_at must be after starts_at" });
          return;
        case "invalid_badge_name":
          res.status(400).json({ error: "badge_name must not be empty" });
          return;
        case "badge_code_taken":
          res.status(409).json({ error: "A badge with this name (or a very similar one) already exists" });
          return;
        case "created":
          res.status(201).json(result.challenge);
          return;
      }
    } catch (err) {
      console.error(`POST /neighborhood-admin/neighborhoods/${req.params.id}/challenges failed:`, err);
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  app.patch(
    "/neighborhood-admin/neighborhoods/:id/challenges/:challengeId",
    neighborhoodAdminGate,
    async (req, res) => {
      const {
        title,
        description,
        category_id,
        target_kind,
        target_count,
        target_count_live,
        points_reward,
        ends_at,
        badge_name,
        badge_description,
        badge_icon,
      } = req.body ?? {};
      if (title !== undefined && typeof title !== "string") {
        res.status(400).json({ error: "title must be a string" });
        return;
      }
      if (category_id !== undefined && category_id !== null && typeof category_id !== "string") {
        res.status(400).json({ error: "category_id must be a string or null" });
        return;
      }
      if (target_kind !== undefined && target_kind !== null && target_kind !== "poi" && target_kind !== "any") {
        res.status(400).json({ error: "target_kind must be 'poi', 'any', or null" });
        return;
      }
      if (target_count !== undefined && (typeof target_count !== "number" || target_count < 1)) {
        res.status(400).json({ error: "target_count must be a positive number" });
        return;
      }
      if (target_count_live !== undefined && typeof target_count_live !== "boolean") {
        res.status(400).json({ error: "target_count_live must be a boolean" });
        return;
      }
      if (points_reward !== undefined && (typeof points_reward !== "number" || points_reward < 0)) {
        res.status(400).json({ error: "points_reward must be a non-negative number" });
        return;
      }
      if (ends_at !== undefined && ends_at !== null && typeof ends_at !== "string") {
        res.status(400).json({ error: "ends_at must be a string or null" });
        return;
      }
      if (badge_name !== undefined && typeof badge_name !== "string") {
        res.status(400).json({ error: "badge_name must be a string" });
        return;
      }
      if (badge_description !== undefined && badge_description !== null && typeof badge_description !== "string") {
        res.status(400).json({ error: "badge_description must be a string or null" });
        return;
      }
      if (badge_icon !== undefined && badge_icon !== null && typeof badge_icon !== "string") {
        res.status(400).json({ error: "badge_icon must be a string or null" });
        return;
      }

      try {
        const neighborhood = await getNeighborhoodById(req.params.id, getNeighborhoodRepository());
        if (!neighborhood) {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }

        const result = await updateChallengeForNeighborhoodAdmin(
          req.params.id,
          neighborhood.name,
          req.params.challengeId,
          {
            title,
            description: description === undefined ? undefined : (description ?? null),
            categoryId: category_id,
            targetKind: target_kind,
            targetCount: target_count,
            targetCountLive: target_count_live,
            pointsReward: points_reward,
            endsAt: ends_at,
            badgeName: badge_name,
            badgeDescription: badge_description,
            badgeIcon: badge_icon,
          },
          getGamificationRepository(),
          getCategoryAdminRepository()
        );

        switch (result.status) {
          case "not_found":
            res.status(404).json({ error: "Challenge not found" });
            return;
          case "locked":
            res.status(409).json({ error: "This challenge can no longer be edited -- someone has already completed it" });
            return;
          case "invalid_target":
            res.status(400).json({ error: "exactly one of category_id/target_kind is required" });
            return;
          case "invalid_category":
            res.status(400).json({ error: "category_id does not reference an existing category" });
            return;
          case "invalid_live_target":
            res.status(400).json({ error: "target_count_live is only valid when target_kind is 'poi'" });
            return;
          case "invalid_title":
            res.status(400).json({ error: "title must not be empty" });
            return;
          case "invalid_badge_name":
            res.status(400).json({ error: "badge_name must not be empty" });
            return;
          case "updated":
            res.json(result.challenge);
            return;
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes("challenge_dates_check")) {
          res.status(400).json({ error: "ends_at must be after starts_at" });
          return;
        }
        console.error(
          `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/challenges/${req.params.challengeId} failed:`,
          err
        );
        res.status(500).json({ error: "Failed to update challenge" });
      }
    }
  );

  // Neighborhood-admin Badges tab (BACKLOG.md Ref 108 follow-up), mirroring
  // the Challenges tab pair above: badges directly owned by this
  // neighborhood, or earned only via one of this neighborhood's own
  // challenges. Creation is forced to this neighborhood's own id (never
  // accepted from the body, and never app-wide); updates are
  // ownership-scoped to badges directly owned by it.
  app.get("/neighborhood-admin/neighborhoods/:id/badges", neighborhoodAdminGate, async (req, res) => {
    try {
      const badges = await listBadgesForNeighborhoodAdmin(
        req.params.id,
        getGamificationRepository(),
        getNeighborhoodRepository()
      );
      res.json(badges);
    } catch (err) {
      console.error(`GET /neighborhood-admin/neighborhoods/${req.params.id}/badges failed:`, err);
      res.status(500).json({ error: "Failed to list badges" });
    }
  });

  app.post("/neighborhood-admin/neighborhoods/:id/badges", neighborhoodAdminGate, async (req, res) => {
    const { name, description, icon } = req.body ?? {};
    if (typeof name !== "string") {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (description !== undefined && description !== null && typeof description !== "string") {
      res.status(400).json({ error: "description must be a string or null" });
      return;
    }
    if (icon !== undefined && icon !== null && typeof icon !== "string") {
      res.status(400).json({ error: "icon must be a string or null" });
      return;
    }

    try {
      const result = await createBadgeForAdmin(
        name,
        description ?? null,
        icon ?? null,
        req.params.id,
        getGamificationRepository(),
        getNeighborhoodRepository()
      );

      switch (result.status) {
        case "invalid_name":
          res.status(400).json({ error: "name must not be empty" });
          return;
        case "invalid_neighborhood":
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        case "code_taken":
          res.status(409).json({ error: "A badge with this name (or a very similar one) already exists" });
          return;
        case "created":
          res.status(201).json(result.badge);
          return;
      }
    } catch (err) {
      console.error(`POST /neighborhood-admin/neighborhoods/${req.params.id}/badges failed:`, err);
      res.status(500).json({ error: "Failed to create badge" });
    }
  });

  app.patch("/neighborhood-admin/neighborhoods/:id/badges/:badgeId", neighborhoodAdminGate, async (req, res) => {
    const { name, description, icon } = req.body ?? {};
    if (name !== undefined && typeof name !== "string") {
      res.status(400).json({ error: "name must be a string" });
      return;
    }
    if (description !== undefined && description !== null && typeof description !== "string") {
      res.status(400).json({ error: "description must be a string or null" });
      return;
    }
    if (icon !== undefined && icon !== null && typeof icon !== "string") {
      res.status(400).json({ error: "icon must be a string or null" });
      return;
    }

    try {
      const result = await updateBadgeForNeighborhoodAdmin(
        req.params.id,
        req.params.badgeId,
        { name, description, icon },
        getGamificationRepository(),
        getNeighborhoodRepository()
      );

      switch (result.status) {
        case "not_found":
          res.status(404).json({ error: "Badge not found" });
          return;
        case "invalid_name":
          res.status(400).json({ error: "name must not be empty" });
          return;
        case "updated":
          res.json(result.badge);
          return;
      }
    } catch (err) {
      console.error(
        `PATCH /neighborhood-admin/neighborhoods/${req.params.id}/badges/${req.params.badgeId} failed:`,
        err
      );
      res.status(500).json({ error: "Failed to update badge" });
    }
  });

  // Manual location creation (BACKLOG.md "POIs and venues managed almost
  // the same") -- only the "+ Add point of interest" admin flow posts here
  // today (kind hardcoded to "poi" client-side); kind "business" is accepted
  // for forward compatibility but has no manual-create UI yet.
  app.post("/neighborhood-admin/neighborhoods/:id/locations", neighborhoodAdminGate, async (req, res) => {
    const { kind, name, description, category_id, lat, lng, geoapify_place_id, address } = req.body ?? {};
    if (kind !== "business" && kind !== "poi") {
      res.status(400).json({ error: "kind must be 'business' or 'poi'" });
      return;
    }
    if (typeof name !== "string" || !name) {
      res.status(400).json({ error: "name is required" });
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
    if (geoapify_place_id !== undefined && typeof geoapify_place_id !== "string") {
      res.status(400).json({ error: "geoapify_place_id must be a string" });
      return;
    }
    if (address !== undefined && typeof address !== "string") {
      res.status(400).json({ error: "address must be a string" });
      return;
    }

    try {
      const location = await createLocation(
        req.params.id,
        { kind, name, description, categoryId: category_id, lat, lng, geoapifyPlaceId: geoapify_place_id, address },
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
  // never touches the Places API, so both the Locations tab (to show/disable
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
  // Places query against the neighborhood's *saved* boundary (never an
  // unsaved draft -- that's what /admin/neighborhoods/preview-boundary is
  // for), listing places not yet represented as a venue or POI. Costs a real
  // Places API call each time it runs, same as preview-boundary -- rate
  // limited to once per 24h per neighborhood (BACKLOG.md "Reimport
  // Locations") since an earlier unthrottled version of this exhausted a
  // real Google Cloud project's SearchNearbyRequest-per-minute quota (this
  // predates the Geoapify migration; Geoapify's own per-minute limits
  // aren't yet characterized, so the same conservative throttle stays).
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
            geoapify_place_id: c.geoapifyPlaceId,
            osm_type: c.osmType,
            osm_id: c.osmId,
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
          possible_matches: report.possibleMatches.map((m) => ({
            location_id: m.locationId,
            existing_name: m.existingName,
            existing_address: m.existingAddress,
            existing_status: m.existingStatus,
            geoapify_place_id: m.geoapifyPlaceId,
            osm_type: m.osmType,
            osm_id: m.osmId,
            matched_name: m.matchedName,
            matched_address: m.matchedAddress,
            lat: m.lat,
            lng: m.lng,
            confidence_percent: m.confidencePercent,
          })),
          refreshed: report.refreshed,
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
          typeof item.geoapify_place_id !== "string" ||
          !item.geoapify_place_id ||
          typeof item.name !== "string" ||
          !item.name ||
          typeof item.lat !== "number" ||
          typeof item.lng !== "number" ||
          typeof item.address !== "string" ||
          !LOCATION_CLASSIFICATIONS.includes(item.classification)
        ) {
          res.status(400).json({
            error:
              "each classification requires geoapify_place_id, name, lat, lng, address, and a valid classification",
          });
          return;
        }
        if (item.classification === "business" && typeof item.category_id !== "string") {
          res.status(400).json({ error: "category_id is required to classify as a business" });
          return;
        }
      }

      try {
        const result = await commitLocationReview(
          req.params.id,
          classifications.map((item) => ({
            geoapifyPlaceId: item.geoapify_place_id,
            osmType: typeof item.osm_type === "string" ? item.osm_type : null,
            osmId: typeof item.osm_id === "number" ? item.osm_id : null,
            name: item.name,
            lat: item.lat,
            lng: item.lng,
            address: item.address,
            classification: item.classification,
            categoryId: item.category_id,
          })),
          removals.map((item) => ({ id: item.id })),
          getPlacesRepository(),
          getLocationRepository(),
          getCachedPlacesClient()
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

  // Missing-location investigation (BACKLOG.md Ref 96) -- a single
  // admin-triggered Geoapify Geocoding search for one venue name/address, to
  // diagnose why a reported venue isn't turning up through the normal
  // category-search-based review/sync flow (which is restricted to the
  // taxonomy's configured tags, and scoped strictly to the boundary
  // polygon). Geocoding search has neither restriction, so it can surface a
  // place the category search never would, along with why it looks
  // "missing" -- outside the boundary, or already on record under a
  // different name. Costs one
  // Places API call per search, not a full tile sweep, so it isn't
  // cooldown-gated like .../locations/review -- an admin chasing one venue
  // needs to retry different phrasings freely.
  //
  // Registered ahead of the generic GET .../locations/:locationId route
  // below for the same reason .../locations/review is -- see that route's
  // comment.
  app.get(
    "/neighborhood-admin/neighborhoods/:id/locations/investigate",
    neighborhoodAdminGate,
    async (req, res) => {
      const query = req.query.query;
      if (typeof query !== "string" || !query.trim()) {
        res.status(400).json({ error: "query is required" });
        return;
      }

      try {
        const boundaryResult = await getNeighborhoodBoundary(req.params.id, getNeighborhoodRepository());
        if (boundaryResult.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }

        const [categories, existingLocations] = await Promise.all([
          getPlacesRepository().listCategories(),
          listLocationListItemsForNeighborhood(req.params.id, getLocationRepository()),
        ]);

        const candidates = await investigateMissingLocation(
          query,
          { lat: boundaryResult.boundary.centerLat, lng: boundaryResult.boundary.centerLng },
          boundaryResult.boundary.boundaryGeojson,
          getCachedPlacesClient(),
          categories,
          existingLocations.map((l) => ({ geoapifyPlaceId: l.geoapify_place_id, name: l.name }))
        );

        res.json({
          query,
          candidates: candidates.map((c) => ({
            geoapify_place_id: c.raw.placeId,
            name: c.name,
            address: c.address,
            lat: c.lat,
            lng: c.lng,
            categories: c.raw.categories,
            suggested_category_id: c.suggestedCategoryId,
            suggested_category_name: c.suggestedCategoryName,
            already_known_as: c.alreadyKnownAs,
            inside_boundary: c.insideBoundary,
          })),
        });
      } catch (err) {
        console.error(
          `GET /neighborhood-admin/neighborhoods/${req.params.id}/locations/investigate failed:`,
          err
        );
        res.status(500).json({ error: "Failed to investigate location" });
      }
    }
  );

  // One-click "this Places result is real, add it as a business" shortcut
  // (BACKLOG.md Ref 96) -- reuses commitLocationReview's own "business"
  // classification path rather than calling placesRepository.upsertVenue
  // directly, so a manually-added-from-investigation venue goes through
  // exactly the same creation logic (and the same per-item failure handling)
  // as a bulk-review "business" classification. Registered ahead of the
  // generic route below for the same reason as GET .../investigate above.
  app.post(
    "/neighborhood-admin/neighborhoods/:id/locations/investigate/add",
    neighborhoodAdminGate,
    async (req, res) => {
      const { geoapify_place_id, name, lat, lng, address, category_id } = req.body ?? {};
      if (
        typeof geoapify_place_id !== "string" ||
        !geoapify_place_id ||
        typeof name !== "string" ||
        !name ||
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        typeof address !== "string" ||
        !address ||
        typeof category_id !== "string" ||
        !category_id
      ) {
        res
          .status(400)
          .json({ error: "geoapify_place_id, name, lat, lng, address, and category_id are required" });
        return;
      }

      try {
        const result = await commitLocationReview(
          req.params.id,
          [
            {
              geoapifyPlaceId: geoapify_place_id,
              name,
              lat,
              lng,
              address,
              classification: "business",
              categoryId: category_id,
            },
          ],
          [],
          getPlacesRepository(),
          getLocationRepository(),
          getCachedPlacesClient()
        );
        if (result.failed.length > 0) {
          res.status(500).json({ error: result.failed[0].error });
          return;
        }
        res.status(201).json({ created_businesses: result.createdBusinesses });
      } catch (err) {
        console.error(
          `POST /neighborhood-admin/neighborhoods/${req.params.id}/locations/investigate/add failed:`,
          err
        );
        res.status(500).json({ error: "Failed to add location" });
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
      const { name, description, lat, lng, address } = req.body ?? {};
      if (name !== undefined && (typeof name !== "string" || !name)) {
        res.status(400).json({ error: "name must be a non-empty string" });
        return;
      }
      if (description !== undefined && typeof description !== "string") {
        res.status(400).json({ error: "description must be a string" });
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
          { name, description, lat, lng, address },
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
      const { kind, category_id } = req.body ?? {};
      if (kind !== "business" && kind !== "poi") {
        res.status(400).json({ error: "kind must be 'business' or 'poi'" });
        return;
      }

      try {
        const result = await switchLocationKindForNeighborhood(
          req.params.id,
          req.params.locationId,
          kind,
          { categoryId: category_id },
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

  // ---------------------------------------------------------------------
  // Reassign a location's Geoapify place ID (BACKLOG.md Ref 114) -- a
  // small, permanent admin capability originally split out of the now-
  // deleted disposable geoapify-migration tool (Phase 5) ahead of that
  // tool's Phase 8 teardown. Kept because the need for it doesn't end with
  // the migration: Geoapify's own place IDs aren't as stable as assumed
  // (live-verified -- "Kipos Greek" churned to a new ID after its OSM name
  // tag was simply edited), and a real venue can also just not be in OSM
  // yet at all ("Stevie's Famous Phinney Ridge" -- confirmed absent from
  // reverse geocode, text search, and a category sweep alike), needing a
  // manual fix whenever OSM data catches up later. Three-part shape
  // (reverse-geocode suggestion, free-text search fallback, explicit
  // reassign), each carrying distance_meters from the location's own
  // stored coordinates -- a distance-blind search is exactly how "Kipos
  // Greek" got attached to a same-named restaurant 2,500+ miles away in
  // Chapel Hill, NC, before this guardrail existed.
  app.get(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId/reassign-reverse-geocode",
    neighborhoodAdminGate,
    async (req, res) => {
      try {
        const result = await getLocationForNeighborhood(req.params.id, req.params.locationId, getLocationRepository());
        if (result.status === "not_found") {
          res.status(404).json({ error: "Location not found" });
          return;
        }
        if (result.location.lat === null || result.location.lng === null) {
          res.json({ candidates: [] });
          return;
        }

        const locationPoint = { lat: result.location.lat, lng: result.location.lng };
        const candidates = await getCachedPlacesClient().reverseGeocode(locationPoint);

        res.json({
          candidates: candidates.map((c) => ({
            geoapify_place_id: c.placeId,
            name: c.name,
            address: c.formattedAddress,
            lat: c.location.lat,
            lng: c.location.lng,
            distance_meters: Math.round(haversineMeters(locationPoint, c.location)),
          })),
        });
      } catch (err) {
        console.error(
          `GET /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId}/reassign-reverse-geocode failed:`,
          err
        );
        res.status(500).json({ error: "Failed to reverse geocode location" });
      }
    }
  );

  app.get(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId/reassign-search",
    neighborhoodAdminGate,
    async (req, res) => {
      const query = req.query.query;
      if (typeof query !== "string" || !query.trim()) {
        res.status(400).json({ error: "query is required" });
        return;
      }

      try {
        const locationResult = await getLocationForNeighborhood(req.params.id, req.params.locationId, getLocationRepository());
        if (locationResult.status === "not_found") {
          res.status(404).json({ error: "Location not found" });
          return;
        }

        const boundaryResult = await getNeighborhoodBoundary(req.params.id, getNeighborhoodRepository());
        if (boundaryResult.status === "not_found") {
          res.status(404).json({ error: "Neighborhood not found" });
          return;
        }

        const referencePoint =
          locationResult.location.lat !== null && locationResult.location.lng !== null
            ? { lat: locationResult.location.lat, lng: locationResult.location.lng }
            : { lat: boundaryResult.boundary.centerLat, lng: boundaryResult.boundary.centerLng };

        const categories = await getPlacesRepository().listCategories();
        const candidates = await investigateMissingLocation(
          query,
          referencePoint,
          boundaryResult.boundary.boundaryGeojson,
          getCachedPlacesClient(),
          categories,
          []
        );

        res.json({
          query,
          candidates: candidates.map((c) => ({
            geoapify_place_id: c.raw.placeId,
            name: c.name,
            address: c.address,
            lat: c.lat,
            lng: c.lng,
            distance_meters: Math.round(haversineMeters(referencePoint, { lat: c.lat, lng: c.lng })),
          })),
        });
      } catch (err) {
        console.error(
          `GET /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId}/reassign-search failed:`,
          err
        );
        res.status(500).json({ error: "Failed to search for a place to reassign" });
      }
    }
  );

  app.post(
    "/neighborhood-admin/neighborhoods/:id/locations/:locationId/reassign-place-id",
    neighborhoodAdminGate,
    async (req, res) => {
      const { geoapify_place_id, osm_type, osm_id } = req.body ?? {};
      if (typeof geoapify_place_id !== "string" || !geoapify_place_id) {
        res.status(400).json({ error: "geoapify_place_id is required" });
        return;
      }

      try {
        const categories = await getPlacesRepository().listCategories();
        const result = await reassignLocationIdentityForNeighborhood(
          req.params.id,
          req.params.locationId,
          {
            geoapifyPlaceId: geoapify_place_id,
            // Present when the caller is Import's "Possible matches" (which
            // already has OSM data from its own Places API search -- see
            // Venue.osm_type's comment); absent from the standalone Reassign
            // Place ID panel, which resolves it server-side via Place
            // Details instead (reassignLocationIdentityForNeighborhood).
            osmType: typeof osm_type === "string" ? osm_type : null,
            osmId: typeof osm_id === "number" ? osm_id : null,
          },
          getLocationRepository(),
          getCachedPlacesClient(),
          categories
        );
        if (result.status === "not_found") {
          res.status(404).json({ error: "Location not found" });
          return;
        }
        if (result.status === "conflict") {
          res.status(409).json({
            error: result.conflictingLocationName
              ? `This Geoapify place is already attached to "${result.conflictingLocationName}" in this neighborhood -- these look like duplicate locations. Hide or remove one, then try again.`
              : "This Geoapify place is already attached to another location in this neighborhood -- these look like duplicate locations. Hide or remove one, then try again.",
          });
          return;
        }
        res.json(result.location);
      } catch (err) {
        console.error(
          `POST /neighborhood-admin/neighborhoods/${req.params.id}/locations/${req.params.locationId}/reassign-place-id failed:`,
          err
        );
        res.status(500).json({ error: "Failed to reassign place id" });
      }
    }
  );
  // ---------------------------------------------------------------------

  return app;
}
