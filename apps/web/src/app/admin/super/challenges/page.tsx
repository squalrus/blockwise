"use client";

import { useEffect, useState } from "react";
import type {
  Badge,
  CategoryAdminItem,
  ChallengeAdminItem,
  NeighborhoodSummary,
} from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { AdminModal } from "../../AdminModal";
import { BADGE_ICONS, BadgeIcon } from "../../../BadgeIcon";

const ICON_OPTIONS = Object.entries(BADGE_ICONS).sort((a, b) => a[0].localeCompare(b[0]));

// Badge picker sentinel: the same <select> that lets an admin attach an
// existing badge also offers "+ Create new badge", so add/edit of the badge
// itself happens inline with the challenge (rather than only via the
// separate /admin/super/badges page, which stays fully intact for
// standalone badge management). Picking an existing badge pre-fills its
// name/description/icon as editable fields too, so both "new" and "existing"
// selections can have their badge fields tweaked right here before saving.
const NEW_BADGE_SENTINEL = "__new__";

// Scope pill color coding mirrors the super-admin Badges tab (admin/super/
// badges/page.tsx's scopeLabel/scope styling) -- brand-purple for
// neighborhood-scoped, brand-green for app-wide, so the same color always
// means the same thing across both admin surfaces.
function scopePillClass(neighborhoodId: string | null): string {
  return neighborhoodId ? "bg-brand-purple text-on-accent" : "bg-brand-green text-on-accent";
}

type State =
  | { status: "loading" }
  | {
      status: "ready";
      challenges: ChallengeAdminItem[];
      neighborhoods: NeighborhoodSummary[];
      categories: CategoryAdminItem[];
      badges: Badge[];
    }
  | { status: "error"; message: string };

// Local (browser) datetime-local input <-> ISO 8601 conversion, mirroring
// how other admin forms with a date/time input in this codebase round-trip
// (e.g. business coupon/event forms) -- <input type="datetime-local"> both
// reads and writes "YYYY-MM-DDTHH:mm" with no timezone, so it's converted to
// a real Date at both edges rather than trusting the string directly.
function toInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputValue(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

const TARGET_TYPE_LABEL: Record<string, string> = {
  any_poi: "Any POI",
  any_activity: "Any check-in",
  poi: "Specific venue",
  category: "Category",
};

async function authedFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  return fetch(clientApiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
  });
}

// Super admin's Challenges tab (BACKLOG.md Ref 108) -- minimal authoring for
// both app-wide and neighborhood-specific challenges. Scope and target
// composition (category vs. "any"/"poi") are create-only; existing rows
// only expose the reward/copy fields for editing (see updateChallengeForAdmin
// in the API). Every challenge before this shipped was a hand-written SQL
// migration row -- this is the first UI that can create one. Create/edit
// both open in a modal (AdminModal) rather than an inline form.
export default function SuperAdminChallengesPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newNeighborhoodId, setNewNeighborhoodId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTargetMode, setNewTargetMode] = useState<"category" | "kind">("category");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newTargetKind, setNewTargetKind] = useState<"poi" | "any">("any");
  const [newTargetCount, setNewTargetCount] = useState("3");
  const [newTargetCountLive, setNewTargetCountLive] = useState(false);
  const [newPointsReward, setNewPointsReward] = useState("25");
  // "" = no badge, NEW_BADGE_SENTINEL = create a new one, otherwise an
  // existing badge's id -- see NEW_BADGE_SENTINEL comment above.
  const [newBadgeSelection, setNewBadgeSelection] = useState("");
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeDescription, setNewBadgeDescription] = useState("");
  const [newBadgeIcon, setNewBadgeIcon] = useState("");
  const [newStartsAt, setNewStartsAt] = useState(() => toInputValue(new Date().toISOString()));
  const [newEndsAt, setNewEndsAt] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetMode, setEditTargetMode] = useState<"category" | "kind">("category");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editTargetKind, setEditTargetKind] = useState<"poi" | "any">("any");
  const [editTargetCount, setEditTargetCount] = useState("");
  const [editTargetCountLive, setEditTargetCountLive] = useState(false);
  const [editPointsReward, setEditPointsReward] = useState("");
  const [editBadgeSelection, setEditBadgeSelection] = useState("");
  const [editBadgeName, setEditBadgeName] = useState("");
  const [editBadgeDescription, setEditBadgeDescription] = useState("");
  const [editBadgeIcon, setEditBadgeIcon] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");

  // "all" | "global" (app-wide) | a specific neighborhood_id -- mirrors the
  // Badges tab's own Scope filter.
  const [scopeFilter, setScopeFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [challengesRes, neighborhoodsRes, categoriesRes, badgesRes] = await Promise.all([
        authedFetch("/admin/challenges"),
        authedFetch("/neighborhoods"),
        authedFetch("/admin/category-taxonomy"),
        authedFetch("/badges"),
      ]);
      if (cancelled) return;
      if (!challengesRes.ok || !neighborhoodsRes.ok || !categoriesRes.ok || !badgesRes.ok) {
        setState({ status: "error", message: "Failed to load challenges" });
        return;
      }
      setState({
        status: "ready",
        challenges: await challengesRes.json(),
        neighborhoods: await neighborhoodsRes.json(),
        categories: await categoriesRes.json(),
        badges: await badgesRes.json(),
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function setChallenges(update: (prev: ChallengeAdminItem[]) => ChallengeAdminItem[]) {
    setState((prev) => (prev.status === "ready" ? { ...prev, challenges: update(prev.challenges) } : prev));
  }

  // A live target only applies to a kind="poi" challenge -- reset it
  // whenever the target mode moves away from "kind", so a stale live flag
  // can't sneak through on a category challenge. The kind dropdown itself
  // folds "poi" + live into one option ("All POIs") rather than a separate
  // checkbox -- see the <select> below.
  function handleTargetModeChange(mode: "category" | "kind") {
    setNewTargetMode(mode);
    if (mode !== "kind") setNewTargetCountLive(false);
  }
  function handleEditTargetModeChange(mode: "category" | "kind") {
    setEditTargetMode(mode);
    if (mode !== "kind") setEditTargetCountLive(false);
  }
  function handleTargetKindOptionChange(value: "any" | "poi" | "poi_live") {
    setNewTargetKind(value === "any" ? "any" : "poi");
    setNewTargetCountLive(value === "poi_live");
  }
  function handleEditTargetKindOptionChange(value: "any" | "poi" | "poi_live") {
    setEditTargetKind(value === "any" ? "any" : "poi");
    setEditTargetCountLive(value === "poi_live");
  }

  // Picking an existing badge from the dropdown loads its current
  // name/description/icon into the editable fields below it, so switching
  // the selection always shows what would actually be saved.
  function handleNewBadgeSelectionChange(value: string) {
    setNewBadgeSelection(value);
    const picked = value && value !== NEW_BADGE_SENTINEL ? badges.find((b) => b.id === value) : null;
    setNewBadgeName(picked?.name ?? "");
    setNewBadgeDescription(picked?.description ?? "");
    setNewBadgeIcon(picked?.icon ?? "");
  }

  function handleEditBadgeSelectionChange(value: string) {
    setEditBadgeSelection(value);
    const picked = value && value !== NEW_BADGE_SENTINEL ? badges.find((b) => b.id === value) : null;
    setEditBadgeName(picked?.name ?? "");
    setEditBadgeDescription(picked?.description ?? "");
    setEditBadgeIcon(picked?.icon ?? "");
  }

  function upsertBadge(badge: Badge) {
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      const exists = prev.badges.some((b) => b.id === badge.id);
      return { ...prev, badges: exists ? prev.badges.map((b) => (b.id === badge.id ? badge : b)) : [...prev.badges, badge] };
    });
  }

  // Resolves the badge_id to send with a challenge create/update, creating
  // or updating a badge first via the existing /admin/badges endpoints when
  // the admin chose to add or edit one inline. A new badge is scoped to
  // match the challenge's own neighborhood, mirroring the forced pairing on
  // the neighborhood-admin Challenges page. Returns null on failure (after
  // setting actionError) so the caller can bail out of the challenge save.
  async function resolveBadgeId(
    selection: string,
    fields: { name: string; description: string; icon: string },
    neighborhoodId: string | null,
  ): Promise<{ ok: true; badgeId: string | null } | { ok: false }> {
    if (!selection) return { ok: true, badgeId: null };
    if (selection === NEW_BADGE_SENTINEL) {
      const res = await authedFetch("/admin/badges", {
        method: "POST",
        body: JSON.stringify({
          name: fields.name,
          description: fields.description || null,
          icon: fields.icon || null,
          neighborhood_id: neighborhoodId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setActionError(body?.error ?? "Failed to create badge");
        return { ok: false };
      }
      const createdBadge: Badge = await res.json();
      upsertBadge(createdBadge);
      return { ok: true, badgeId: createdBadge.id };
    }
    const res = await authedFetch(`/admin/badges/${selection}`, {
      method: "PATCH",
      body: JSON.stringify({ name: fields.name, description: fields.description || null, icon: fields.icon || null }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to update badge");
      return { ok: false };
    }
    const updatedBadge: Badge = await res.json();
    upsertBadge(updatedBadge);
    return { ok: true, badgeId: selection };
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setActionError(null);

    const neighborhoodId = newNeighborhoodId || null;
    const badgeResult = await resolveBadgeId(
      newBadgeSelection,
      { name: newBadgeName, description: newBadgeDescription, icon: newBadgeIcon },
      neighborhoodId,
    );
    if (!badgeResult.ok) {
      setCreating(false);
      return;
    }

    const res = await authedFetch("/admin/challenges", {
      method: "POST",
      body: JSON.stringify({
        neighborhood_id: neighborhoodId,
        title: newTitle,
        description: newDescription || null,
        category_id: newTargetMode === "category" ? newCategoryId || null : null,
        target_kind: newTargetMode === "kind" ? newTargetKind : null,
        target_count: newTargetCountLive ? 1 : Number(newTargetCount),
        target_count_live: newTargetCountLive,
        points_reward: Number(newPointsReward),
        badge_id: badgeResult.badgeId,
        starts_at: fromInputValue(newStartsAt),
        ends_at: fromInputValue(newEndsAt),
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to create challenge");
      return;
    }
    const created: ChallengeAdminItem = await res.json();
    setChallenges((prev) => [created, ...prev]);
    setNewTitle("");
    setNewDescription("");
    setNewCategoryId("");
    setNewBadgeSelection("");
    setNewBadgeName("");
    setNewBadgeDescription("");
    setNewBadgeIcon("");
    setNewEndsAt("");
    setNewTargetCountLive(false);
    setCreateOpen(false);
  }

  function startEdit(challenge: ChallengeAdminItem) {
    setEditingId(challenge.id);
    setEditTitle(challenge.title);
    setEditDescription(challenge.description ?? "");
    setEditTargetMode(challenge.category_id === null ? "kind" : "category");
    setEditCategoryId(challenge.category_id ?? "");
    setEditTargetKind(challenge.target_type === "any_activity" ? "any" : "poi");
    setEditTargetCount(String(challenge.target_count));
    setEditTargetCountLive(challenge.target_count_live);
    setEditPointsReward(String(challenge.points_reward));
    setEditBadgeSelection(challenge.badge?.id ?? "");
    setEditBadgeName(challenge.badge?.name ?? "");
    setEditBadgeDescription(challenge.badge?.description ?? "");
    setEditBadgeIcon(challenge.badge?.icon ?? "");
    setEditEndsAt(toInputValue(challenge.ends_at));
  }

  async function handleEditSubmit(id: string, neighborhoodId: string | null) {
    setBusyId(id);
    setActionError(null);

    const badgeResult = await resolveBadgeId(
      editBadgeSelection,
      { name: editBadgeName, description: editBadgeDescription, icon: editBadgeIcon },
      neighborhoodId,
    );
    if (!badgeResult.ok) {
      setBusyId(null);
      return;
    }

    const res = await authedFetch(`/admin/challenges/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editTitle,
        description: editDescription || null,
        category_id: editTargetMode === "category" ? editCategoryId || null : null,
        target_kind: editTargetMode === "kind" ? editTargetKind : null,
        target_count: editTargetCountLive ? 1 : Number(editTargetCount),
        target_count_live: editTargetCountLive,
        points_reward: Number(editPointsReward),
        badge_id: badgeResult.badgeId,
        ends_at: fromInputValue(editEndsAt),
      }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to update challenge");
      return;
    }
    const updated: ChallengeAdminItem = await res.json();
    setChallenges((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingId(null);
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

  const { challenges, neighborhoods, badges } = state;
  const leafCategories = state.categories
    .filter((c) => c.parent_category_id !== null && c.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name));

  const appWide = challenges.filter((c) => c.neighborhood_id === null);
  const neighborhoodSpecific = challenges.filter((c) => c.neighborhood_id !== null);
  const filteredNeighborhoodName = neighborhoods.find((n) => n.id === scopeFilter)?.name ?? null;
  const scopedChallenges =
    scopeFilter === "all" ? null : scopeFilter === "global" ? appWide : challenges.filter((c) => c.neighborhood_id === scopeFilter);
  const editingChallenge = challenges.find((c) => c.id === editingId) ?? null;

  function renderRow(challenge: ChallengeAdminItem) {
    return (
      <li key={challenge.id} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            {challenge.badge && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-base">
                <BadgeIcon icon={challenge.badge.icon} name={challenge.badge.name} />
              </span>
            )}
            <div className="min-w-0">
              <span className="font-extrabold text-foreground">{challenge.title}</span>
              {challenge.description && <p className="mt-1 text-body-text">{challenge.description}</p>}
            </div>
          </div>
          <button
            onClick={() => startEdit(challenge)}
            className="shrink-0 text-xs font-bold text-brand-purple hover:text-brand-orange"
          >
            Edit
          </button>
        </div>
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
          <span className={`rounded-full px-2 py-0.5 ${scopePillClass(challenge.neighborhood_id)}`}>
            {challenge.neighborhood_name ?? "Global"}
          </span>
          <span className="rounded-full border border-border bg-card px-2 py-0.5">
            {challenge.category_name ??
              challenge.poi_name ??
              (challenge.target_count_live ? "All POI" : TARGET_TYPE_LABEL[challenge.target_type]) ??
              challenge.target_type}{" "}
            · {challenge.target_count} · +{challenge.points_reward} pts
          </span>
          <span>
            {new Date(challenge.starts_at).toLocaleDateString()} –{" "}
            {challenge.ends_at ? new Date(challenge.ends_at).toLocaleDateString() : "indefinite"}
          </span>
        </p>
        {challenge.badge && (
          <p className="text-xs text-muted">
            Badge: {challenge.badge.name}
            {challenge.badge.description ? ` — ${challenge.badge.description}` : ""}
          </p>
        )}
      </li>
    );
  }

  function renderSection(label: string, list: ChallengeAdminItem[]) {
    if (list.length === 0) {
      return (
        <div key={label} className="flex flex-col gap-2">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">{label} (0)</h2>
          <p className="text-sm text-muted">None yet.</p>
        </div>
      );
    }
    // Collapsible via native <details> -- open by default so nothing changes
    // for anyone who doesn't interact, but e.g. "App-wide" can be closed to
    // focus on one neighborhood's own challenges, mirroring the Badges tab's
    // family groups.
    return (
      <details key={label} open className="group flex flex-col gap-2">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-extrabold tracking-wide text-muted uppercase [&::-webkit-details-marker]:hidden">
          <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0 transition-transform group-open:rotate-90" aria-hidden="true">
            <path d="M2.5 1 7.5 5 2.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {label} ({list.length})
        </summary>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{list.map(renderRow)}</ul>
      </details>
    );
  }

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl font-extrabold">Challenges</h1>
          <p className="mt-1 text-[15px] text-body-text">
            Create app-wide or neighborhood-specific challenges. Scope can&apos;t be changed after creation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent"
        >
          + New challenge
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
        Scope
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="rounded-md border border-border bg-card-alt px-3 py-1.5 font-normal text-foreground"
        >
          <option value="all">All ({challenges.length})</option>
          <option value="global">Global ({appWide.length})</option>
          {neighborhoods
            .filter((n) => neighborhoodSpecific.some((c) => c.neighborhood_id === n.id))
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
        </select>
      </label>

      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      <AdminModal open={createOpen} onClose={() => setCreateOpen(false)} title="New challenge">
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            required
            className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
          />

          <label className="mt-1 text-xs font-extrabold text-muted">Scope</label>
          <select
            value={newNeighborhoodId}
            onChange={(e) => setNewNeighborhoodId(e.target.value)}
            className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
          >
            <option value="">App-wide (every neighborhood)</option>
            {neighborhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>

          <label className="mt-1 text-xs font-extrabold text-muted">Target</label>
          <div className="flex gap-2">
            <select
              value={newTargetMode}
              onChange={(e) => handleTargetModeChange(e.target.value as "category" | "kind")}
              className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
            >
              <option value="category">Category</option>
              <option value="kind">Any POI / any check-in</option>
            </select>
            {newTargetMode === "category" ? (
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                required
                className="flex-1 rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
              >
                <option value="">— Choose a category —</option>
                {leafCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={newTargetCountLive ? "poi_live" : newTargetKind}
                onChange={(e) => handleTargetKindOptionChange(e.target.value as "any" | "poi" | "poi_live")}
                className="flex-1 rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
              >
                <option value="any">Any check-in</option>
                <option value="poi">Any POI</option>
                <option value="poi_live">All POIs (target count tracks however many are currently active)</option>
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <label className="flex-1 text-xs font-extrabold text-muted">
              Target count
              <input
                type="number"
                min={1}
                value={newTargetCountLive ? "" : newTargetCount}
                onChange={(e) => setNewTargetCount(e.target.value)}
                required={!newTargetCountLive}
                disabled={newTargetCountLive}
                placeholder={newTargetCountLive ? "Computed automatically" : undefined}
                className="mt-1 w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground disabled:opacity-50"
              />
            </label>
            <label className="flex-1 text-xs font-extrabold text-muted">
              Points reward
              <input
                type="number"
                min={0}
                value={newPointsReward}
                onChange={(e) => setNewPointsReward(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <label className="flex-1 text-xs font-extrabold text-muted">
              Starts
              <input
                type="datetime-local"
                value={newStartsAt}
                onChange={(e) => setNewStartsAt(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground"
              />
            </label>
            <label className="flex-1 text-xs font-extrabold text-muted">
              Ends (optional -- blank runs indefinitely)
              <span className="mt-1 flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={newEndsAt}
                  onChange={(e) => setNewEndsAt(e.target.value)}
                  className="w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground"
                />
                {newEndsAt && (
                  <button
                    type="button"
                    onClick={() => setNewEndsAt("")}
                    className="shrink-0 text-[11px] font-bold text-muted hover:text-brand-orange"
                  >
                    Clear
                  </button>
                )}
              </span>
            </label>
          </div>

          <label className="text-xs font-extrabold text-muted">
            Badge (optional)
            <select
              value={newBadgeSelection}
              onChange={(e) => handleNewBadgeSelectionChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground"
            >
              <option value="">No badge</option>
              <option value={NEW_BADGE_SENTINEL}>+ Create new badge</option>
              {badges.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          {newBadgeSelection && (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-card-alt/50 p-3">
              <input
                value={newBadgeName}
                onChange={(e) => setNewBadgeName(e.target.value)}
                placeholder="Badge name"
                required
                className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
              />
              <textarea
                value={newBadgeDescription}
                onChange={(e) => setNewBadgeDescription(e.target.value)}
                placeholder="Badge description (optional)"
                rows={2}
                className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
              />
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-lg">
                  <BadgeIcon icon={newBadgeIcon || null} name={newBadgeName || "Preview"} />
                </span>
                <select
                  value={newBadgeIcon}
                  onChange={(e) => setNewBadgeIcon(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
                >
                  <option value="">No icon</option>
                  {ICON_OPTIONS.map(([code, glyph]) => (
                    <option key={code} value={code}>
                      {glyph} {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-1 flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="self-start rounded-md bg-brand-purple px-4 py-2 font-bold text-on-accent"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button type="button" onClick={() => setCreateOpen(false)} className="self-start px-2 py-2 font-bold text-muted">
              Cancel
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal open={editingChallenge !== null} onClose={() => setEditingId(null)} title="Edit challenge">
        {editingChallenge && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleEditSubmit(editingChallenge.id, editingChallenge.neighborhood_id);
            }}
          >
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
              autoFocus
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
            />

            <label className="mt-1 text-xs font-extrabold text-muted">Target</label>
            <div className="flex gap-2">
              <select
                value={editTargetMode}
                onChange={(e) => handleEditTargetModeChange(e.target.value as "category" | "kind")}
                className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
              >
                <option value="category">Category</option>
                <option value="kind">Any POI / any check-in</option>
              </select>
              {editTargetMode === "category" ? (
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  required
                  className="flex-1 rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
                >
                  <option value="">— Choose a category —</option>
                  {leafCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={editTargetCountLive ? "poi_live" : editTargetKind}
                  onChange={(e) => handleEditTargetKindOptionChange(e.target.value as "any" | "poi" | "poi_live")}
                  className="flex-1 rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
                >
                  <option value="any">Any check-in</option>
                  <option value="poi">Any POI</option>
                  <option value="poi_live">All POIs (target count tracks however many are currently active)</option>
                </select>
              )}
            </div>

            <div className="flex gap-2">
              <label className="flex-1 text-xs font-extrabold text-muted">
                Target count
                <input
                  type="number"
                  min={1}
                  value={editTargetCountLive ? "" : editTargetCount}
                  onChange={(e) => setEditTargetCount(e.target.value)}
                  required={!editTargetCountLive}
                  disabled={editTargetCountLive}
                  placeholder={editTargetCountLive ? "Computed automatically" : undefined}
                  className="mt-1 w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground disabled:opacity-50"
                />
              </label>
              <label className="flex-1 text-xs font-extrabold text-muted">
                Points reward
                <input
                  type="number"
                  min={0}
                  value={editPointsReward}
                  onChange={(e) => setEditPointsReward(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground"
                />
              </label>
            </div>
            <label className="text-xs font-extrabold text-muted">
              Ends (blank runs indefinitely)
              <span className="mt-1 flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  value={editEndsAt}
                  onChange={(e) => setEditEndsAt(e.target.value)}
                  className="w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground"
                />
                {editEndsAt && (
                  <button
                    type="button"
                    onClick={() => setEditEndsAt("")}
                    className="shrink-0 text-[11px] font-bold text-muted hover:text-brand-orange"
                  >
                    Clear
                  </button>
                )}
              </span>
            </label>
            <label className="text-xs font-extrabold text-muted">
              Badge
              <select
                value={editBadgeSelection}
                onChange={(e) => handleEditBadgeSelectionChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground"
              >
                <option value="">No badge</option>
                <option value={NEW_BADGE_SENTINEL}>+ Create new badge</option>
                {badges.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            {editBadgeSelection && (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-card-alt/50 p-3">
                <input
                  value={editBadgeName}
                  onChange={(e) => setEditBadgeName(e.target.value)}
                  placeholder="Badge name"
                  required
                  className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
                />
                <textarea
                  value={editBadgeDescription}
                  onChange={(e) => setEditBadgeDescription(e.target.value)}
                  placeholder="Badge description (optional)"
                  rows={2}
                  className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
                />
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-lg">
                    <BadgeIcon icon={editBadgeIcon || null} name={editBadgeName || "Preview"} />
                  </span>
                  <select
                    value={editBadgeIcon}
                    onChange={(e) => setEditBadgeIcon(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
                  >
                    <option value="">No icon</option>
                    {ICON_OPTIONS.map(([code, glyph]) => (
                      <option key={code} value={code}>
                        {glyph} {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="mt-1 flex gap-2">
              <button
                type="submit"
                disabled={busyId === editingChallenge.id}
                className="rounded-md bg-brand-purple px-4 py-2 font-bold text-on-accent"
              >
                Save
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="px-2 py-2 font-bold text-muted">
                Cancel
              </button>
            </div>
          </form>
        )}
      </AdminModal>

      {scopedChallenges ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
            {scopeFilter === "global" ? "Global" : filteredNeighborhoodName} ({scopedChallenges.length})
          </h2>
          {scopedChallenges.length === 0 ? (
            <p className="text-sm text-muted">No challenges in this scope.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{scopedChallenges.map(renderRow)}</ul>
          )}
        </div>
      ) : (
        <>
          {renderSection("Neighborhood-specific", neighborhoodSpecific)}
          {renderSection("App-wide", appWide)}
        </>
      )}
    </div>
  );
}
