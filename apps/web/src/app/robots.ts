import type { MetadataRoute } from "next";
import { IS_PRODUCTION, SITE_URL } from "@/lib/siteUrl";

// "/" itself is excluded: it's a client-side redirect to /account or /login
// (see docs/url-map.md), not real content -- the marketing homepage that
// should be indexed lives at tryspored.com (apps/marketing) instead.
export default function robots(): MetadataRoute.Robots {
  // Non-production deploys (app-dev.tryspored.com, Netlify deploy previews,
  // etc.) shouldn't be crawled or indexed at all -- docs/plans/20260905-dev-
  // environment-plan.md, since Netlify's password-protection add-on requires
  // a paid plan and isn't in use.
  if (!IS_PRODUCTION) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/",
        "/login",
        "/signup",
        "/auth/",
        "/account",
        "/account/",
        "/checkin",
        "/admin",
        "/admin/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
