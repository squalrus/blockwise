"use client";

import { useEffect, useState } from "react";
import type { MushroomCollectionEntry } from "@blockwise/types";
import { MushroomLoader, MushroomMark } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: MushroomCollectionEntry[] };

async function load(setState: (state: State) => void) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const res = await fetch(clientApiUrl("/me/collection"), { headers });

  if (!res.ok) {
    setState({ status: "error", message: "Failed to load your collection" });
    return;
  }

  setState({ status: "ready", entries: await res.json() });
}

export default function CollectionPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    load(setState);
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <MushroomLoader size={56} />
      </div>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  if (state.entries.length === 0) {
    return (
      <p className="text-sm text-muted">
        No mushrooms collected yet -- check in at a venue or connect with a neighbor to discover your first species.
      </p>
    );
  }

  return (
    <section className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {state.entries.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-col items-center gap-1.5 rounded-2xl bg-card-alt px-2 py-3.5 text-center"
        >
          <div className="relative">
            <MushroomMark {...entry.mushroom} size={56} />
            {entry.quantity > 1 && (
              <span className="absolute -right-1.5 -bottom-1 rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-extrabold text-on-accent">
                {entry.quantity}x
              </span>
            )}
          </div>
          <p className="text-xs font-extrabold text-foreground">{entry.species_name}</p>
          <p className="text-[11px] text-muted">
            {entry.source_type === "checkin" ? entry.source_name : `with ${entry.source_name}`}
          </p>
        </div>
      ))}
    </section>
  );
}
