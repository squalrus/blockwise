"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Happening now" },
  { href: "/activity", label: "Recent activity" },
  { href: "/events", label: "Upcoming events" },
  { href: "/locations", label: "Locations" },
  { href: "/challenges", label: "Challenges" },
];

// BACKLOG.md Ref 44: subnav tab bar, mirroring the tab nav in
// /neighborhood-admin/[neighborhoodSlug]/layout.tsx. Split out as its own
// client component (rather than making the whole layout a client component)
// since usePathname is the only client-only piece of the shared chrome.
//
// Uses next/link (not a plain <a>) so tab switches are client-side
// navigations -- Next.js prefetches each tab's RSC payload in the
// background and swaps content in place instead of doing a full
// browser page load, which is both faster and avoids a blank-page flash.
// scroll={false} additionally skips the router's default scroll-to-top on
// navigation, since jumping to top on every tab click reads as a full page
// reload even when it isn't one.
export function NeighborhoodTabs({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 text-sm">
      {TABS.map((tab) => {
        const href = `/neighborhoods/${slug}${tab.href}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            scroll={false}
            className={`shrink-0 rounded-full px-4 py-2 font-extrabold whitespace-nowrap ${
              isActive
                ? "bg-foreground text-ink"
                : "bg-card-alt text-muted"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
