// This app's own public URL (app.tryspored.com), for metadataBase/canonical/
// OG tags and the generated sitemap/robots. `process.env.URL` is Netlify's
// auto-injected production site URL (same pattern as lib/api.ts's API_URL).
export const SITE_URL = process.env.URL ?? "https://app.tryspored.com";

// False for any deployed site other than the real production one --
// app-dev.tryspored.com, Netlify deploy previews, etc. -- since those get a
// distinct Netlify-injected `URL`. Local dev has no `URL` at all, so SITE_URL
// falls back to the same string as production and this reads true there too;
// that's an accepted quirk (docs/plans/20260905-dev-environment-plan.md) --
// harmless for robots.ts, since nothing crawls localhost.
export const IS_PRODUCTION = SITE_URL === "https://app.tryspored.com";

// Unlike SITE_URL, reads the unfallen-back `process.env.URL` directly so
// local dev (no `URL` at all) is distinguishable from production (which
// SITE_URL's fallback otherwise makes look identical) -- used by
// NonProductionBanner.tsx to say *which* non-prod environment this is.
export const ENVIRONMENT_LABEL = process.env.URL
  ? new URL(process.env.URL).host
  : "localhost";
