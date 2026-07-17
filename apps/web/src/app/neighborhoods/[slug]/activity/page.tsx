import type { Metadata } from "next";
import type { ActivityItem, NeighborhoodProfile } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { ActivityFeed } from "../../../ActivityFeed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/neighborhoods/${slug}/activity` } };
}

async function getNeighborhood(slug: string): Promise<NeighborhoodProfile | null> {
  const res = await fetch(apiUrl(`/neighborhoods/${slug}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load neighborhood ${slug}: ${res.status}`);
  return (await res.json()) as NeighborhoodProfile;
}

async function getActivity(id: string): Promise<ActivityItem[]> {
  const res = await fetch(apiUrl(`/neighborhoods/${id}/activity`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load activity for neighborhood ${id}: ${res.status}`);
  return (await res.json()) as ActivityItem[];
}

// BACKLOG.md Ref 27: Recent activity tab -- a neighborhood-wide feed of
// check-ins, favorites, challenge completions, badge unlocks, and followed
// events (BACKLOG.md Ref 81), with actor names already masked server-side
// per profile visibility.
export default async function NeighborhoodActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const neighborhood = await getNeighborhood(slug);
  if (!neighborhood) return null;

  const activity = await getActivity(neighborhood.id);

  return <ActivityFeed items={activity} emptyMessage="No activity yet." />;
}
