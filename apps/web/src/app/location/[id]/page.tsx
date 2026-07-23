import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Event, VenueDetail } from "@blockwise/types";
import { PoweredByGoogle } from "@blockwise/ui";
import { apiUrl } from "@/lib/api";
import { SITE_URL } from "@/lib/siteUrl";
import { EnrichmentAbout, EnrichmentPhotos, EnrichmentReviews } from "../../EnrichmentSection";
import { ClaimBusinessForm } from "./ClaimBusinessForm";
import { CouponsSection } from "./CouponsSection";
import { FavoriteButton } from "./FavoriteButton";
import { LocationSummaryCard } from "./LocationSummaryCard";

async function getLocation(id: string): Promise<VenueDetail | null> {
  const res = await fetch(apiUrl(`/locations/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load location ${id}: ${res.status}`);
  return (await res.json()) as VenueDetail;
}

// Next.js dedupes this against the identical fetch in the page component
// below via request memoization (same URL/options, same render pass).
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

  return {
    title,
    description,
    alternates: { canonical: `/location/${location.id}` },
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

// Business owner venue dashboard (BACKLOG.md): read-only display of a
// claimed business's own events, authored from the owner-side dashboard
// (/business/[venueId]). Business-kind only -- a POI can never be claimed,
// so it never has events (or coupons, fetched client-side by
// CouponsSection since claim/eligibility state is per-viewer).
async function getEvents(id: string): Promise<Event[]> {
  const res = await fetch(apiUrl(`/venues/${id}/events`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load events for venue ${id}: ${res.status}`);
  return (await res.json()) as Event[];
}

// Merged business/POI detail page (BACKLOG.md "POIs and venues managed
// almost the same") -- replaces the old separate /venues/:id and /pois/:id
// routes now that both kinds live in one table, branching rendering on
// `location.kind` where the two differ (category vs. type/description,
// claim/favorite/coupons/events are business-only).
export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const location = await getLocation(id);

  if (!location) notFound();

  const isBusiness = location.kind === "business";
  const events = isBusiness ? await getEvents(id) : [];
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

      {(isBusiness || location.google_place_id) && (
        <EnrichmentPhotos
          enrichment={location.enrichment}
          photoUrl={(index) => apiUrl(`/locations/${location.id}/photo?index=${index}`)}
          alt={location.name}
        />
      )}

      <LocationSummaryCard
        location={location}
        favoriteAction={isBusiness ? <FavoriteButton venueId={location.id} /> : undefined}
      />

      {(isBusiness || location.enrichment) && (
        <EnrichmentAbout
          enrichment={location.enrichment}
          emptyLabel={
            isBusiness
              ? "No enrichment data available for this venue."
              : "No enrichment data available for this point of interest."
          }
        />
      )}

      <EnrichmentReviews enrichment={location.enrichment} />

      {location.enrichment && <PoweredByGoogle />}

      {isBusiness && <CouponsSection venueId={location.id} />}

      {isBusiness && events.length > 0 && (
        <div>
          <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Upcoming events</p>
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
                <span className="font-extrabold text-foreground">{e.title}</span>
                <p className="mt-1 text-body-text">{e.description}</p>
                <p className="mt-1.5 text-xs font-bold text-muted">
                  {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isBusiness && !location.claimed_by_business && <ClaimBusinessForm venueId={location.id} />}
    </div>
  );
}
