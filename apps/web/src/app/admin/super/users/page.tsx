"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppUserAdminView } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "ready"; users: AppUserAdminView[] }
  | { status: "error"; message: string };

type SortOption = "newest" | "oldest" | "name" | "email";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name (A–Z)",
  email: "Email (A–Z)",
};

// Users tab of the super admin shell (BACKLOG.md), starting with a
// searchable, sortable list of every account on the platform -- signed-in/
// forbidden handling lives in layout.tsx, mirroring the neighborhood/
// business shells' tabs, which is why this only tracks loading/ready/error.
// Search and sort are both client-side filters over the one loaded list
// rather than server round trips -- the platform is small enough for now
// that loading everything once is simpler than a search API.
export default function SuperAdminUsersPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/users"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load users" });
        return;
      }
      setState({ status: "ready", users: await res.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const users = state.status === "ready" ? state.users : null;

  const filtered = useMemo(() => {
    if (!users) return null;
    const needle = search.trim().toLowerCase();
    const matched = needle
      ? users.filter((u) => [u.email, u.display_name, u.username].some((field) => field?.toLowerCase().includes(needle)))
      : users;

    // API already returns newest-first, but sorted explicitly here too so
    // switching back to "Newest first" after another sort doesn't rely on
    // remembering the original fetch order.
    const sorted = [...matched];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "oldest":
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case "name":
        sorted.sort((a, b) => (a.display_name ?? a.username ?? "").localeCompare(b.display_name ?? b.username ?? ""));
        break;
      case "email":
        sorted.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
        break;
    }
    return sorted;
  }, [users, search, sort]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <MushroomLoader size={72} />
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Users</h1>
        <p className="mt-1 text-[15px] text-body-text">Every account on the platform.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, or username"
          className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs font-bold text-muted">
        {filtered?.length ?? 0} of {users?.length ?? 0} users
      </p>

      <ul className="flex flex-col gap-2">
        {filtered?.map((user) => (
          <li
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-border/60 bg-card px-4 py-3.5"
          >
            <div className="flex flex-col">
              <span className="font-heading text-[15px] font-bold">
                {user.display_name ?? user.username ?? user.email ?? "Unnamed account"}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {user.email ?? "no email"}
                {user.username && ` · @${user.username}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-border bg-card-alt px-2.25 py-0.5 text-[10px] font-extrabold text-muted-strong">
                {user.account_type}
              </span>
              {user.is_neighborhood_admin && (
                <span className="rounded-full bg-brand-purple/20 px-2.25 py-0.5 text-[10px] font-extrabold text-brand-purple">
                  Neighborhood admin
                </span>
              )}
              {user.is_super_admin && (
                <span className="rounded-full bg-brand-orange/20 px-2.25 py-0.5 text-[10px] font-extrabold text-brand-orange">
                  Super admin
                </span>
              )}
              <span className="font-mono text-[11px] text-muted">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </li>
        ))}
      </ul>

      {filtered?.length === 0 && <p className="text-sm text-muted">No users match.</p>}
    </div>
  );
}
