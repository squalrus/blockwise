"use client";

import { useEffect, useState } from "react";
import type { ActivityItem } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { ActivityFeed } from "../../../ActivityFeed";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; myActivity: ActivityItem[] };

async function load(setState: (state: State) => void) {
  const token = await getAccessToken();
  const res = await fetch(clientApiUrl("/me/activity"), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    setState({ status: "error", message: "Failed to load your account" });
    return;
  }
  setState({ status: "ready", myActivity: await res.json() });
}

// BACKLOG.md Ref 81 follow-up: renamed from the old check-ins-only tab --
// every activity type for this account's own actions (GET /me/activity),
// not masked by visibility the way the Spore Feed's neighbor activity is,
// since it's your own data. Last tab since it's the least "front page" one.
export default function MyActivityPage() {
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
    <section className="flex flex-col gap-2.5">
      <ActivityFeed items={state.myActivity} emptyMessage="No activity yet -- check in from a venue page when you're there." />
    </section>
  );
}
