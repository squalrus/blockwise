"use client";

import { useEffect, useState } from "react";
import type { AppUser } from "@blockwise/types";
import { getCurrentUser, logOut } from "@/lib/auth";

type State = { status: "loading" } | { status: "signed_out" } | { status: "signed_in"; user: AppUser };

export function AccountNav() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getCurrentUser().then((user) => {
      if (!cancelled) setState(user ? { status: "signed_in", user } : { status: "signed_out" });
    });
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
      <a href="/venues" className="font-medium text-black dark:text-zinc-50">
        Blockwise
      </a>
      <div className="ml-auto flex items-center gap-4">
        {state.status === "signed_in" && state.user.account_type === "business" && (
          <a href="/business" className="text-zinc-600 hover:underline dark:text-zinc-400">
            Business portal
          </a>
        )}
        {state.status === "signed_in" && state.user.is_neighborhood_admin && (
          <>
            <a href="/admin/claims" className="text-zinc-600 hover:underline dark:text-zinc-400">
              Admin: claims
            </a>
            <a href="/admin/venues" className="text-zinc-600 hover:underline dark:text-zinc-400">
              Admin: venues
            </a>
          </>
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
