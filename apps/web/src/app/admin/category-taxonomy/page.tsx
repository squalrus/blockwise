"use client";

import { useEffect, useState } from "react";
import type { CategoryAdminItem } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type TokenState = { status: "loading" } | { status: "signed_out" } | { status: "ready"; token: string };

// Internal-only page (BACKLOG.md Ref 4) for maintaining the category
// taxonomy itself -- create/rename/archive -- distinct from
// admin/venues/page.tsx, which only reassigns which existing category a
// venue points to. Gated by the same requireAdmin middleware/session token
// as every other admin page (see admin/venues/page.tsx for the pattern this
// mirrors).
export default function AdminCategoryTaxonomyPage() {
  const [tokenState, setTokenState] = useState<TokenState>({ status: "loading" });
  const [categories, setCategories] = useState<CategoryAdminItem[] | null>(null);
  const [error, setError] = useState<"unauthorized" | "forbidden" | "failed" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [newGoogleTypes, setNewGoogleTypes] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getAccessToken().then((token) => setTokenState(token ? { status: "ready", token } : { status: "signed_out" }));
  }, []);

  async function loadCategories(activeToken: string) {
    setError(null);
    const res = await fetch(clientApiUrl("/admin/category-taxonomy"), {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    if (res.status === 401) {
      setError("unauthorized");
      setCategories(null);
      return;
    }
    if (res.status === 403) {
      setError("forbidden");
      setCategories(null);
      return;
    }
    if (!res.ok) {
      setError("failed");
      return;
    }
    setCategories(await res.json());
  }

  useEffect(() => {
    // No data-fetching library in this app yet -- mirrors admin/venues/page.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tokenState.status === "ready") loadCategories(tokenState.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenState]);

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tokenState.status !== "ready") return;
    setCreating(true);
    setActionError(null);
    const googleTypes = newGoogleTypes
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch(clientApiUrl("/admin/category-taxonomy"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenState.token}` },
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
    setCategories((prev) => (prev ? [...prev, created] : [created]));
    setNewName("");
    setNewGoogleTypes("");
  }

  async function handleRenameSubmit(id: string) {
    if (tokenState.status !== "ready") return;
    setBusyId(id);
    setActionError(null);
    const res = await fetch(clientApiUrl(`/admin/category-taxonomy/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenState.token}` },
      body: JSON.stringify({ name: editingName }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to rename category");
      return;
    }
    const updated: CategoryAdminItem = await res.json();
    setCategories((prev) => prev?.map((c) => (c.id === id ? updated : c)) ?? null);
    setEditingId(null);
  }

  async function handleArchive(id: string) {
    if (tokenState.status !== "ready") return;
    setBusyId(id);
    setActionError(null);
    const res = await fetch(clientApiUrl(`/admin/category-taxonomy/${id}/archive`), {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenState.token}` },
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to archive category");
      return;
    }
    const updated: CategoryAdminItem = await res.json();
    setCategories((prev) => prev?.map((c) => (c.id === id ? updated : c)) ?? null);
  }

  if (tokenState.status === "loading") return null;

  if (tokenState.status === "signed_out") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 font-sans sm:p-16">
        <h1 className="font-heading text-xl font-extrabold text-foreground">Admin: category taxonomy</h1>
        <p className="text-sm text-muted">
          You need to be signed in to view this page.{" "}
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>
        </p>
      </div>
    );
  }

  if (error === "forbidden") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 font-sans sm:p-16">
        <h1 className="font-heading text-xl font-extrabold text-foreground">Admin: category taxonomy</h1>
        <p className="text-sm text-muted">
          You&apos;re signed in, but your account isn&apos;t a neighborhood admin.
        </p>
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 font-sans sm:p-16">
        <h1 className="font-heading text-xl font-extrabold text-foreground">Admin: category taxonomy</h1>
        <p className="text-sm text-muted">
          Your session expired.{" "}
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>{" "}
          again.
        </p>
      </div>
    );
  }

  const groups = (categories ?? []).filter((c) => c.parent_category_id === null);
  const activeGroups = groups.filter((g) => g.status === "active");
  const leavesByGroup = new Map<string, CategoryAdminItem[]>();
  for (const category of categories ?? []) {
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 font-sans sm:p-16">
      <h1 className="font-heading text-xl font-extrabold text-foreground">Admin: category taxonomy</h1>

      {error === "failed" && <p className="text-sm text-red-600 dark:text-red-400">Something went wrong.</p>}
      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2 rounded-xl bg-card-alt p-4 text-sm">
        <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">Add category</h2>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          required
          className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
        />
        <select
          value={newParentId}
          onChange={(e) => setNewParentId(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
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
            className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
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
