"use client";

import { useEffect, useState } from "react";
import type { CategoryOption, VenueCategoryMapping } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "../NeighborhoodAdminContext";

// Venue categories tab (docs/url-map.md refactor -- was the global
// admin/venues page, gated only by "admin of some neighborhood" with no
// per-neighborhood filter). Signed-in/forbidden handling lives in
// layout.tsx; /admin/categories itself stays global (categories aren't
// neighborhood-owned data).
export default function NeighborhoodAdminVenuesPage() {
  const { neighborhoodId } = useNeighborhoodAdmin();
  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<VenueCategoryMapping[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [error, setError] = useState<"failed" | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadVenues(activeSearch: string) {
    setError(null);
    const token = await getAccessToken();
    const query = activeSearch ? `?search=${encodeURIComponent(activeSearch)}` : "";
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/venues${query}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      setError("failed");
      return;
    }
    setVenues(await res.json());
  }

  async function loadCategories() {
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl("/admin/categories"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError("failed");
      return;
    }
    setCategories(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVenues(search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhoodId]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    loadVenues(search);
  }

  async function handleCategoryChange(venueId: string, categoryId: string) {
    setSavingId(venueId);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/venues/${venueId}/category`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category_id: categoryId }),
      }
    );
    setSavingId(null);
    if (!res.ok) {
      setError("failed");
      return;
    }
    const updated: VenueCategoryMapping = await res.json();
    setVenues((prev) => prev?.map((v) => (v.id === venueId ? updated : v)) ?? null);
  }

  return (
    <div className="flex flex-col gap-4">
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
