"use client";

import { usePathname } from "next/navigation";
import { AccountNav } from "./AccountNav";
import { Footer } from "./Footer";

// The neighborhood-admin and business-admin dashboards
// (/admin/neighborhood/[slug]/*, /admin/business/[venueId]/*) are standalone
// sidebar shells with their own nav (docs/url-map.md, BACKLOG.md Ref 31
// "SimCity-style redesign") -- they supply their own "back" link and
// branding, so the site's AccountNav/Footer would be redundant chrome on top
// of chrome. The /admin landing page, /admin/category-taxonomy (separate
// requireAdmin role), and /admin/neighborhood/new are plain utility pages and
// keep the normal site chrome.
function isStandaloneAdminShell(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "admin") return false;
  if (segments[1] !== "neighborhood" && segments[1] !== "business") return false;
  if (segments.length < 3) return false;
  return !(segments[1] === "neighborhood" && segments[2] === "new");
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const standalone = isStandaloneAdminShell(pathname);

  if (standalone) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  return (
    <>
      <AccountNav />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </>
  );
}
