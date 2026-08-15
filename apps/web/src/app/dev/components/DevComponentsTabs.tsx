"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "../../TabNav";

const TABS = [
  { key: "", label: "Profile card" },
  { key: "/neighborhood-card", label: "Neighborhood card" },
  { key: "/location-card", label: "Location card" },
  { key: "/place-list-item", label: "Venue row" },
];

// Mirrors NeighborhoodTabs.tsx -- each component section is its own route
// (dedicated URL, linkable/bookmarkable e.g. when asking someone to review a
// specific section) rather than in-page tab state.
export function DevComponentsTabs() {
  const pathname = usePathname();
  const activeKey = TABS.find((tab) => pathname === `/dev/components${tab.key}`)?.key ?? "";

  return <TabNav items={TABS} activeKey={activeKey} getHref={(key) => `/dev/components${key}`} />;
}
