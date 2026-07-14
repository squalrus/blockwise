import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

// "/" itself is excluded: it's a client-side redirect to /account or /login
// (see docs/url-map.md), not real content -- the marketing homepage that
// should be indexed lives at tryspored.com (apps/marketing) instead.
export default function robots(): MetadataRoute.Robots {
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
        "/business",
        "/business/",
        "/neighborhood-admin",
        "/neighborhood-admin/",
        "/admin/",
        "/dev/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
