"use client";

import { usePathname } from "next/navigation";
import { TabNav, type TabNavItem } from "../TabNav";

const BASE_TABS: TabNavItem[] = [
  { key: "", label: "Spore Feed" },
  { key: "/favorites", label: "Favorites" },
  { key: "/badges", label: "Badges" },
  { key: "/collection", label: "Collection" },
  { key: "/challenges", label: "Challenges" },
  { key: "/neighbors", label: "Neighbors" },
  { key: "/activity", label: "My Activity" },
];

// Route-driven tab bar for /account/*, mirroring
// /neighborhoods/[slug]/NeighborhoodTabs.tsx -- each tab is its own page
// (page.tsx = Spore Feed, favorites/, badges/, collection/, challenges/,
// neighbors/, activity/) so it's directly linkable and only fetches what it
// needs. unrevealedCollectionCount and pendingNeighborRequestCount come from
// the (tabs)/layout.tsx's already-fetched /me/collection and /me/connections
// data (BACKLOG.md Ref 98 follow-up) rather than a second fetch here, since
// the summary card needs those same lists anyway.
export function AccountTabs({
  unrevealedCollectionCount = 0,
  pendingNeighborRequestCount = 0,
}: {
  unrevealedCollectionCount?: number;
  pendingNeighborRequestCount?: number;
}) {
  const pathname = usePathname();
  const badgeCounts: Record<string, number> = {
    "/collection": unrevealedCollectionCount,
    "/neighbors": pendingNeighborRequestCount,
  };
  const tabs: TabNavItem[] = BASE_TABS.map((tab) =>
    badgeCounts[tab.key] > 0
      ? {
          ...tab,
          badge: (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[11px] font-extrabold text-on-accent">
              {badgeCounts[tab.key]}
            </span>
          ),
        }
      : tab
  );
  const activeKey = tabs.find((tab) => pathname === `/account${tab.key}`)?.key ?? "";

  return <TabNav items={tabs} activeKey={activeKey} getHref={(key) => `/account${key}`} />;
}
