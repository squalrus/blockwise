import Link from "next/link";
import { notFound } from "next/navigation";
import type { VenueDetail } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { CheckInButton } from "./CheckInButton";
import { ClaimBusinessForm } from "./ClaimBusinessForm";
import { FavoriteButton } from "./FavoriteButton";

async function getVenue(id: string): Promise<VenueDetail | null> {
  const res = await fetch(apiUrl(`/venues/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load venue ${id}: ${res.status}`);
  return (await res.json()) as VenueDetail;
}

function formatPriceTier(priceTier: string | null): string | null {
  if (!priceTier) return null;
  // Google's Places API (New) priceLevel enum, e.g. "PRICE_LEVEL_MODERATE".
  return priceTier.replace("PRICE_LEVEL_", "").replace("_", " ").toLowerCase();
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = await getVenue(id);

  if (!venue) notFound();

  const priceTier = formatPriceTier(venue.enrichment?.price_tier ?? null);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-16 font-sans">
      <Link href="/venues" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← All venues
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {venue.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {venue.category_name ?? "Uncategorized"} · {venue.address}
        </p>
      </div>

      <FavoriteButton venueId={venue.id} />

      <CheckInButton venueId={venue.id} />

      {!venue.claimed_by_business && <ClaimBusinessForm venueId={venue.id} />}

      <div className="rounded-lg border border-black/[.08] px-6 py-4 dark:border-white/[.145]">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Google enrichment</p>
        {venue.enrichment ? (
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {venue.enrichment.rating != null && (
              <p className="text-black dark:text-zinc-50">★ {venue.enrichment.rating} rating</p>
            )}
            {priceTier && <p className="text-black dark:text-zinc-50">Price: {priceTier}</p>}
            {venue.enrichment.review_snippet && (
              <p className="italic text-zinc-700 dark:text-zinc-300">
                “{venue.enrichment.review_snippet}”
              </p>
            )}
            {venue.enrichment.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element -- proxied through apps/api, not a static asset
              <img
                src={apiUrl(`/venues/${venue.id}/photo`)}
                alt={venue.name}
                className="mt-2 max-h-64 w-full rounded-md object-cover"
              />
            )}
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              Last refreshed {new Date(venue.enrichment.fetched_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
            No enrichment data available for this venue.
          </p>
        )}
      </div>

      {venue.pois.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Points of interest
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {venue.pois.map((poi) => (
              <li
                key={poi.id}
                className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="font-medium text-black dark:text-zinc-50">{poi.name}</span>
                <span className="ml-2 text-zinc-600 dark:text-zinc-400">{poi.type}</span>
                {poi.description && (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{poi.description}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
