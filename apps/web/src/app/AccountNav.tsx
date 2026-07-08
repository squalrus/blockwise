"use client";

import { useEffect, useState } from "react";
import type { AppUser, NeighborhoodMembership } from "@blockwise/types";
import { getAccessToken, getCurrentUser, logOut } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; user: AppUser; homeNeighborhood: NeighborhoodMembership | null };

export function AccountNav() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "signed_out" });
        return;
      }

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/neighborhoods"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      const neighborhoods: NeighborhoodMembership[] = res.ok ? await res.json() : [];
      setState({
        status: "signed_in",
        user,
        homeNeighborhood: neighborhoods.find((n) => n.is_primary) ?? null,
      });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogOut() {
    await logOut();
    setState({ status: "signed_out" });
  }

  return (
    <nav className="flex items-center gap-4 border-b border-black/[.08] px-6 py-3 text-sm dark:border-white/[.145]">
      <a href="/" className="font-medium text-black dark:text-zinc-50">
        Blockwise
      </a>
      <div className="ml-auto flex items-center gap-4">
        {state.status === "signed_in" && state.homeNeighborhood && (
          <a
            href={`/neighborhoods/${state.homeNeighborhood.slug}`}
            className="text-zinc-600 hover:underline dark:text-zinc-400"
          >
            {state.homeNeighborhood.name}
          </a>
        )}
        {state.status === "signed_in" && (
          <a href="/account" className="text-zinc-600 hover:underline dark:text-zinc-400">
            My account
          </a>
        )}
        {state.status === "signed_in" && state.user.account_type === "business" && (
          <a href="/business" className="text-zinc-600 hover:underline dark:text-zinc-400">
            Business portal
          </a>
        )}
        {state.status === "signed_in" && state.user.is_neighborhood_admin && (
          <a href="/neighborhood-admin" className="text-zinc-600 hover:underline dark:text-zinc-400">
            Neighborhood admin
          </a>
        )}
        {state.status === "signed_in" && (
          <button onClick={handleLogOut} className="text-zinc-600 hover:underline dark:text-zinc-400">
            Log out
          </button>
        )}
        {state.status === "signed_out" && (
          <>
            <a href="/login" className="text-zinc-600 hover:underline dark:text-zinc-400">
              Log in
            </a>
            <a href="/signup" className="text-zinc-600 hover:underline dark:text-zinc-400">
              Sign up
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
