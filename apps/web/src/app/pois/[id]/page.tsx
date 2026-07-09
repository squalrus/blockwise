import Link from "next/link";
import { notFound } from "next/navigation";
import type { PoiDetail } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { StatCard } from "../../StatCard";
import { CheckInButton } from "../../venues/[id]/CheckInButton";

async function getPoi(id: string): Promise<PoiDetail | null> {
  const res = await fetch(apiUrl(`/pois/${id}`), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load POI ${id}: ${res.status}`);
  return (await res.json()) as PoiDetail;
}

export default async function PoiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poi = await getPoi(id);

  if (!poi) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <Link
        href={`/neighborhoods/${poi.neighborhood_slug}`}
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← {poi.neighborhood_name}
      </Link>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {poi.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {poi.type}
          {poi.address ? ` · ${poi.address}` : ""}
        </p>
      </div>

      {poi.description && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{poi.description}</p>
      )}

      <StatCard value={poi.checkin_count} label="Check-ins" />

      <CheckInButton target={{ type: "poi", id: poi.id }} />
    </div>
  );
}
