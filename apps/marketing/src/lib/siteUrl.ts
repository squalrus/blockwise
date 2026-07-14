// This app's own public URL (tryspored.com), for metadataBase/canonical/OG
// tags and the generated sitemap/robots. `process.env.URL` is Netlify's
// auto-injected production site URL (same pattern as apps/web's lib/api.ts).
export const SITE_URL = process.env.URL ?? "https://tryspored.com";
