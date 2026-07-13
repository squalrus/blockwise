"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "../../TabNav";

const TABS = [
  { key: "", label: "Happening now" },
  { key: "/activity", label: "Recent activity" },
  { key: "/events", label: "Upcoming events" },
  { key: "/locations", label: "Locations" },
  { key: "/challenges", label: "Challenges" },
];

// BACKLOG.md Ref 44: subnav tab bar, mirroring the tab nav in
// /neighborhood-admin/[neighborhoodSlug]/layout.tsx. Split out as its own
// client component (rather than making the whole layout a client component)
// since usePathname is the only client-only piece of the shared chrome.
//
// Renders via the shared TabNav (also used by the account page) with
// getHref, so tab switches stay client-side navigations -- Next.js
// prefetches each tab's RSC payload in the background and swaps content in
// place instead of doing a full browser page load, which is both faster
// and avoids a blank-page flash. TabNav's Link uses scroll={false}, which
// additionally skips the router's default scroll-to-top on navigation,
// since jumping to top on every tab click reads as a full page reload even
// when it isn't one.
export function NeighborhoodTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const activeKey = TABS.find((tab) => pathname === `/neighborhoods/${slug}${tab.key}`)?.key ?? "";

  return <TabNav items={TABS} activeKey={activeKey} getHref={(key) => `/neighborhoods/${slug}${key}`} />;
}
