"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategoryOption, LocationKind, LocationListItem, Venue, VenueStatus } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { ActionMenu } from "@/app/ActionMenu";
import { useNeighborhoodAdmin } from "../NeighborhoodAdminContext";
import { AddLocationModal } from "../AddLocationModal";
import { PoiForm } from "../PoiForm";
import { EditLocationModal } from "./EditLocationModal";
import { ReassignPlaceIdPanel } from "./ReassignPlaceIdPanel";

type Filter = "all" | "business" | "poi";

const GROUP_COLORS: Record<string, string> = {
  "Food & Drink": "var(--brand-orange)",
  Retail: "var(--brand-amber)",
  "Health & Wellness": "var(--brand-green)",
  "Arts & Recreation": "var(--brand-purple)",
  Services: "var(--muted)",
};
const FALLBACK_GROUP_COLOR = "var(--muted)";

// Sentinel categoryGroup value (distinct from any real group_name) for the
// "Uncategorized" chip -- surfaces businesses with no category_id at all so
// they're not just silently invisible from every real group's chip, since
// there's no "Unmapped" row in the category-groups list itself to pick.
const UNCATEGORIZED = "__uncategorized__";

// Column widths shared by the header row and every data row so they line up
// -- mirrors the super-admin Users table's ROW_GRID (icon, name/address
// (grows), type, category, status badges, actions). The trailing column is
// a fixed px width, not `auto`, for the same reason as that table's: `auto`
// sizes to each row's own content, and the header's last cell (empty) is
// narrower than a data row's (ActionMenu's three-dot button), which would
// otherwise drift the fr() columns out of alignment between the two rows.
// No overflow-x-auto wrapper around the list (unlike that Users table) --
// setting overflow-x without overflow-y computes overflow-y to `auto` too
// (CSS spec quirk), which clipped ActionMenu's dropdown and its trigger
// button against the resulting scroll container. These columns comfortably
// fit without horizontal scrolling, so the wrapper wasn't earning its keep.
const ROW_GRID = "grid-cols-[28px_minmax(160px,1.8fr)_84px_minmax(120px,1fr)_112px_44px]";
const HEADER_ROW_CLASS = `grid ${ROW_GRID} items-center gap-3 border-2 border-transparent px-4 text-[10px] font-extrabold tracking-wide text-muted uppercase`;

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
// category filter is business-only (POIs carry no classification of their
// own) per Ref 56's open question, so the chips only render on the
// Businesses tab and are cleared on switching to POIs. Selecting a group
// chip reveals an optional second-level row of that group's leaf categories
// (subcategoryId) for finer-grained filtering -- reset whenever the group
// selection changes so a stale subcategory can't silently filter out
// everything in a newly-selected group.
//
// Kind is an All/Businesses/POIs toggle, and hidden-visibility is an
// independent axis, not part of the toggle -- "show hidden" combines with
// whichever kind is selected, so hiding a row from e.g. the Businesses view
// doesn't force a tab switch just to keep seeing it. Defaults to All/hidden
// rows excluded, so opening the tab shows what a neighbor would actually see
// rather than the full curation surface up front.
//
// Import Locations / Reported venues / Investigate a missing venue used
// to be a button + two links cluttering this header -- they're now reached
// via the sidebar's Locations sub-nav instead (../layout.tsx's TABS), same
// pattern as the super-admin Monitoring section, leaving this page just the
// list and the one action (Add location) that actually belongs here. "+ Add
// location" moved from an inline POI-only form pushed into the list to a
// modal (AddLocationModal) with a POI/Business kind toggle, so opening it
// doesn't shove every row down and businesses can be added manually too.
export default function NeighborhoodAdminLocationsPage() {
  const { neighborhoodId } = useNeighborhoodAdmin();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [categoryGroup, setCategoryGroup] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationListItem[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingPoi, setEditingPoi] = useState<Venue | null>(null);
  const [addingLocation, setAddingLocation] = useState(false);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

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
  async function handleSwitchKind(locationId: string, kind: LocationKind) {
    setSavingId(locationId);
    setError(null);
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/${locationId}/kind`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind }),
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
    handleSwitchKind(loc.id, "poi");
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

  function handleReassigned() {
    setReassigningId(null);
    loadLocations(search);
  }

  function handleLocationCreated() {
    setAddingLocation(false);
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

  // Independent of categoryGroup (unlike the group chips, which only cover
  // businesses that already have a category) so the "Uncategorized" chip's
  // own count doesn't disappear once it's the active filter -- still
  // respects showHidden, same as the type-toggle counts above.
  const uncategorizedCount = useMemo(
    () =>
      (locations ?? []).filter(
        (l) => l.kind === "business" && l.category_id === null && (showHidden || l.status !== "hidden")
      ).length,
    [locations, showHidden]
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

  // Category chips are business-only and hidden outside the Businesses tab
  // -- clear them on switching away so a category picked earlier can't
  // silently zero out the All/POIs list (categoryFiltered excludes
  // non-business rows whenever a group is set).
  function selectFilter(next: Filter) {
    setFilter(next);
    if (next !== "business") {
      setCategoryGroup(null);
      setSubcategoryId(null);
    }
  }

  // Category filter applied first, since it's the one axis the counts below
  // must reflect -- an admin who picks a category chip expects the kind and
  // hidden counts to describe that narrowed set, not the whole neighborhood.
  const categoryFiltered =
    locations?.filter((loc) => {
      if (!categoryGroup) return true;
      if (loc.kind !== "business") return false;
      if (categoryGroup === UNCATEGORIZED) return loc.category_id === null;
      if (categoryGroupById.get(loc.category_id ?? "") !== categoryGroup) return false;
      if (subcategoryId && loc.category_id !== subcategoryId) return false;
      return true;
    }) ?? null;

  // "Show hidden" is applied next, before the kind counts, so All/
  // Businesses/POIs reflect whatever this toggle currently includes --
  // hidden rows stay visible in place (dimmed, with a "Hidden" badge, in
  // the row rendering below) when the toggle is on, rather than vanishing
  // the moment an admin hides one, and the counts track that.
  const visibleFiltered = categoryFiltered?.filter((loc) => showHidden || loc.status !== "hidden") ?? null;

  const counts = {
    all: visibleFiltered?.length ?? 0,
    business: visibleFiltered?.filter((l) => l.kind === "business").length ?? 0,
    poi: visibleFiltered?.filter((l) => l.kind === "poi").length ?? 0,
  };

  const filtered =
    visibleFiltered?.filter((loc) => {
      if (filter === "business") return loc.kind === "business";
      if (filter === "poi") return loc.kind === "poi";
      return true;
    }) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-50 flex-1">
          <p className="text-[15px] text-body-text">
            Every venue and point of interest in the neighborhood — curate what neighbors see.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddingLocation(true)}
          className="shrink-0 rounded-xl bg-brand-green px-4.5 py-2.75 font-heading text-sm font-bold text-on-accent whitespace-nowrap"
        >
          + Add location
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
              onClick={() => selectFilter(f)}
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
        </button>

        <div className="flex-1" />

        {/* Category chips are business-only (POIs carry no classification
            of their own), so they only render on the Businesses tab. */}
        {filter === "business" && (
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
            {uncategorizedCount > 0 && (
              <button
                type="button"
                onClick={() => selectCategoryGroup(categoryGroup === UNCATEGORIZED ? null : UNCATEGORIZED)}
                className={`flex items-center gap-1.5 rounded-full border-1.5 border-dashed px-3.5 py-1.75 text-xs font-extrabold ${
                  categoryGroup === UNCATEGORIZED
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-card text-muted-strong"
                }`}
              >
                Uncategorized
                <span className="font-mono text-[10px] opacity-65">{uncategorizedCount}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Subcategory refinement (optional second level within the selected
          group) -- only appears once a category-group chip is active. */}
      {filter === "business" && categoryGroup && subcategories.length > 0 && (
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

      {addingLocation && (
        <AddLocationModal
          neighborhoodId={neighborhoodId}
          onCreated={handleLocationCreated}
          onClose={() => setAddingLocation(false)}
        />
      )}

      {filtered?.length === 0 && <p className="text-sm text-muted">No locations match.</p>}

      <div className="flex flex-col gap-2">
        <div className={HEADER_ROW_CLASS}>
          <span />
          <span>Location</span>
          <span>Type</span>
          <span>Category</span>
          <span>Status</span>
          <span />
        </div>

        <ul className="flex flex-col gap-2">
          {filtered?.map((loc) => {
            const group = loc.category_id ? categoryGroupById.get(loc.category_id) : null;
            const color = group ? (GROUP_COLORS[group] ?? FALLBACK_GROUP_COLOR) : FALLBACK_GROUP_COLOR;
            const menuItems =
              loc.kind === "business"
                ? [
                    {
                      label: loc.status === "active" ? "Hide" : "Show",
                      onSelect: () => handleStatusChange(loc.id, loc.status === "active" ? "hidden" : "active"),
                    },
                    {
                      label: "Edit",
                      onSelect: () => setEditingLocationId(loc.id),
                      disabled: savingId === loc.id,
                    },
                    {
                      label: "Convert to POI",
                      onSelect: () => handleSwitchToPoi(loc),
                      disabled: loc.claimed_by_business,
                      title: loc.claimed_by_business ? "Reject or revoke the business claim first" : undefined,
                    },
                  ]
                : [
                    { label: "Edit", onSelect: () => handleEditPoi(loc.id), disabled: savingId === loc.id },
                    {
                      label: loc.status === "active" ? "Hide" : "Show",
                      onSelect: () => handleStatusChange(loc.id, loc.status === "active" ? "hidden" : "active"),
                    },
                    { label: "Convert to Business", onSelect: () => handleSwitchKind(loc.id, "business") },
                    {
                      label: "Reassign place ID",
                      onSelect: () => setReassigningId(reassigningId === loc.id ? null : loc.id),
                    },
                    {
                      label: "Delete",
                      onSelect: () => handleDeletePoi(loc.id),
                      disabled: savingId === loc.id,
                      destructive: true,
                    },
                  ];

            return (
              <li
                key={`${loc.kind}-${loc.id}`}
                className={`grid ${ROW_GRID} items-center gap-3 rounded-2xl border-2 border-border/60 bg-card px-4 py-3`}
                style={{ opacity: loc.status === "hidden" ? 0.62 : 1 }}
              >
                <svg width="16" height="16" viewBox="0 0 40 40" className="shrink-0" aria-hidden="true">
                  <path d="M4 22 Q4 6 20 6 Q36 6 36 22 Z" fill={color} />
                  <rect x="16" y="21" width="8" height="15" rx="4" fill="var(--ink)" />
                </svg>

                <div className="flex min-w-0 flex-col">
                  <span className="flex min-w-0 items-center gap-1.25 font-heading text-[15px] font-bold">
                    <span className="truncate">{loc.name}</span>
                    <span
                      className={`shrink-0 ${loc.osm_id !== null ? "text-brand-green" : "text-muted/50"}`}
                      title={
                        loc.osm_id !== null
                          ? "Connected to a known location — richer details (hours, phone, website) may be available"
                          : "Not connected to a known location — no enrichment source, added by hand"
                      }
                    >
                      {loc.osm_id !== null ? (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M9 15l6-6" />
                          <path d="M11 6l1-1a4 4 0 0 1 5.5 5.5l-1 1" />
                          <path d="M13 18l-1 1a4 4 0 0 1-5.5-5.5l1-1" />
                        </svg>
                      ) : (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <circle cx="10" cy="10" r="7" />
                          <line x1="5" y1="15" x2="15" y2="5" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="truncate font-mono text-[11px] text-muted">{loc.address ?? "No address"}</span>
                </div>

                <span
                  className={`w-fit rounded-full px-2.25 py-0.5 text-[10px] font-extrabold ${
                    loc.kind === "business" ? "bg-brand-amber/20 text-brand-amber" : "bg-brand-purple/20 text-brand-purple"
                  }`}
                >
                  {loc.kind === "business" ? "Business" : "POI"}
                </span>

                <span className="truncate font-mono text-[11px] text-muted">{loc.category_or_type}</span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {loc.claimed_by_business && (
                    <span className="w-fit rounded-full bg-brand-green/20 px-2.25 py-0.5 text-[10px] font-extrabold text-brand-green">
                      ✓ Claimed
                    </span>
                  )}
                  {loc.status === "hidden" && (
                    <span className="w-fit rounded-full border border-border px-2 py-0.5 text-[10px] font-extrabold text-muted">
                      Hidden
                    </span>
                  )}
                  {savingId === loc.id && <span className="text-[10px] font-bold text-muted">Saving…</span>}
                </div>

                <ActionMenu items={menuItems} />

                {editingPoi?.id === loc.id && loc.kind === "poi" && (
                  <div className="col-span-full pt-1">
                    <PoiForm
                      neighborhoodId={neighborhoodId}
                      existing={editingPoi}
                      onUpdated={handlePoiUpdated}
                      onCancel={() => setEditingPoi(null)}
                    />
                  </div>
                )}

                {reassigningId === loc.id && (
                  <div className="col-span-full pt-1">
                    <ReassignPlaceIdPanel
                      neighborhoodId={neighborhoodId}
                      locationId={loc.id}
                      onReassigned={handleReassigned}
                      onCancel={() => setReassigningId(null)}
                    />
                  </div>
                )}

                {editingLocationId === loc.id && (
                  <EditLocationModal
                    neighborhoodId={neighborhoodId}
                    location={loc}
                    categories={categories}
                    sortedCategories={sortedCategories}
                    saving={savingId === loc.id}
                    onCategoryChange={(categoryId) => handleCategoryChange(loc.id, categoryId)}
                    onReassigned={() => loadLocations(search)}
                    onClose={() => setEditingLocationId(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
