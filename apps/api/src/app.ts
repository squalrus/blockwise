import express from "express";
import type {
  AccountType,
  BusinessClaimContactMethod,
  BusinessClaimStatus,
  HealthCheckResponse,
} from "@blockwise/types";
import { requireAdmin } from "./admin/requireAdmin";
import { completeLogin, completeSignup, promoteToBusiness, toAppUser } from "./auth/auth";
import { attachOptionalAuthUser, requireAuthUser, requireBusinessAccount } from "./auth/requireAuthUser";
import { SupabaseAuthRepository } from "./auth/supabaseRepository";
import { verifyAccessToken } from "./auth/verifyToken";
import { performCheckin } from "./checkins/checkin";
import { SupabaseCheckinRepository } from "./checkins/supabaseRepository";
import { listClaims, reviewClaim, submitClaim } from "./claims/claims";
import { SupabaseClaimRepository } from "./claims/supabaseRepository";
import { addFavorite, getFavoriteStatus, removeFavorite } from "./favorites/favorite";
import { SupabaseFavoriteRepository } from "./favorites/supabaseRepository";
import { LivePlacesClient, type PlaceDetailsClient } from "./places/client";
import { MockPlacesClient } from "./places/mockClient";
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

export function createApp() {
  const app = express();

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

  // README §5: claim submission is public; verification is manual/admin
  // reviewed (no SMS/email provider wired in yet) via the /admin/claims
  // routes below. Authentication is optional here (attachOptionalAuthUser)
  // rather than required -- a signed-in business account gets its claim
  // auto-linked (see claimed_by_user_id / GET /business/venues below), but
  // the anonymous contact-info-only path still works unchanged.
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
            claimedByUserId: req.appUser?.accountType === "business" ? req.appUser.id : null,
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

  app.get("/admin/claims", requireAdmin, async (req, res) => {
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

  app.post("/admin/claims/:id/approve", requireAdmin, reviewHandler("approve"));
  app.post("/admin/claims/:id/reject", requireAdmin, reviewHandler("reject"));

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
      res.status(200).json(toAppUser(user));
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
      res.json(toAppUser(result.user));
    } catch (err) {
      console.error("POST /auth/complete-login failed:", err);
      res.status(500).json({ error: "Failed to complete login" });
    }
  });

  app.get("/auth/me", requireAuthUser(getSupabaseClient, getAuthRepository), (req, res) => {
    res.json(toAppUser(req.appUser!));
  });

  // Any signed-in account can upgrade itself to a business account -- there's
  // no separate business signup path, just this account_type flip in place.
  app.post(
    "/auth/promote-to-business",
    requireAuthUser(getSupabaseClient, getAuthRepository),
    async (req, res) => {
      try {
        const user = await promoteToBusiness(req.appUser!, getAuthRepository());
        res.json(toAppUser(user));
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

  return app;
}
