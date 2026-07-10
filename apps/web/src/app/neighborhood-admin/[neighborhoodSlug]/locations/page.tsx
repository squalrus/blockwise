"use client";

import { useEffect, useState } from "react";
import type { CategoryOption, LocationListItem, Poi, VenueStatus } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "../NeighborhoodAdminContext";
import { PoiForm } from "../PoiForm";

type Filter = "all" | "venue" | "poi" | "hidden";

// Locations tab (BACKLOG.md Ref 29) -- replaces the old Venues tab, merging
// venue (business) and POI rows for a neighborhood into one list so an admin
// doesn't have to cross-reference two separate tabs. Keeps every action the
// Venues tab had (category reassign, hide/restore, convert-to-POI) and adds
// full POI CRUD (create/edit/hide/restore/delete) plus a "Claimed" pill.
export default function NeighborhoodAdminLocationsPage() {
  const { neighborhoodId, slug } = useNeighborhoodAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [locations, setLocations] = useState<LocationListItem[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [convertingVenueId, setConvertingVenueId] = useState<string | null>(null);
  const [editingPoi, setEditingPoi] = useState<Poi | null>(null);
  const [addingPoi, setAddingPoi] = useState(false);

  async function loadLocations(activeSearch: string) {
    setError(null);
    const token = await getAccessToken();
    const query = activeSearch ? `?search=${encodeURIComponent(activeSearch)}` : "";
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations${query}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    setLocations(await res.json());
  }

  async function loadCategories() {
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl("/admin/categories"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    setCategories(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocations(search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhoodId]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    loadLocations(search);
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
      setError("Something went wrong.");
      return;
    }
    await loadLocations(search);
  }

  async function handleVenueStatusChange(venueId: string, status: VenueStatus) {
    setSavingId(venueId);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/venues/${venueId}/status`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      }
    );
    setSavingId(null);
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    if (status !== "hidden") setConvertingVenueId(null);
    await loadLocations(search);
  }

  async function handlePoiStatusChange(poiId: string, status: VenueStatus) {
    setSavingId(poiId);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/pois/${poiId}/status`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      }
    );
    setSavingId(null);
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    await loadLocations(search);
  }

  async function handleEditPoi(poiId: string) {
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/pois/${poiId}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    setEditingPoi(await res.json());
  }

  async function handleDeletePoi(poiId: string) {
    if (!window.confirm("Delete this point of interest? This can't be undone.")) return;
    setSavingId(poiId);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/pois/${poiId}`),
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    setSavingId(null);
    if (res.status === 409) {
      const body = await res.json();
      setError(body.error ?? "This point of interest has history — hide it instead of deleting.");
      return;
    }
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    await loadLocations(search);
  }

  function handlePoiCreated() {
    setAddingPoi(false);
    loadLocations(search);
  }

  function handlePoiUpdated() {
    setEditingPoi(null);
    loadLocations(search);
  }

  const filtered =
    locations?.filter((loc) => {
      if (filter === "hidden") return loc.status === "hidden";
      if (filter === "venue") return loc.kind === "venue";
      if (filter === "poi") return loc.kind === "poi";
      return true;
    }) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearchSubmit} className="flex gap-2 text-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or address"
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-foreground"
        />
        <button type="submit" className="rounded-md bg-brand-purple px-4 py-2 font-bold text-on-accent">
          Search
        </button>
      </form>

      <div className="flex gap-2 text-xs">
        {(["all", "venue", "poi", "hidden"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 font-bold ${
              filter === f ? "bg-brand-purple text-on-accent" : "border-2 border-foreground text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "venue" ? "Businesses" : f === "poi" ? "POIs" : "Hidden"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAddingPoi((prev) => !prev)}
          className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card-alt"
        >
          {addingPoi ? "Cancel" : "+ Add point of interest"}
        </button>
        <a
          href={`/neighborhood-admin/${slug}/locations/review`}
          className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card-alt"
        >
          Review Places →
        </a>
      </div>
      <div>
        {addingPoi && (
          <div className="mt-3">
            <PoiForm
              neighborhoodId={neighborhoodId}
              onCreated={handlePoiCreated}
              onCancel={() => setAddingPoi(false)}
            />
          </div>
        )}
      </div>

      {filtered?.length === 0 && <p className="text-sm text-muted">No locations match.</p>}

      <ul className="flex flex-col gap-2">
        {filtered?.map((loc) => (
          <li key={`${loc.kind}-${loc.id}`} className="rounded-2xl bg-card-alt px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <p className="font-extrabold text-foreground">{loc.name}</p>
              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-bold text-muted-strong">
                {loc.kind === "venue" ? "Business" : "POI"}
              </span>
              {loc.claimed_by_business && (
                <span className="rounded-full bg-brand-green px-2 py-0.5 text-xs font-bold text-on-accent">
                  Claimed
                </span>
              )}
              {loc.status === "hidden" && (
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-bold text-muted-strong">
                  Hidden
                </span>
              )}
            </div>
            <p className="text-muted">{loc.address ?? "No address"}</p>

            {loc.kind === "venue" ? (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={loc.category_id ?? ""}
                  disabled={!categories || savingId === loc.id}
                  onChange={(e) => handleCategoryChange(loc.id, e.target.value)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {loc.category_or_type}
                  </option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.group_name ? `${c.group_name} / ${c.name}` : c.name}
                    </option>
                  ))}
                </select>

                {loc.status === "active" ? (
                  <button
                    type="button"
                    disabled={savingId === loc.id}
                    onClick={() => handleVenueStatusChange(loc.id, "hidden")}
                    className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card"
                  >
                    Hide
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={savingId === loc.id}
                      onClick={() => handleVenueStatusChange(loc.id, "active")}
                      className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card"
                    >
                      Restore as business
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConvertingVenueId((prev) => (prev === loc.id ? null : loc.id))
                      }
                      className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card"
                    >
                      Convert to POI
                    </button>
                  </>
                )}

                {savingId === loc.id && <span className="text-xs font-bold text-muted">Saving…</span>}
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingId === loc.id}
                  onClick={() => handleEditPoi(loc.id)}
                  className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card"
                >
                  Edit
                </button>
                {loc.status === "active" ? (
                  <button
                    type="button"
                    disabled={savingId === loc.id}
                    onClick={() => handlePoiStatusChange(loc.id, "hidden")}
                    className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card"
                  >
                    Hide
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={savingId === loc.id}
                    onClick={() => handlePoiStatusChange(loc.id, "active")}
                    className="rounded-md border border-border px-3 py-1 text-sm font-bold text-foreground hover:bg-card"
                  >
                    Restore
                  </button>
                )}
                <button
                  type="button"
                  disabled={savingId === loc.id}
                  onClick={() => handleDeletePoi(loc.id)}
                  className="rounded-md border border-border px-3 py-1 text-sm font-bold text-red-600 hover:bg-card dark:text-red-400"
                >
                  Delete
                </button>
                {savingId === loc.id && <span className="text-xs font-bold text-muted">Saving…</span>}
              </div>
            )}

            {convertingVenueId === loc.id && loc.kind === "venue" && (
              <div className="mt-3">
                <PoiForm
                  neighborhoodId={neighborhoodId}
                  onCreated={handlePoiCreated}
                  initial={{
                    name: loc.name,
                    lat: loc.lat ?? 0,
                    lng: loc.lng ?? 0,
                    address: loc.address ?? undefined,
                    googlePlaceId: loc.google_place_id,
                  }}
                />
              </div>
            )}

            {editingPoi?.id === loc.id && loc.kind === "poi" && (
              <div className="mt-3">
                <PoiForm
                  neighborhoodId={neighborhoodId}
                  existing={editingPoi}
                  onUpdated={handlePoiUpdated}
                  onCancel={() => setEditingPoi(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
