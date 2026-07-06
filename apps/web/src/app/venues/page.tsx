import Link from "next/link";
import type { VenueListItem } from "@blockwise/types";
import { apiUrl } from "@/lib/api";

async function getVenues(): Promise<VenueListItem[]> {
  const res = await fetch(apiUrl("/venues"), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load venues: ${res.status}`);
  return (await res.json()) as VenueListItem[];
}

export default async function VenuesPage() {
  const venues = await getVenues();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-16 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Venues
      </h1>
      {venues.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No venues yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {venues.map((venue) => (
            <li key={venue.id}>
              <Link
                href={`/venues/${venue.id}`}
                className="block rounded-lg border border-black/[.08] px-4 py-3 text-sm hover:bg-zinc-100 dark:border-white/[.145] dark:hover:bg-zinc-900"
              >
                <span className="font-medium text-black dark:text-zinc-50">{venue.name}</span>
                <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                  {venue.category_name ?? "Uncategorized"} · {venue.address}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
