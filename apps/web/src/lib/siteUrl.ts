// This app's own public URL (app.tryspored.com), for metadataBase/canonical/
// OG tags and the generated sitemap/robots. `process.env.URL` is Netlify's
// auto-injected production site URL (same pattern as lib/api.ts's API_URL).
export const SITE_URL = process.env.URL ?? "https://app.tryspored.com";
