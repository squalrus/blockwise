"use client";

import { useEffect, useState } from "react";
import type { FavoriteVenueSummary, FollowedEventSummary } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { EventListItem } from "../../../EventListItem";
import { FollowEventButton } from "../../../FollowEventButton";
import { PlaceListItem } from "../../../PlaceListItem";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; followedEvents: FollowedEventSummary[]; favorites: FavoriteVenueSummary[] };

async function load(setState: (state: State) => void) {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}` };
  const [followedEventsRes, favoritesRes] = await Promise.all([
    fetch(clientApiUrl("/me/events"), { headers }),
    fetch(clientApiUrl("/me/favorites"), { headers }),
  ]);

  if (!followedEventsRes.ok || !favoritesRes.ok) {
    setState({ status: "error", message: "Failed to load your account" });
    return;
  }

  setState({
    status: "ready",
    followedEvents: await followedEventsRes.json(),
    favorites: await favoritesRes.json(),
  });
}

export default function FavoritesPage() {
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

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold text-muted">Events</h2>
        {state.followedEvents.length === 0 ? (
          <p className="text-sm text-muted">
            No followed events yet -- follow one from a neighborhood&apos;s Events tab to see it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {state.followedEvents.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                showSource={false}
                actions={<FollowEventButton eventId={event.id} />}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-xs font-extrabold text-muted">Venues</h2>
        {state.favorites.length === 0 ? (
          <p className="text-sm text-muted">
            No favorites yet -- tap the favorite button on a venue page to save it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.favorites.map((venue) => (
              <li key={venue.venue_id}>
                <PlaceListItem href={`/location/${venue.venue_id}`} id={venue.venue_id} name={venue.name} subtitle={venue.address} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
