import type { Metadata } from "next";
import type { ActivityItem } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { ActivityFeed } from "../../ActivityFeed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { alternates: { canonical: `/location/${id}` } };
}

// Spore Feed tab (BACKLOG.md Ref 101 redesign, default route) -- this
// venue's own check-ins, newest first.
async function getActivity(id: string): Promise<ActivityItem[]> {
  const res = await fetch(apiUrl(`/venues/${id}/activity`), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load activity for venue ${id}: ${res.status}`);
  return (await res.json()) as ActivityItem[];
}

export default async function LocationSporeFeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activity = await getActivity(id);

  return <ActivityFeed items={activity} emptyMessage="No check-ins yet." />;
}
