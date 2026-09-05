import { ENVIRONMENT_LABEL } from "@/lib/siteUrl";

// The site host and the Supabase project it talks to are configured
// independently (separate env vars) and can drift -- e.g. local dev
// accidentally pointed at prod's database while still showing "localhost".
// Surfacing the actual connected project ref here (from the same
// NEXT_PUBLIC_SUPABASE_URL already exposed to the browser for Auth, see
// lib/supabaseClient.ts) catches that mismatch, which ENVIRONMENT_LABEL
// alone can't.
const supabaseProjectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]
  : "unset";

// Sits above SiteChrome in layout.tsx so it shows on every page, including
// the standalone admin shells (docs/plans/20260905-dev-environment-plan.md)
// -- a constant visual reminder that app-dev.tryspored.com (or any other
// non-production deploy) isn't touching real user data. Deliberately checks
// ENVIRONMENT_LABEL rather than IS_PRODUCTION: the latter treats local dev
// as production (SITE_URL's fallback, harmless for robots.ts since nothing
// crawls localhost), which would wrongly hide this banner there too.
export function NonProductionBanner() {
  if (ENVIRONMENT_LABEL === "app.tryspored.com") return null;

  return (
    <div className="shrink-0 bg-brand-amber px-4 py-1.5 text-center text-xs font-bold text-on-accent">
      Non-production environment ({ENVIRONMENT_LABEL}, Supabase: {supabaseProjectRef}) — not real
      user data
    </div>
  );
}
