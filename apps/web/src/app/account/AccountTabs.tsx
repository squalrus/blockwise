"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "../TabNav";

const TABS = [
  { key: "", label: "Spore Feed" },
  { key: "/favorites", label: "Favorites" },
  { key: "/badges", label: "Badges" },
  { key: "/challenges", label: "Challenges" },
  { key: "/neighbors", label: "Neighbors" },
  { key: "/activity", label: "My Activity" },
];

// Route-driven tab bar for /account/*, mirroring
// /neighborhoods/[slug]/NeighborhoodTabs.tsx -- each tab is its own page
// (page.tsx = Spore Feed, favorites/, badges/, challenges/, neighbors/,
// activity/) so it's directly linkable and only fetches what it needs.
export function AccountTabs() {
  const pathname = usePathname();
  const activeKey = TABS.find((tab) => pathname === `/account${tab.key}`)?.key ?? "";

  return <TabNav items={TABS} activeKey={activeKey} getHref={(key) => `/account${key}`} />;
}
