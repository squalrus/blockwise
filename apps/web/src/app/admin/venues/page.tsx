"use client";

import { useEffect, useState } from "react";
import type { CategoryOption, VenueCategoryMapping } from "@blockwise/types";
import { clientApiUrl } from "@/lib/clientApi";

const TOKEN_STORAGE_KEY = "blockwise_admin_token";

// Internal-only page for correcting venues the sync's category-normalization
// step (README §1.4 step 3, §2) mapped wrong, without a direct DB edit.
// Gated by the same shared secret as /admin/claims -- no real admin auth
// system yet (see BACKLOG.md's separate admin-portal item).
export default function AdminVenuesPage() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<VenueCategoryMapping[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    // sessionStorage isn't available during the static prerender of this
    // page, so it can't be read via a useState lazy initializer -- this has
    // to happen post-hydration, in an effect.
    const stored = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setToken(stored);
  }, []);

  async function loadVenues(activeToken: string, activeSearch: string) {
    setError(null);
    const query = activeSearch ? `?search=${encodeURIComponent(activeSearch)}` : "";
    const res = await fetch(clientApiUrl(`/admin/venues${query}`), {
      headers: { "X-Admin-Token": activeToken },
    });
    if (res.status === 401) {
      setError("Invalid admin token");
      setVenues(null);
      return;
    }
    if (!res.ok) {
      setError("Failed to load venues");
      return;
    }
    setVenues(await res.json());
  }

  async function loadCategories(activeToken: string) {
    const res = await fetch(clientApiUrl("/admin/categories"), {
      headers: { "X-Admin-Token": activeToken },
    });
    if (!res.ok) {
      setError("Failed to load categories");
      return;
    }
    setCategories(await res.json());
  }

  useEffect(() => {
    // No data-fetching library (e.g. React Query) is in this app yet -- this
    // is a plain fetch-on-dependency-change effect, mirroring
    // admin/claims/page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) {
      loadVenues(token, search);
      loadCategories(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleTokenSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenInput);
    setToken(tokenInput);
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    loadVenues(token, search);
  }

  async function handleCategoryChange(venueId: string, categoryId: string) {
    setSavingId(venueId);
    setError(null);
    const res = await fetch(clientApiUrl(`/admin/venues/${venueId}/category`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify({ category_id: categoryId }),
    });
    setSavingId(null);
    if (!res.ok) {
      setError("Failed to update category");
      return;
    }
    const updated: VenueCategoryMapping = await res.json();
    setVenues((prev) => prev?.map((v) => (v.id === venueId ? updated : v)) ?? null);
  }

  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: venue categories</h1>
        <form onSubmit={handleTokenSubmit} className="flex flex-col gap-2">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
          />
          <button
            type="submit"
            className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Continue
          </button>
        </form>
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

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
