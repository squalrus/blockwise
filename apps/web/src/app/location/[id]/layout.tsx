import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { VenueDetail } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { SITE_URL } from "@/lib/siteUrl";
import { ClaimBusinessForm } from "./ClaimBusinessForm";
import { FavoriteButton } from "./FavoriteButton";
import { LocationSummaryCard } from "./LocationSummaryCard";
import { LocationTabs } from "./LocationTabs";

export async function getLocation(id: string): Promise<VenueDetail | null> {
  const res = await fetch(apiUrl(`/locations/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load location ${id}: ${res.status}`);
  return (await res.json()) as VenueDetail;
}

// Next.js dedupes this against every other getLocation(id) call in the same
// render pass (same URL/options) via request memoization, so this and each
// tab page's own re-fetch don't cost extra round trips.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const location = await getLocation(id);
  if (!location) return {};

  const title = `${location.name} — ${location.neighborhood_name} — Spored`;
  const description =
    location.description ??
    location.enrichment?.editorial_summary ??
    `${location.name}${location.category_name ? `, ${location.category_name}` : ""} in ${location.neighborhood_name}.${location.address ? ` ${location.address}.` : ""}`;
  const hasPhoto = (location.enrichment?.photo_refs.length ?? 0) > 0;

  // Each tab page sets its own `alternates.canonical` for its own path
  // (mirroring /neighborhoods/[slug]'s layout+subnav split) -- deliberately
  // not set here, since a layout-level canonical would incorrectly point
  // every tab's distinct content back at the same URL.
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(hasPhoto ? { images: [`/api/locations/${location.id}/photo?index=0`] } : {}),
    },
  };
}

function locationJsonLd(location: VenueDetail): Record<string, unknown> | null {
  if (location.kind !== "business") return null;
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: location.name,
    url: `${SITE_URL}/location/${location.id}`,
    ...(location.address ? { address: location.address } : {}),
    ...(location.category_name ? { additionalType: location.category_name } : {}),
    ...(location.enrichment?.rating != null ? { aggregateRating: { "@type": "AggregateRating", ratingValue: location.enrichment.rating } } : {}),
  };
}

// BACKLOG.md Ref 101 redesign: shared chrome (back link, summary card, tab
// bar, claim form) for the location detail page's tabs -- Spore
// Feed (page.tsx, default)/About/Reviews/Coupons/Events/Leaderboard, each
// its own route (mirroring /neighborhoods/[slug]'s layout+subnav split, not
// /account's former in-page tab state) so a specific tab is directly
// linkable and only fetches the data it needs. Merged business/POI detail
// page (BACKLOG.md "POIs and venues managed almost the same") -- replaces
// the old separate /venues/:id and /pois/:id routes now that both kinds
// live in one table, branching on `location.kind` where the two differ.
export default async function LocationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const location = await getLocation(id);

  if (!location) notFound();

  const isBusiness = location.kind === "business";
  const jsonLd = locationJsonLd(location);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 font-sans sm:p-16">
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <Link
        href={`/neighborhoods/${location.neighborhood_slug}`}
        className="text-sm font-bold text-brand-purple hover:text-brand-orange"
      >
        ← {location.neighborhood_name}
      </Link>

      <LocationSummaryCard location={location} favoriteAction={<FavoriteButton venueId={location.id} />} />

      <LocationTabs locationId={location.id} isBusiness={isBusiness} enrichment={location.enrichment} />

      {children}

      {isBusiness && !location.claimed_by_business && <ClaimBusinessForm venueId={location.id} />}
    </div>
  );
}
