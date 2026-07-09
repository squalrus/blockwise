"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Leaderboard" },
  { href: "/challenges", label: "Challenges" },
  { href: "/events", label: "Upcoming events" },
  { href: "/pois", label: "Points of interest" },
  { href: "/venues", label: "Venues" },
];

// BACKLOG.md Ref 44: subnav tab bar, mirroring the tab nav in
// /neighborhood-admin/[neighborhoodSlug]/layout.tsx. Split out as its own
// client component (rather than making the whole layout a client component)
// since usePathname is the only client-only piece of the shared chrome.
export function NeighborhoodTabs({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 text-sm">
      {TABS.map((tab) => {
        const href = `/neighborhoods/${slug}${tab.href}`;
        const isActive = pathname === href;
        return (
          <a
            key={tab.href}
            href={href}
            className={`shrink-0 rounded-full px-4 py-2 font-extrabold whitespace-nowrap ${
              isActive
                ? "bg-foreground text-ink"
                : "bg-card-alt text-muted"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
