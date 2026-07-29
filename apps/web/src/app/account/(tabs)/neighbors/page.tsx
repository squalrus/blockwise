"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConnectionSummary } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useAccountRefresh } from "../../AccountContext";
import { NeighborsSection } from "../../NeighborsSection";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; connections: ConnectionSummary[] };

async function load(setState: (state: State) => void) {
  const token = await getAccessToken();
  const res = await fetch(clientApiUrl("/me/connections"), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    setState({ status: "error", message: "Failed to load your account" });
    return;
  }
  setState({ status: "ready", connections: await res.json() });
}

export default function NeighborsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const refreshSummary = useAccountRefresh();

  useEffect(() => {
    load(setState);
  }, []);

  // Re-fetch this tab's own connections list and ask the layout to
  // recompute the ProfileSummaryCard's neighbor count, since accepting or
  // removing a connection here changes both.
  const handleChange = useCallback(async () => {
    await load(setState);
    refreshSummary();
  }, [refreshSummary]);

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

  return <NeighborsSection connections={state.connections} onChange={handleChange} />;
}
