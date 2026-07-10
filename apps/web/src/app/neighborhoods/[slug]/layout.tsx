import Link from "next/link";
import { notFound } from "next/navigation";
import type { NeighborhoodProfile, SocialLinks } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { StatCard } from "../../StatCard";
import { JoinNeighborhoodButton } from "./JoinNeighborhoodButton";
import { ManageNeighborhoodButton } from "./ManageNeighborhoodButton";
import { NeighborhoodMapArt } from "./NeighborhoodMapArt";
import { NeighborhoodTabs } from "./NeighborhoodTabs";

const SOCIAL_PLATFORM_LABELS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
];

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

// BACKLOG.md Ref 44: shared chrome (header, social links, join button) and
// the subnav tab bar for the neighborhood profile pages, mirroring the
// /neighborhood-admin/[neighborhoodSlug]/layout.tsx tab pattern. Each tab is
// its own route (page.tsx = Happening now, activity/, events/, locations/,
// challenges/) so it's directly linkable and only fetches the data it needs.
export default async function NeighborhoodLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);

  if (!neighborhood) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 font-sans sm:p-16">
      <Link href="/" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
        ← All neighborhoods
      </Link>

      <NeighborhoodMapArt />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            {neighborhood.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {neighborhood.city}, {neighborhood.state}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <JoinNeighborhoodButton neighborhoodId={neighborhood.id} />
          <ManageNeighborhoodButton neighborhoodSlug={neighborhood.slug} />
        </div>
      </div>

      {neighborhood.description && (
        <p className="text-sm text-body-text">{neighborhood.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard value={neighborhood.venue_count} label="Businesses" accent="orange" />
        <StatCard value={neighborhood.poi_count} label="Points of interest" accent="green" />
        <StatCard value={neighborhood.member_count} label="Members" accent="purple" />
        <StatCard value={neighborhood.checkin_count} label="Check-ins" accent="amber" />
      </div>

      {Object.keys(neighborhood.social_links).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm font-bold">
          {SOCIAL_PLATFORM_LABELS.filter(({ key }) => neighborhood.social_links[key]).map(
            ({ key, label }) => (
              <a
                key={key}
                href={neighborhood.social_links[key]}
                target="_blank"
                rel="noreferrer"
                className="text-brand-purple hover:text-brand-orange"
              >
                {label}
              </a>
            )
          )}
        </div>
      )}

      <NeighborhoodTabs slug={neighborhood.slug} />

      {children}
    </div>
  );
}
