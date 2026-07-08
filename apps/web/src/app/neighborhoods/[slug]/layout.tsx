import Link from "next/link";
import { notFound } from "next/navigation";
import type { NeighborhoodProfile, SocialLinks } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { JoinNeighborhoodButton } from "./JoinNeighborhoodButton";
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
// its own route (page.tsx = Leaderboard, challenges/, events/, pois/,
// venues/) so it's directly linkable and only fetches the data it needs.
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← All neighborhoods
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {neighborhood.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {neighborhood.city}, {neighborhood.state}
          </p>
        </div>
        <JoinNeighborhoodButton neighborhoodId={neighborhood.id} />
      </div>

      {neighborhood.description && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{neighborhood.description}</p>
      )}

      {Object.keys(neighborhood.social_links).length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          {SOCIAL_PLATFORM_LABELS.filter(({ key }) => neighborhood.social_links[key]).map(
            ({ key, label }) => (
              <a
                key={key}
                href={neighborhood.social_links[key]}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-600 underline hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
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
