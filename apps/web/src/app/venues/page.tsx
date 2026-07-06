import type { VenueListItem } from "@blockwise/types";
import { apiUrl } from "@/lib/api";
import { VenuesView } from "./VenuesView";

async function getVenues(): Promise<VenueListItem[]> {
  const res = await fetch(apiUrl("/venues"), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load venues: ${res.status}`);
  return (await res.json()) as VenueListItem[];
}

export default async function VenuesPage() {
  const venues = await getVenues();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-16 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Venues
      </h1>
      <VenuesView venues={venues} />
    </div>
  );
}
