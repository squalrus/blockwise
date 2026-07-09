"use client";

import { usePathname } from "next/navigation";
import { AccountNav } from "./AccountNav";
import { Footer } from "./Footer";

// The homepage is a standalone marketing landing page with its own nav and
// footer baked into its design (see page.tsx) -- showing the app's hamburger
// AccountNav and version-number Footer on top of that would double up chrome.
// Every other route keeps the shared app nav/footer as-is.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <>
      {!isHome && <AccountNav />}
      <div className="flex flex-1 flex-col">{children}</div>
      {!isHome && <Footer />}
    </>
  );
}
