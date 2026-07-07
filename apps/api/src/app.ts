import express from "express";
import type {
  AccountType,
  BusinessClaimContactMethod,
  BusinessClaimStatus,
  HealthCheckResponse,
  NeighborhoodDashboardSummary,
  NeighborhoodProfile,
  NeighborhoodSummary,
  VenueDashboardSummary,
} from "@blockwise/types";
import { requireAdmin } from "./admin/requireAdmin";
import { requireNeighborhoodAdmin } from "./admin/requireNeighborhoodAdmin";
import { SupabaseNeighborhoodAdminRepository } from "./admin/supabaseRepository";
import { createAnnouncement, listAnnouncementsForVenue } from "./announcements/announcements";
import { SupabaseAnnouncementRepository } from "./announcements/supabaseRepository";
import { completeLogin, completeSignup, promoteToBusiness, toAppUser } from "./auth/auth";
import { attachOptionalAuthUser, requireAuthUser, requireBusinessAccount } from "./auth/requireAuthUser";
import { SupabaseAuthRepository } from "./auth/supabaseRepository";
import { verifyAccessToken } from "./auth/verifyToken";
import { performCheckin } from "./checkins/checkin";
import { SupabaseCheckinRepository } from "./checkins/supabaseRepository";
import { listClaims, reviewClaim, submitClaim } from "./claims/claims";
import { requireVenueOwner } from "./claims/requireVenueOwner";
import { SupabaseClaimRepository } from "./claims/supabaseRepository";
import {
  listAssignableCategories,
  listVenueCategoryMappings,
  reassignVenueCategory,
} from "./categoryMapping/categoryMapping";
import { SupabaseCategoryMappingRepository } from "./categoryMapping/supabaseRepository";
import {
  createEvent,
  createEventForNeighborhood,
  listEventsForNeighborhood,
  listEventsForVenue,
} from "./events/events";
import { SupabaseEventRepository } from "./events/supabaseRepository";
import { addFavorite, getFavoriteStatus, removeFavorite } from "./favorites/favorite";
import { SupabaseFavoriteRepository } from "./favorites/supabaseRepository";
import {
  getNeighborhoodById,
  getNeighborhoodBySlug,
  updateNeighborhoodDescription,
} from "./neighborhoods/neighborhoods";
import { SupabaseNeighborhoodRepository } from "./neighborhoods/supabaseRepository";
import {
  joinNeighborhood,
  leaveNeighborhood,
  listMembershipsForUser,
  setHomeNeighborhood,
} from "./neighborhoodMembers/neighborhoodMembers";
import { SupabaseNeighborhoodMemberRepository } from "./neighborhoodMembers/supabaseRepository";
import { LivePlacesClient, type PlaceDetailsClient } from "./places/client";
import { MockPlacesClient } from "./places/mockClient";
import { createNeighborhoodPoi, listPoisForNeighborhood } from "./pois/pois";
import { SupabasePoiRepository } from "./pois/supabaseRepository";
import { getSupabaseClient } from "./supabase";
import { getVenueDetailWithFreshEnrichment } from "./venues/enrichment";
import { SupabaseVenueDetailRepository } from "./venues/supabaseDetailRepository";

const CONTACT_METHODS: BusinessClaimContactMethod[] = ["phone", "email", "domain"];
const CLAIM_STATUSES: BusinessClaimStatus[] = ["pending", "approved", "rejected"];
const ACCOUNT_TYPES: AccountType[] = ["consumer", "business"];

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
// falls back to mock Place Details when no API key is configured, e.g. local dev.
function getPlacesClient(): PlaceDetailsClient {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  return apiKey ? new LivePlacesClient(apiKey) : new MockPlacesClient();
}

// Constructed lazily (on first request) rather than at createApp() time --
// getSupabaseClient() throws if SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY aren't
// set, and building it eagerly would crash every route including /health
// the moment the function cold-starts with a misconfigured environment.
let venueRepository: SupabaseVenueDetailRepository | undefined;
function getVenueRepository(): SupabaseVenueDetailRepository {
  venueRepository ??= new SupabaseVenueDetailRepository(getSupabaseClient());
  return venueRepository;
}

let placesClient: PlaceDetailsClient | undefined;
function getCachedPlacesClient(): PlaceDetailsClient {
  placesClient ??= getPlacesClient();
  return placesClient;
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

let categoryMappingRepository: SupabaseCategoryMappingRepository | undefined;
function getCategoryMappingRepository(): SupabaseCategoryMappingRepository {
  categoryMappingRepository ??= new SupabaseCategoryMappingRepository(getSupabaseClient());
  return categoryMappingRepository;
}

let neighborhoodAdminRepository: SupabaseNeighborhoodAdminRepository | undefined;
function getNeighborhoodAdminRepository(): SupabaseNeighborhoodAdminRepository {
  neighborhoodAdminRepository ??= new SupabaseNeighborhoodAdminRepository(getSupabaseClient());
  return neighborhoodAdminRepository;
}

let announcementRepository: SupabaseAnnouncementRepository | undefined;
function getAnnouncementRepository(): SupabaseAnnouncementRepository {
  announcementRepository ??= new SupabaseAnnouncementRepository(getSupabaseClient());
  return announcementRepository;
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

let poiRepository: SupabasePoiRepository | undefined;
function getPoiRepository(): SupabasePoiRepository {
  poiRepository ??= new SupabasePoiRepository(getSupabaseClient());
  return poiRepository;
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

  app.get("/venues", async (_req, res) => {
    try {
      const venues = await getVenueRepository().listVenues();
      res.json(venues);
    } catch (err) {
      console.error("GET /venues failed:", err);
      res.status(500).json({ error: "Failed to list venues" });
    }
  });

  app.get("/venues/:id", async (req, res) => {
    try {
      const venue = await getVenueDetailWithFreshEnrichment(
        req.params.id,
        getVenueRepository(),
        getCachedPlacesClient()
      );
      if (!venue) {
        res.status(404).json({ error: "Venue not found" });
        return;
      }
      res.json(venue);
    } catch (err) {
      console.error(`GET /venues/${req.params.id} failed:`, err);
      res.status(500).json({ error: "Failed to load venue" });
    }
  });

  // Proxies the cached Google photo reference through the server so the
  // Places API key (needed to build the actual media URL) never reaches
  // the browser -- see PlaceDetailsClient.fetchPhotoMedia.
  app.get("/venues/:id/photo", async (req, res) => {
    try {
      const photoReference = await getVenueRepository().getEnrichmentPhotoReference(
        req.params.id
      );
      if (!photoReference) {
        res.status(404).end();
        return;
      }
      const media = await getCachedPlacesClient().fetchPhotoMedia(photoReference);
      res.setHeader("Content-Type", media.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(media.data));
    } catch (err) {
      console.error(`GET /venues/${req.params.id}/photo failed:`, err);
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
  // profile"): every active neighborhood in the network, for the "all
  // neighborhoods" browse/join list. Authentication is optional (mirrors
  // POST /venues/:id/claims above) -- signed-in visitors get `joined` flagged
  // per neighborhood so the landing page can show "Joined" vs. a join button;
  // anonymous visitors just see the full list with joined always false.
  app.get(
    "/neighborhoods",
    attachOptionalAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const neighborhoods = await getNeighborhoodRepository().listActive();
        const joinedIds = req.appUser
          ? new Set(
              (await listMembershipsForUser(req.appUser.id, getNeighborhoodMemberRepository())).map(
                (m) => m.neighborhood_id
              )
            )
          : new Set<string>();

        const summaries: NeighborhoodSummary[] = neighborhoods.map((n) => ({
          id: n.id,
          name: n.name,
          slug: n.slug,
          city: n.city,
          state: n.state,
          joined: joinedIds.has(n.id),
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

      const pois = await listPoisForNeighborhood(neighborhood.id, getPoiRepository());
      const profile: NeighborhoodProfile = {
        id: neighborhood.id,
        name: neighborhood.name,
        slug: neighborhood.slug,
        description: neighborhood.description,
        city: neighborhood.city,
        state: neighborhood.state,
        pois,
      };
      res.json(profile);
    } catch (err) {
      console.error(`GET /neighborhoods/${req.params.slug} failed:`, err);
      res.status(500).json({ error: "Failed to load neighborhood" });
    }
  });

  app.get("/neighborhoods/:id/events", async (req, res) => {
    try {
      const events = await listEventsForNeighborhood(req.params.id, getEventRepository());
      res.json(events);
    } catch (err) {
      console.error(`GET /neighborhoods/${req.params.id}/events failed:`, err);
      res.status(500).json({ error: "Failed to list events" });
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
  app.post("/venues/:id/checkins", async (req, res) => {
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
          res.status(404).json({ error: "Venue not found" });
          return;
        case "too_far":
          res
            .status(400)
            .json({ error: "Too far from venue to check in", distance_meters: result.distanceMeters });
          return;
        case "cooldown":
          res
            .status(429)
            .json({ error: "Check-in cooldown still active", retry_at: result.retryAt });
          return;
        case "created":
          res.status(201).json(result.checkin);
          return;
      }
    } catch (err) {
      console.error(`POST /venues/${req.params.id}/checkins failed:`, err);
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

  app.get("/admin/claims", adminGate, async (req, res) => {
    const status = req.query.status;
    if (status !== undefined && !CLAIM_STATUSES.includes(status as BusinessClaimStatus)) {
      res.status(400).json({ error: `status must be one of ${CLAIM_STATUSES.join(", ")}` });
      return;
    }

    try {
      const claims = await listClaims(getClaimRepository(), status as BusinessClaimStatus | undefined);
      res.json(claims);
    } catch (err) {
      console.error("GET /admin/claims failed:", err);
      res.status(500).json({ error: "Failed to list claims" });
    }
  });

  const reviewHandler = (decision: "approve" | "reject") => async (req: express.Request, res: express.Response) => {
    const { reviewed_note } = req.body ?? {};
    if (reviewed_note !== undefined && typeof reviewed_note !== "string") {
      res.status(400).json({ error: "reviewed_note must be a string" });
      return;
    }

    try {
      const result = await reviewClaim(
        req.params.id,
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
      console.error(`POST /admin/claims/${req.params.id}/${decision} failed:`, err);
      res.status(500).json({ error: `Failed to ${decision} claim` });
    }
  };

  app.post("/admin/claims/:id/approve", adminGate, reviewHandler("approve"));
  app.post("/admin/claims/:id/reject", adminGate, reviewHandler("reject"));

  // Category mapping admin tool (BACKLOG.md): manual override for venues the
  // sync's category-normalization step (README §1.4 step 3) mapped wrong.
  app.get("/admin/venues", adminGate, async (req, res) => {
    const search = req.query.search;
    if (search !== undefined && typeof search !== "string") {
      res.status(400).json({ error: "search must be a string" });
      return;
    }

    try {
      const venues = await listVenueCategoryMappings(getCategoryMappingRepository(), search);
      res.json(venues);
    } catch (err) {
      console.error("GET /admin/venues failed:", err);
      res.status(500).json({ error: "Failed to list venues" });
    }
  });

  app.get("/admin/categories", adminGate, async (_req, res) => {
    try {
      const categories = await listAssignableCategories(getCategoryMappingRepository());
      res.json(categories);
    } catch (err) {
      console.error("GET /admin/categories failed:", err);
      res.status(500).json({ error: "Failed to list categories" });
    }
  });

  app.patch("/admin/venues/:id/category", adminGate, async (req, res) => {
    const { category_id } = req.body ?? {};
    if (typeof category_id !== "string" || !category_id) {
      res.status(400).json({ error: "category_id is required" });
      return;
    }

    try {
      const result = await reassignVenueCategory(
        req.params.id,
        category_id,
        getCategoryMappingRepository()
      );

      switch (result.status) {
        case "venue_not_found":
          res.status(404).json({ error: "Venue not found" });
          return;
        case "invalid_category":
          res.status(400).json({ error: "category_id must reference an existing leaf category" });
          return;
        case "updated":
          res.json(result.venue);
          return;
      }
    } catch (err) {
      console.error(`PATCH /admin/venues/${req.params.id}/category failed:`, err);
      res.status(500).json({ error: "Failed to reassign category" });
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
      const isAdmin = await getNeighborhoodAdminRepository().isNeighborhoodAdmin(user.id);
      res.status(200).json(toAppUser(user, isAdmin));
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
      const isAdmin = await getNeighborhoodAdminRepository().isNeighborhoodAdmin(result.user.id);
      res.json(toAppUser(result.user, isAdmin));
    } catch (err) {
      console.error("POST /auth/complete-login failed:", err);
      res.status(500).json({ error: "Failed to complete login" });
    }
  });

  app.get("/auth/me", requireAuthUser(getSupabaseClient, getAuthRepository), async (req, res) => {
    const isAdmin = await getNeighborhoodAdminRepository().isNeighborhoodAdmin(req.appUser!.id);
    res.json(toAppUser(req.appUser!, isAdmin));
  });

  // Any signed-in account can upgrade itself to a business account -- there's
  // no separate business signup path, just this account_type flip in place.
  app.post(
    "/auth/promote-to-business",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const user = await promoteToBusiness(req.appUser!, getAuthRepository());
        const isAdmin = await getNeighborhoodAdminRepository().isNeighborhoodAdmin(user.id);
        res.json(toAppUser(user, isAdmin));
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
      const venue = await getVenueRepository().getVenueDetail(req.params.id);
      if (!venue) {
        res.status(404).json({ error: "Venue not found" });
        return;
      }

      const [followerCount, checkinCount, announcements, events] = await Promise.all([
        getFavoriteRepository().countFavoritesForVenue(req.params.id),
        getCheckinRepository().countCheckinsForVenue(req.params.id),
        listAnnouncementsForVenue(req.params.id, getAnnouncementRepository()),
        listEventsForVenue(req.params.id, getEventRepository()),
      ]);

      const summary: VenueDashboardSummary = {
        venue_id: venue.id,
        name: venue.name,
        address: venue.address,
        follower_count: followerCount,
        checkin_count: checkinCount,
        announcements,
        events,
      };
      res.json(summary);
    } catch (err) {
      console.error(`GET /business/venues/${req.params.id}/dashboard failed:`, err);
      res.status(500).json({ error: "Failed to load venue dashboard" });
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
  // :id to scope by; every route below it is gated by neighborhoodAdminGate,
  // scoped to req.params.id specifically.
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
          listPoisForNeighborhood(req.params.id, getPoiRepository()),
          listEventsForNeighborhood(req.params.id, getEventRepository()),
        ]);

        const summary: NeighborhoodDashboardSummary = {
          neighborhood_id: neighborhood.id,
          name: neighborhood.name,
          slug: neighborhood.slug,
          description: neighborhood.description,
          pois,
          events,
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

  app.post("/neighborhood-admin/neighborhoods/:id/pois", neighborhoodAdminGate, async (req, res) => {
    const { name, description, type } = req.body ?? {};
    if (typeof name !== "string" || !name || typeof type !== "string" || !type) {
      res.status(400).json({ error: "name and type are required" });
      return;
    }
    if (description !== undefined && typeof description !== "string") {
      res.status(400).json({ error: "description must be a string" });
      return;
    }

    try {
      const poi = await createNeighborhoodPoi(
        req.params.id,
        { name, description, type },
        getPoiRepository()
      );
      res.status(201).json(poi);
    } catch (err) {
      console.error(`POST /neighborhood-admin/neighborhoods/${req.params.id}/pois failed:`, err);
      res.status(500).json({ error: "Failed to create point of interest" });
    }
  });

  return app;
}
