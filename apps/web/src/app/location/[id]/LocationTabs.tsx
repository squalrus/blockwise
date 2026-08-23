"use client";

import { usePathname } from "next/navigation";
import type { VenueEnrichmentCache } from "@blockwise/types";
import { TabNav, type TabNavItem } from "../../TabNav";

// BACKLOG.md Ref 101 redesign: subnav tab bar for the location detail
// page's tabs, mirroring NeighborhoodTabs.tsx (route-driven via getHref, so
// tab switches stay client-side navigations). About/Reviews/Coupons/Events
// are each conditional -- unlike NeighborhoodTabs' always-6 list, a POI
// never has coupons/events, and About/Reviews depend on whether this
// location has any Google enrichment to show.
export function LocationTabs({
  locationId,
  isBusiness,
  enrichment,
}: {
  locationId: string;
  isBusiness: boolean;
  enrichment: VenueEnrichmentCache | null;
}) {
  const pathname = usePathname();

  const showAbout = isBusiness || Boolean(enrichment);
  const showReviews = Boolean(enrichment && (enrichment.rating != null || enrichment.reviews.length > 0));

  const tabs: TabNavItem[] = [{ key: "", label: "Spore Feed" }];
  if (showAbout) tabs.push({ key: "/about", label: "About" });
  if (showReviews) tabs.push({ key: "/reviews", label: "Reviews" });
  if (isBusiness) tabs.push({ key: "/coupons", label: "Coupons" });
  if (isBusiness) tabs.push({ key: "/events", label: "Events" });
  tabs.push({ key: "/leaderboard", label: "Leaderboard" });

  const activeKey = tabs.find((t) => pathname === `/location/${locationId}${t.key}`)?.key ?? "";

  return <TabNav items={tabs} activeKey={activeKey} getHref={(key) => `/location/${locationId}${key}`} />;
}
