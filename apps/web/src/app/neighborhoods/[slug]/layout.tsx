import Link from "next/link";
import { notFound } from "next/navigation";
import type { NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { JoinNeighborhoodButton } from "./JoinNeighborhoodButton";
import { ManageNeighborhoodButton } from "./ManageNeighborhoodButton";
import { NeighborhoodSummaryCard } from "./NeighborhoodSummaryCard";
import { NeighborhoodTabs } from "./NeighborhoodTabs";

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

      <NeighborhoodSummaryCard
        neighborhood={neighborhood}
        actions={
          <>
            <JoinNeighborhoodButton neighborhoodId={neighborhood.id} />
            <ManageNeighborhoodButton neighborhoodSlug={neighborhood.slug} />
          </>
        }
      />

      <NeighborhoodTabs slug={neighborhood.slug} />

      {children}
    </div>
  );
}
