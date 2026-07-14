"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategoryOption, LocationKind, LocationListItem, Venue, VenueStatus } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "../NeighborhoodAdminContext";
import { PoiForm } from "../PoiForm";

type Filter = "all" | "business" | "poi";

const GROUP_COLORS: Record<string, string> = {
  "Food & Drink": "var(--brand-orange)",
  Retail: "var(--brand-amber)",
  "Health & Wellness": "var(--brand-green)",
  "Arts & Recreation": "var(--brand-purple)",
  Services: "var(--muted)",
};
const FALLBACK_GROUP_COLOR = "var(--muted)";

// Locations tab (BACKLOG.md Ref 29, generalized by "POIs and venues managed
// almost the same") -- one merged venue+POI list for a neighborhood, so an
// admin doesn't have to cross-reference two separate tabs. Category
// reassign, hide/restore, and switching kind are all in-place actions on the
// same row now that both kinds live in one table; POI CRUD (create/edit/
// hide/restore/delete) stays as its own flow since businesses have no
// manual-create/edit UI.
//
// Visually redesigned per BACKLOG.md Ref 31 "SimCity-style redesign", which
// also folds in Ref 56's category filter chips -- a small, purely
// client-side addition once this tab's markup was being touched anyway. The
// category filter is business-only (POIs use a free-text `type`, not the
// category taxonomy) per Ref 56's open question. Selecting a group chip
// reveals an optional second-level row of that group's leaf categories
// (subcategoryId) for finer-grained filtering -- reset whenever the group
// selection changes so a stale subcategory can't silently filter out
// everything in a newly-selected group.
//
// Kind (All/Businesses/POIs) and hidden-visibility are two independent
// axes, not one 4-way segmented control -- "show hidden" is a toggle that
// combines with whichever kind is selected, rather than a mutually
// exclusive 4th option, so hiding a row from e.g. the Businesses view
// doesn't force a tab switch just to keep seeing it.
export default function NeighborhoodAdminLocationsPage() {
  const { neighborhoodId, slug } = useNeighborhoodAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showHidden, setShowHidden] = useState(true);
  const [categoryGroup, setCategoryGroup] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationListItem[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingPoi, setEditingPoi] = useState<Venue | null>(null);
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

  async function handleCategoryChange(locationId: string, categoryId: string) {
    setSavingId(locationId);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${locationId}/category`),
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

  async function handleStatusChange(locationId: string, status: VenueStatus) {
    setSavingId(locationId);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${locationId}/status`),
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

  // Switch an existing location between business and poi kind in place
  // (BACKLOG.md "POIs and venues managed almost the same") -- replaces the
  // old hide-then-recreate-as-a-new-row "Convert to POI" flow. Blocked (409)
  // while the location is claimed; the API's error message explains why.
  // Switching to "poi" also requires a `type` (apps/api's
  // switchLocationKindForNeighborhood 400s with "missing_type" otherwise,
  // since a business has no `type` of its own to fall back on) -- the
  // caller must prompt for one first when converting a business.
  async function handleSwitchKind(locationId: string, kind: LocationKind, type?: string) {
    setSavingId(locationId);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${locationId}/kind`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(type ? { kind, type } : { kind }),
      }
    );
    setSavingId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    await loadLocations(search);
  }

  function handleSwitchToPoi(loc: LocationListItem) {
    if (loc.claimed_by_business) return;
    const type = window.prompt(
      `What type of point of interest is "${loc.name}"? (e.g. park, landmark, transit)`
    );
    if (!type || !type.trim()) return;
    handleSwitchKind(loc.id, "poi", type.trim());
  }

  async function handleEditPoi(poiId: string) {
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${poiId}`),
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
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${poiId}`),
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

  const categoryGroupById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => {
      if (c.group_name) map.set(c.id, c.group_name);
    });
    return map;
  }, [categories]);

  // Sorted by the same composed label the reassign-category <option> below
  // displays (group, then name) -- the API's own order is by bare leaf name
  // (BACKLOG.md Ref 57), which doesn't read as alphabetical once categories
  // from different groups interleave on screen.
  const sortedCategories = useMemo(
    () =>
      [...(categories ?? [])].sort((a, b) => {
        const groupCompare = (a.group_name ?? "").localeCompare(b.group_name ?? "");
        return groupCompare !== 0 ? groupCompare : a.name.localeCompare(b.name);
      }),
    [categories]
  );

  const categoryGroups = useMemo(
    () => Array.from(new Set((categories ?? []).map((c) => c.group_name).filter((g): g is string => !!g))),
    [categories]
  );

  // Leaf categories within the selected group, for the optional subcategory
  // refinement row -- empty (and thus hidden) until a group is picked.
  const subcategories = useMemo(
    () => (categoryGroup ? (categories ?? []).filter((c) => c.group_name === categoryGroup) : []),
    [categories, categoryGroup]
  );

  function selectCategoryGroup(group: string | null) {
    setCategoryGroup(group);
    setSubcategoryId(null);
  }

  // Counts are of every row for that kind regardless of hidden status --
  // they label the kind toggle, which is independent of the "Show hidden"
  // toggle below, so they shouldn't shift when that toggle flips.
  const counts = {
    all: locations?.length ?? 0,
    business: locations?.filter((l) => l.kind === "business").length ?? 0,
    poi: locations?.filter((l) => l.kind === "poi").length ?? 0,
    hidden: locations?.filter((l) => l.status === "hidden").length ?? 0,
  };

  const filtered =
    locations
      ?.filter((loc) => {
        if (filter === "business") return loc.kind === "business";
        if (filter === "poi") return loc.kind === "poi";
        return true;
      })
      // Hidden rows stay visible in place (dimmed, with a "Hidden" badge, in
      // the row rendering below) when the toggle is on, rather than
      // vanishing the moment an admin hides one -- the toggle just lets it
      // be turned off for a decluttered view.
      .filter((loc) => showHidden || loc.status !== "hidden")
      .filter((loc) => {
        if (!categoryGroup) return true;
        if (loc.kind !== "business") return false;
        if (categoryGroupById.get(loc.category_id ?? "") !== categoryGroup) return false;
        if (subcategoryId && loc.category_id !== subcategoryId) return false;
        return true;
      }) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-5">
        <div className="flex-1">
          <h1 className="font-heading text-4xl font-extrabold">Locations</h1>
          <p className="mt-1 text-[15px] text-body-text">
            Every venue and point of interest in the neighborhood — curate what neighbors see.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddingPoi((prev) => !prev)}
          className="shrink-0 rounded-xl bg-brand-green px-4.5 py-2.75 font-heading text-sm font-bold text-on-accent whitespace-nowrap"
        >
          {addingPoi ? "Cancel" : "+ Add point of interest"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="w-full sm:w-75">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or address"
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
          />
        </form>

        <div className="flex gap-0.5 rounded-xl bg-card-alt p-0.75">
          {(["all", "business", "poi"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.75 text-[13px] font-extrabold ${
                filter === f ? "bg-foreground text-background" : "text-muted-strong"
              }`}
            >
              <span>{f === "all" ? "All" : f === "business" ? "Businesses" : "POIs"}</span>
              <span className="font-mono text-[10px] opacity-65">{counts[f]}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowHidden((prev) => !prev)}
          aria-pressed={showHidden}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.75 text-[13px] font-extrabold ${
            showHidden ? "bg-foreground text-background" : "border-1.5 border-border bg-card text-muted-strong"
          }`}
        >
          <span>Show hidden</span>
          <span className="font-mono text-[10px] opacity-65">{counts.hidden}</span>
        </button>

        <div className="flex-1" />

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => selectCategoryGroup(null)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
              !categoryGroup ? "bg-foreground text-background" : "border-1.5 border-border bg-card text-muted-strong"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-muted" />
            All categories
          </button>
          {categoryGroups.map((group) => {
            const active = categoryGroup === group;
            const color = GROUP_COLORS[group] ?? FALLBACK_GROUP_COLOR;
            return (
              <button
                key={group}
                type="button"
                onClick={() => selectCategoryGroup(active ? null : group)}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.75 text-xs font-extrabold"
                style={
                  active
                    ? { background: color, color: "var(--on-accent)" }
                    : { border: "1.5px solid var(--border)", background: "var(--card)", color: "var(--muted-strong)" }
                }
              >
                <span className="h-2 w-2 rounded-full" style={{ background: active ? "var(--on-accent)" : color }} />
                {group}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory refinement (optional second level within the selected
          group) -- only appears once a category-group chip is active. */}
      {categoryGroup && subcategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-muted">{categoryGroup} ›</span>
          <button
            type="button"
            onClick={() => setSubcategoryId(null)}
            className={`rounded-full px-3 py-1.25 text-xs font-bold ${
              !subcategoryId ? "bg-foreground text-background" : "border border-border bg-card text-muted-strong"
            }`}
          >
            All
          </button>
          {subcategories.map((c) => {
            const active = subcategoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSubcategoryId(active ? null : c.id)}
                className={`rounded-full px-3 py-1.25 text-xs font-bold ${
                  active ? "bg-foreground text-background" : "border border-border bg-card text-muted-strong"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <a
        href={`/neighborhood-admin/${slug}/locations/review`}
        className="self-start text-sm font-bold text-brand-purple hover:text-brand-orange"
      >
        Review Places →
      </a>

      {addingPoi && (
        <PoiForm neighborhoodId={neighborhoodId} onCreated={handlePoiCreated} onCancel={() => setAddingPoi(false)} />
      )}

      {filtered?.length === 0 && <p className="text-sm text-muted">No locations match.</p>}

      <ul className="flex flex-col gap-2.5">
        {filtered?.map((loc) => {
          const group = loc.category_id ? categoryGroupById.get(loc.category_id) : null;
          const color = group ? (GROUP_COLORS[group] ?? FALLBACK_GROUP_COLOR) : FALLBACK_GROUP_COLOR;
          return (
            <li
              key={`${loc.kind}-${loc.id}`}
              className="flex flex-col gap-1.75 rounded-2xl border-2 border-border/60 bg-card px-4 py-3.5"
              style={{ opacity: loc.status === "hidden" ? 0.62 : 1 }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 40 40" className="shrink-0" aria-hidden="true">
                  <path d="M4 22 Q4 6 20 6 Q36 6 36 22 Z" fill={color} />
                  <rect x="16" y="21" width="8" height="15" rx="4" fill="var(--ink)" />
                </svg>
                <span className="font-heading text-[15.5px] font-bold">{loc.name}</span>
                {loc.kind === "business" ? (
                  <span className="rounded-full border border-border bg-card-alt px-2.25 py-0.5 text-[10px] font-extrabold text-muted-strong">
                    Business
                  </span>
                ) : (
                  <span className="rounded-full bg-brand-green/20 px-2.25 py-0.5 text-[10px] font-extrabold text-brand-green">
                    POI
                  </span>
                )}
                {loc.claimed_by_business && (
                  <span className="rounded-full bg-brand-amber/25 px-2.25 py-0.5 text-[10px] font-extrabold text-brand-amber">
                    ✓ Claimed
                  </span>
                )}
                {loc.status === "hidden" && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-extrabold text-muted">
                    Hidden
                  </span>
                )}
              </div>
              <div className="pl-6 font-mono text-[11px] text-muted">{loc.address ?? "No address"}</div>

              {loc.kind === "business" ? (
                <div className="flex flex-wrap items-center gap-2 pl-6">
                  <select
                    value={loc.category_id ?? ""}
                    disabled={!categories || savingId === loc.id}
                    onChange={(e) => handleCategoryChange(loc.id, e.target.value)}
                    className="rounded-lg border border-border bg-card-alt px-2 py-1 text-[13px] text-foreground"
                  >
                    <option value="" disabled>
                      {loc.category_or_type}
                    </option>
                    {sortedCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.group_name ? `${c.group_name} / ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex-1" />

                  {loc.status === "active" ? (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleStatusChange(loc.id, "hidden");
                      }}
                      className="text-xs font-extrabold text-red-600 dark:text-red-400"
                    >
                      Hide
                    </a>
                  ) : (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleStatusChange(loc.id, "active");
                      }}
                      className="text-xs font-extrabold text-brand-green"
                    >
                      Show
                    </a>
                  )}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSwitchToPoi(loc);
                    }}
                    aria-disabled={loc.claimed_by_business}
                    title={loc.claimed_by_business ? "Reject or revoke the business claim first" : undefined}
                    className={`text-xs font-extrabold ${loc.claimed_by_business ? "cursor-not-allowed text-muted opacity-50" : "text-foreground"}`}
                  >
                    → POI
                  </a>

                  {savingId === loc.id && <span className="text-xs font-bold text-muted">Saving…</span>}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3.5 pl-6">
                  <button
                    type="button"
                    disabled={savingId === loc.id}
                    onClick={() => handleEditPoi(loc.id)}
                    className="text-xs font-extrabold text-foreground"
                  >
                    Edit
                  </button>
                  <div className="flex-1" />
                  {loc.status === "active" ? (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleStatusChange(loc.id, "hidden");
                      }}
                      className="text-xs font-extrabold text-red-600 dark:text-red-400"
                    >
                      Hide
                    </a>
                  ) : (
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleStatusChange(loc.id, "active");
                      }}
                      className="text-xs font-extrabold text-brand-green"
                    >
                      Show
                    </a>
                  )}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSwitchKind(loc.id, "business");
                    }}
                    className="text-xs font-extrabold text-foreground"
                  >
                    → Business
                  </a>
                  <button
                    type="button"
                    disabled={savingId === loc.id}
                    onClick={() => handleDeletePoi(loc.id)}
                    className="text-xs font-extrabold text-red-600 dark:text-red-400"
                  >
                    Delete
                  </button>
                  {savingId === loc.id && <span className="text-xs font-bold text-muted">Saving…</span>}
                </div>
              )}

              {editingPoi?.id === loc.id && loc.kind === "poi" && (
                <div className="pl-6">
                  <PoiForm
                    neighborhoodId={neighborhoodId}
                    existing={editingPoi}
                    onUpdated={handlePoiUpdated}
                    onCancel={() => setEditingPoi(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
