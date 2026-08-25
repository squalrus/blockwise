// Identifies which deployment logged a given error_log/request_log row --
// backs the Monitoring tab's domain filter (BACKLOG.md Ref 104 follow-up),
// so noisy local dev traffic can be filtered out from production issues.
//
// `URL` is Netlify's auto-injected primary site URL (same signal
// apps/web/src/lib/siteUrl.ts already uses for canonical/OG tags), and
// apps/api always runs as a Netlify Function *co-located within the same
// site* as its calling frontend (netlify.toml) -- app.tryspored.com's API
// instance only ever serves app.tryspored.com, a future dev.tryspored.com
// site would get its own separate co-located instance, and so on. That
// makes it a reliable per-deployment signal without needing the browser to
// report its own origin through the /api/* proxy (which would see the
// proxy's own Host, not the page's). Unset outside Netlify (plain `npm run
// dev`), where every request really is local.
export function getAppDomain(): string {
  const url = process.env.URL;
  if (!url) return "localhost";
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}
