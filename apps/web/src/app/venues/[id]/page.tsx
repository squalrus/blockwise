import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  Announcement,
  EnrichmentAtmosphere,
  Event,
  SocialLinks,
  VenueDetail,
} from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { ClaimBusinessForm } from "./ClaimBusinessForm";
import { FavoriteButton } from "./FavoriteButton";
import { SlideToCheckIn } from "./SlideToCheckIn";
import { VenueHours } from "./VenueHours";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

// Amber is light-toned in both themes, so it always needs ink (always-dark)
// text; orange/purple/green get brighter in dark mode and need on-accent
// (theme-flipping) text instead -- see globals.css's --ink/--on-accent notes.
const AVATAR_ACCENTS = [
  { bg: "var(--brand-amber)", text: "text-ink" },
  { bg: "var(--brand-purple)", text: "text-on-accent" },
  { bg: "var(--brand-orange)", text: "text-on-accent" },
  { bg: "var(--brand-green)", text: "text-on-accent" },
];

function avatarAccentFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_ACCENTS[Math.abs(hash) % AVATAR_ACCENTS.length];
}

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

const ATMOSPHERE_LABELS: { key: keyof EnrichmentAtmosphere; label: string }[] = [
  { key: "dine_in", label: "Dine-in" },
  { key: "takeout", label: "Takeout" },
  { key: "delivery", label: "Delivery" },
  { key: "outdoor_seating", label: "Outdoor seating" },
  { key: "reservable", label: "Reservations" },
  { key: "good_for_children", label: "Good for kids" },
];

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 font-sans sm:p-16">
      <Link
        href={`/neighborhoods/${venue.neighborhood_slug}`}
        className="text-sm font-bold text-brand-purple hover:text-brand-orange"
      >
        ← {venue.neighborhood_name}
      </Link>

      {venue.enrichment && venue.enrichment.photo_refs.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {venue.enrichment.photo_refs.map((_, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- proxied through apps/api, not a static asset
            <img
              key={index}
              src={apiUrl(`/venues/${venue.id}/photo?index=${index}`)}
              alt={venue.name}
              className="h-32 w-56 flex-none rounded-2xl object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="h-32 rounded-2xl bg-card-alt" />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {venue.category_name && (
          <span className="rounded-full bg-brand-amber px-2.5 py-1 text-xs font-extrabold text-ink">
            {venue.category_name}
          </span>
        )}
        {venue.enrichment?.rating != null && (
          <span className="ml-auto flex items-center gap-1 text-sm font-extrabold text-foreground">
            ★ {venue.enrichment.rating}
          </span>
        )}
      </div>

      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          {venue.name}
        </h1>
        <p className="mt-1 text-[12.5px] font-bold text-muted">{venue.address}</p>
      </div>

      {Object.keys(venue.social_links).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm font-bold">
          {SOCIAL_PLATFORM_LABELS.filter(({ key }) => venue.social_links[key]).map(({ key, label }) => (
            <a
              key={key}
              href={venue.social_links[key]}
              target="_blank"
              rel="noreferrer"
              className="text-brand-purple hover:text-brand-orange"
            >
              {label}
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-2.5">
        <FavoriteButton venueId={venue.id} />
      </div>

      <SlideToCheckIn target={{ type: "venue", id: venue.id }} />

      {!venue.claimed_by_business && <ClaimBusinessForm venueId={venue.id} />}

      <div className="rounded-2xl bg-card-alt px-5 py-4">
        <p className="text-xs font-extrabold tracking-wide text-muted uppercase">About</p>
        {venue.enrichment ? (
          <div className="mt-2 flex flex-col gap-3 text-sm">
            {priceTier && <p className="font-bold text-foreground">Price: {priceTier}</p>}
            {venue.enrichment.editorial_summary && (
              <p className="text-body-text">{venue.enrichment.editorial_summary}</p>
            )}

            {(venue.enrichment.phone || venue.enrichment.website) && (
              <div className="flex flex-wrap gap-4 font-bold">
                {venue.enrichment.phone && (
                  <a href={`tel:${venue.enrichment.phone}`} className="text-brand-purple hover:text-brand-orange">
                    {venue.enrichment.phone}
                  </a>
                )}
                {venue.enrichment.website && (
                  <a
                    href={venue.enrichment.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-purple hover:text-brand-orange"
                  >
                    Website
                  </a>
                )}
              </div>
            )}

            {venue.enrichment.hours && venue.enrichment.hours.length > 0 && (
              <VenueHours hours={venue.enrichment.hours} />
            )}

            {venue.enrichment.atmosphere && (
              <div className="flex flex-wrap gap-2">
                {ATMOSPHERE_LABELS.filter(({ key }) => venue.enrichment!.atmosphere![key]).map(
                  ({ key, label }) => (
                    <span
                      key={key}
                      className="rounded-full bg-card px-2.5 py-1 text-xs font-bold text-body-text"
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
            )}

            <p className="text-xs font-bold text-muted">
              Last refreshed {new Date(venue.enrichment.fetched_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">No enrichment data available for this venue.</p>
        )}
      </div>

      {venue.enrichment && venue.enrichment.reviews.length > 0 && (
        <div>
          <p className="mb-2.5 text-xs font-extrabold tracking-wide text-muted uppercase">Reviews</p>
          <ul className="flex flex-col gap-2">
            {venue.enrichment.reviews.map((review, index) => {
              const author = review.author_name ?? "Neighbor";
              const accent = avatarAccentFor(author);
              return (
                <li key={index} className="rounded-2xl bg-card-alt px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-6.5 w-6.5 items-center justify-center rounded-full text-xs font-extrabold ${accent.text}`}
                      style={{ backgroundColor: accent.bg }}
                    >
                      {author.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[12.5px] font-extrabold text-foreground">
                      {author}
                      {review.rating != null ? ` ${"★".repeat(review.rating)}` : ""}
                    </span>
                  </div>
                  {review.text && (
                    <p className="mt-2 text-[12.5px] text-body-text">{review.text}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {announcements.length > 0 && (
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

      {events.length > 0 && (
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
