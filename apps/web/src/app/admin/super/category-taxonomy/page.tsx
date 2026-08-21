"use client";

import { useEffect, useState } from "react";
import type { CategoryAdminItem } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "ready"; categories: CategoryAdminItem[] }
  | { status: "error"; message: string };

// Category taxonomy tab of the super admin shell (BACKLOG.md Ref 4) --
// create/rename/archive on the category table itself, distinct from
// admin/neighborhood/[neighborhoodSlug]/locations/page.tsx, which only
// reassigns which existing category a venue points to. Moved here (and its
// API gate tightened from adminGate to superAdminGate) from the old
// standalone /admin/category-taxonomy, which had no nav entry point at all
// -- folding it into the super admin shell as a third tab alongside
// Overview/Users so every platform-wide (not neighborhood- or venue-scoped)
// admin concern lives in one place. Signed-in/forbidden handling lives in
// layout.tsx, mirroring the shell's other tabs, which is why this only
// tracks loading/ready/error.
export default function SuperAdminCategoryTaxonomyPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [newGoogleTypes, setNewGoogleTypes] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/category-taxonomy"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load categories" });
        return;
      }
      setState({ status: "ready", categories: await res.json() });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function setCategories(update: (prev: CategoryAdminItem[]) => CategoryAdminItem[]) {
    setState((prev) => (prev.status === "ready" ? { ...prev, categories: update(prev.categories) } : prev));
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setActionError(null);
    const token = await getAccessToken();
    const googleTypes = newGoogleTypes
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch(clientApiUrl("/admin/category-taxonomy"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: newName,
        parent_category_id: newParentId || null,
        google_types: googleTypes,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to create category");
      return;
    }
    const created: CategoryAdminItem = await res.json();
    setCategories((prev) => [...prev, created]);
    setNewName("");
    setNewGoogleTypes("");
  }

  async function handleRenameSubmit(id: string) {
    setBusyId(id);
    setActionError(null);
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/admin/category-taxonomy/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editingName }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to rename category");
      return;
    }
    const updated: CategoryAdminItem = await res.json();
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingId(null);
  }

  async function handleArchive(id: string) {
    setBusyId(id);
    setActionError(null);
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/admin/category-taxonomy/${id}/archive`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to archive category");
      return;
    }
    const updated: CategoryAdminItem = await res.json();
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

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

  const categories = state.categories;
  const groups = categories.filter((c) => c.parent_category_id === null);
  const activeGroups = groups.filter((g) => g.status === "active");
  const leavesByGroup = new Map<string, CategoryAdminItem[]>();
  for (const category of categories) {
    if (category.parent_category_id === null) continue;
    const leaves = leavesByGroup.get(category.parent_category_id) ?? [];
    leaves.push(category);
    leavesByGroup.set(category.parent_category_id, leaves);
  }

  function renderRow(category: CategoryAdminItem, indent: boolean) {
    const isEditing = editingId === category.id;
    const isBusy = busyId === category.id;
    return (
      <li
        key={category.id}
        className={`flex items-center justify-between gap-2 rounded-2xl bg-card-alt px-3 py-2 text-sm ${indent ? "ml-6" : ""}`}
      >
        {isEditing ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleRenameSubmit(category.id);
            }}
          >
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-foreground"
              autoFocus
            />
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-md bg-brand-purple px-3 py-1 font-bold text-on-accent"
            >
              Save
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="px-2 py-1 font-bold text-muted">
              Cancel
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-foreground">{category.name}</span>
              {category.status === "archived" && (
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-bold text-muted-strong">
                  Archived
                </span>
              )}
              {category.google_types.length > 0 && (
                <span className="text-xs font-bold text-muted">{category.google_types.join(", ")}</span>
              )}
            </div>
            {category.status === "active" && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(category.id);
                    setEditingName(category.name);
                  }}
                  disabled={isBusy}
                  className="text-xs font-bold text-brand-purple hover:text-brand-orange"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleArchive(category.id)}
                  disabled={isBusy}
                  className="text-xs font-bold text-red-600 dark:text-red-400"
                >
                  {isBusy ? "Archiving…" : "Archive"}
                </button>
              </div>
            )}
          </>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-5.5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Category taxonomy</h1>
        <p className="mt-1 text-[15px] text-body-text">Create, rename, or archive the categories every neighborhood shares.</p>
      </div>

      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-6 text-sm">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Add category</h2>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          required
          className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
        />
        <select
          value={newParentId}
          onChange={(e) => setNewParentId(e.target.value)}
          className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
        >
          <option value="">— New top-level group —</option>
          {activeGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {newParentId && (
          <input
            value={newGoogleTypes}
            onChange={(e) => setNewGoogleTypes(e.target.value)}
            placeholder="Google Places types, comma-separated (e.g. cafe, coffee_shop)"
            className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
          />
        )}
        <button
          type="submit"
          disabled={creating}
          className="self-start rounded-md bg-brand-purple px-4 py-2 font-bold text-on-accent"
        >
          {creating ? "Adding…" : "Add"}
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            {renderRow(group, false)}
            {(leavesByGroup.get(group.id) ?? []).map((leaf) => renderRow(leaf, true))}
          </div>
        ))}
      </ul>
    </div>
  );
}
