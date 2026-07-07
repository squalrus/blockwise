import Link from "next/link";
import { notFound } from "next/navigation";
import type { Announcement, Event, SocialLinks, VenueDetail } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { CheckInButton } from "./CheckInButton";
import { ClaimBusinessForm } from "./ClaimBusinessForm";
import { FavoriteButton } from "./FavoriteButton";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

async function getVenue(id: string): Promise<VenueDetail | null> {
  const res = await fetch(apiUrl(`/venues/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load venue ${id}: ${res.status}`);
  return (await res.json()) as VenueDetail;
}

// Business owner venue dashboard (BACKLOG.md): read-only display of a
// claimed venue's own announcements/events, authored from the owner-side
// dashboard (/business/[venueId]). No moderation queue or push notifications
// yet -- see the migration's header comment -- so this is just a plain list.
async function getAnnouncements(id: string): Promise<Announcement[]> {
  const res = await fetch(apiUrl(`/venues/${id}/announcements`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load announcements for venue ${id}: ${res.status}`);
  return (await res.json()) as Announcement[];
}

async function getEvents(id: string): Promise<Event[]> {
  const res = await fetch(apiUrl(`/venues/${id}/events`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load events for venue ${id}: ${res.status}`);
  return (await res.json()) as Event[];
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

  const [announcements, events] = await Promise.all([getAnnouncements(id), getEvents(id)]);

  const priceTier = formatPriceTier(venue.enrichment?.price_tier ?? null);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-16 font-sans">
      <Link
        href={`/neighborhoods/${venue.neighborhood_slug}`}
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← {venue.neighborhood_name}
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {venue.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {venue.category_name ?? "Uncategorized"} · {venue.address}
        </p>
      </div>

      {Object.keys(venue.social_links).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          {SOCIAL_PLATFORM_LABELS.filter(({ key }) => venue.social_links[key]).map(({ key, label }) => (
            <a
              key={key}
              href={venue.social_links[key]}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-600 underline hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              {label}
            </a>
          ))}
        </div>
      )}

      <FavoriteButton venueId={venue.id} />

      <CheckInButton target={{ type: "venue", id: venue.id }} />

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

      {announcements.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Announcements</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {announcements.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="font-medium text-black dark:text-zinc-50">{a.title}</span>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{a.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Upcoming events</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {events.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
              >
                <span className="font-medium text-black dark:text-zinc-50">{e.title}</span>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{e.description}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  {new Date(e.start_time).toLocaleString()} – {new Date(e.end_time).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
