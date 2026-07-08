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
    <nav className="flex flex-wrap gap-2 text-sm">
      {TABS.map((tab) => {
        const href = `/neighborhoods/${slug}${tab.href}`;
        const isActive = pathname === href;
        return (
          <a
            key={tab.href}
            href={href}
            className={`rounded-md px-3 py-1 ${
              isActive
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "border border-black/[.08] text-black dark:border-white/[.145] dark:text-zinc-50"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
