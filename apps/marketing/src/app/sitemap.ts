import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

// Static route list -- apps/marketing is fully static (see docs/url-map.md),
// so unlike apps/web's sitemap this needs no data fetching. Add a route here
// whenever a new page.tsx is added under src/app.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/brand`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
