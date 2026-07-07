"use client";

import { useEffect, useState } from "react";
import type { CategoryOption, VenueCategoryMapping } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type TokenState = { status: "loading" } | { status: "signed_out" } | { status: "ready"; token: string };

// Internal-only page for correcting venues the sync's category-normalization
// step (README §1.4 step 3, §2) mapped wrong, without a direct DB edit. Gated
// by the API's requireAdmin middleware, which checks the signed-in account
// has a neighborhood_admin row -- reuses the same session token as every
// other authenticated route (see lib/auth.ts) rather than a separate admin
// token.
export default function AdminVenuesPage() {
  const [tokenState, setTokenState] = useState<TokenState>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<VenueCategoryMapping[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [error, setError] = useState<"unauthorized" | "forbidden" | "failed" | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getAccessToken().then((token) => setTokenState(token ? { status: "ready", token } : { status: "signed_out" }));
  }, []);

  async function loadVenues(activeToken: string, activeSearch: string) {
    setError(null);
    const query = activeSearch ? `?search=${encodeURIComponent(activeSearch)}` : "";
    const res = await fetch(clientApiUrl(`/admin/venues${query}`), {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    if (res.status === 401) {
      setError("unauthorized");
      setVenues(null);
      return;
    }
    if (res.status === 403) {
      setError("forbidden");
      setVenues(null);
      return;
    }
    if (!res.ok) {
      setError("failed");
      return;
    }
    setVenues(await res.json());
  }

  async function loadCategories(activeToken: string) {
    const res = await fetch(clientApiUrl("/admin/categories"), {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    if (!res.ok) {
      setError("failed");
      return;
    }
    setCategories(await res.json());
  }

  useEffect(() => {
    // No data-fetching library (e.g. React Query) is in this app yet -- this
    // is a plain fetch-on-dependency-change effect, mirroring
    // admin/claims/page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tokenState.status === "ready") {
      loadVenues(tokenState.token, search);
      loadCategories(tokenState.token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenState]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tokenState.status === "ready") loadVenues(tokenState.token, search);
  }

  async function handleCategoryChange(venueId: string, categoryId: string) {
    if (tokenState.status !== "ready") return;
    setSavingId(venueId);
    setError(null);
    const res = await fetch(clientApiUrl(`/admin/venues/${venueId}/category`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenState.token}` },
      body: JSON.stringify({ category_id: categoryId }),
    });
    setSavingId(null);
    if (!res.ok) {
      setError("failed");
      return;
    }
    const updated: VenueCategoryMapping = await res.json();
    setVenues((prev) => prev?.map((v) => (v.id === venueId ? updated : v)) ?? null);
  }

  if (tokenState.status === "loading") return null;

  if (tokenState.status === "signed_out") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: venue categories</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You need to be signed in to view this page.{" "}
          <a href="/login" className="underline">
            Log in
          </a>
        </p>
      </div>
    );
  }

  if (error === "forbidden") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: venue categories</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You&apos;re signed in, but your account isn&apos;t a neighborhood admin.
        </p>
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: venue categories</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your session expired.{" "}
          <a href="/login" className="underline">
            Log in
          </a>{" "}
          again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-16 font-sans">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: venue categories</h1>

      <form onSubmit={handleSearchSubmit} className="flex gap-2 text-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or address"
          className="w-full rounded-md border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-transparent"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black"
        >
          Search
        </button>
      </form>

      {error === "failed" && <p className="text-sm text-red-600 dark:text-red-400">Something went wrong.</p>}

      {venues?.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No venues match.</p>
      )}

      <ul className="flex flex-col gap-2">
        {venues?.map((venue) => (
          <li
            key={venue.id}
            className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
          >
            <p className="font-medium text-black dark:text-zinc-50">{venue.name}</p>
            <p className="text-zinc-600 dark:text-zinc-400">{venue.address}</p>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={venue.category_id ?? ""}
                disabled={!categories || savingId === venue.id}
                onChange={(e) => handleCategoryChange(venue.id, e.target.value)}
                className="rounded-md border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145] dark:bg-transparent"
              >
                <option value="" disabled>
                  {venue.category_name ?? "Unmapped"}
                </option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.group_name ? `${c.group_name} / ${c.name}` : c.name}
                  </option>
                ))}
              </select>
              {savingId === venue.id && (
                <span className="text-xs text-zinc-500 dark:text-zinc-500">Saving…</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
