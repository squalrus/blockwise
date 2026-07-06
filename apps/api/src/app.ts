import express from "express";
import type { HealthCheckResponse } from "@blockwise/types";
import { LivePlacesClient, type PlaceDetailsClient } from "./places/client";
import { MockPlacesClient } from "./places/mockClient";
import { getSupabaseClient } from "./supabase";
import { getVenueDetailWithFreshEnrichment } from "./venues/enrichment";
import { SupabaseVenueDetailRepository } from "./venues/supabaseDetailRepository";

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

export function createApp() {
  const app = express();

  app.use((req, _res, next) => {
    req.url =
      req.url.replace(FUNCTION_PATH_PREFIX, "").replace(PUBLIC_PATH_PREFIX, "") || "/";
    next();
  });

  app.get("/health", (_req, res) => {
    const body: HealthCheckResponse = {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  });

  const venueRepository = new SupabaseVenueDetailRepository(getSupabaseClient());
  const placesClient = getPlacesClient();

  app.get("/venues", async (_req, res) => {
    try {
      const venues = await venueRepository.listVenues();
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
        venueRepository,
        placesClient
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
      const photoReference = await venueRepository.getEnrichmentPhotoReference(req.params.id);
      if (!photoReference) {
        res.status(404).end();
        return;
      }
      const media = await placesClient.fetchPhotoMedia(photoReference);
      res.setHeader("Content-Type", media.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(media.data));
    } catch (err) {
      console.error(`GET /venues/${req.params.id}/photo failed:`, err);
      res.status(502).json({ error: "Failed to load photo" });
    }
  });

  return app;
}
