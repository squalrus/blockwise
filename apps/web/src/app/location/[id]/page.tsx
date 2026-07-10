import Link from "next/link";
import { notFound } from "next/navigation";
import type { Announcement, Event, SocialLinks, VenueDetail } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { EnrichmentAbout, EnrichmentPhotos, EnrichmentReviews } from "../../EnrichmentSection";
import { SlideToCheckIn } from "../../SlideToCheckIn";
import { StatCard } from "../../StatCard";
import { ClaimBusinessForm } from "./ClaimBusinessForm";
import { FavoriteButton } from "./FavoriteButton";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

async function getLocation(id: string): Promise<VenueDetail | null> {
  const res = await fetch(apiUrl(`/locations/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load location ${id}: ${res.status}`);
  return (await res.json()) as VenueDetail;
}

// Business owner venue dashboard (BACKLOG.md): read-only display of a
// claimed business's own announcements/events, authored from the owner-side
// dashboard (/business/[venueId]). Business-kind only -- a POI can never be
// claimed, so it never has announcements/events.
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

// Merged business/POI detail page (BACKLOG.md "POIs and venues managed
// almost the same") -- replaces the old separate /venues/:id and /pois/:id
// routes now that both kinds live in one table, branching rendering on
// `location.kind` where the two differ (category vs. type/description,
// claim/favorite/announcements/events are business-only).
export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const location = await getLocation(id);

  if (!location) notFound();

  const isBusiness = location.kind === "business";
  const [announcements, events] = isBusiness
    ? await Promise.all([getAnnouncements(id), getEvents(id)])
    : [[], []];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 font-sans sm:p-16">
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

      <div className="flex flex-wrap items-center gap-2">
        {isBusiness ? (
          location.category_name && (
            <span className="rounded-full bg-brand-amber px-2.5 py-1 text-xs font-extrabold text-ink">
              {location.category_name}
            </span>
          )
        ) : (
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-extrabold text-muted-strong">
            {location.type}
          </span>
        )}
        {location.enrichment?.rating != null && (
          <span className="ml-auto flex items-center gap-1 text-sm font-extrabold text-foreground">
            ★ {location.enrichment.rating}
          </span>
        )}
      </div>

      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          {location.name}
        </h1>
        <p className="mt-1 text-[12.5px] font-bold text-muted">{location.address}</p>
      </div>

      {!isBusiness && location.description && (
        <p className="text-sm text-body-text">{location.description}</p>
      )}

      {isBusiness && Object.keys(location.social_links).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm font-bold">
          {SOCIAL_PLATFORM_LABELS.filter(({ key }) => location.social_links[key]).map(({ key, label }) => (
            <a
              key={key}
              href={location.social_links[key]}
              target="_blank"
              rel="noreferrer"
              className="text-brand-purple hover:text-brand-orange"
            >
              {label}
            </a>
          ))}
        </div>
      )}

      {isBusiness ? (
        <div className="flex gap-2.5">
          <FavoriteButton venueId={location.id} />
        </div>
      ) : (
        <StatCard value={location.checkin_count} label="Check-ins" accent="green" />
      )}

      <SlideToCheckIn locationId={location.id} />

      {isBusiness && !location.claimed_by_business && <ClaimBusinessForm venueId={location.id} />}

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

      {isBusiness && announcements.length > 0 && (
        <div>
          <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Announcements</p>
          <ul className="flex flex-col gap-2">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
                <span className="font-extrabold text-foreground">{a.title}</span>
                <p className="mt-1 text-body-text">{a.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

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
    </div>
  );
}
