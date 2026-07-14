"use client";

import { usePathname } from "next/navigation";
import { AccountNav } from "./AccountNav";
import { Footer } from "./Footer";

// The neighborhood-admin dashboard for a specific neighborhood
// (/neighborhood-admin/[slug]/*) is a standalone sidebar shell with its own
// nav (docs/url-map.md, BACKLOG.md Ref 31 "SimCity-style redesign") -- it
// supplies its own "back" link and branding, so the site's AccountNav/Footer
// would be redundant chrome on top of chrome. The admin *list* page
// (/neighborhood-admin) and the create-neighborhood page (/neighborhood-admin/new)
// are plain utility pages and keep the normal site chrome.
function isStandaloneAdminShell(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "neighborhood-admin" && segments.length >= 2 && segments[1] !== "new";
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
