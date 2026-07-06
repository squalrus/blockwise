import express from "express";
import type { HealthCheckResponse } from "@blockwise/types";

// Netlify invokes this function at /.netlify/functions/api/*, but the public
// redirect (see netlify.toml) fronts it at /api/*. Depending on the Netlify
// runtime version, either prefix can show up in req.url, so strip both before
// routing rather than depending on one exact behavior.
const FUNCTION_PATH_PREFIX = /^\/\.netlify\/functions\/[^/]+/;
const PUBLIC_PATH_PREFIX = /^\/api(?=\/|$)/;

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

  return app;
}
