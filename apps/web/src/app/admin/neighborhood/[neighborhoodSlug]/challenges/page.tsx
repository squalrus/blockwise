"use client";

import { useEffect, useState } from "react";
import type { BadgeAdminItem, CategoryOption, ChallengeAdminItem } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { AdminModal } from "../../../AdminModal";
import { BADGE_ICONS, BadgeIcon } from "../../../../BadgeIcon";
import { useNeighborhoodAdmin } from "../NeighborhoodAdminContext";

// Icon options for the badge create/edit fields below -- built from
// BadgeIcon.tsx's own glyph map, mirroring the super-admin Badges tab's
// own ICON_OPTIONS (admin/super/badges/page.tsx).
const ICON_OPTIONS = Object.entries(BADGE_ICONS).sort((a, b) => a[0].localeCompare(b[0]));

// Scope pill color coding mirrors the neighborhood-admin Badges tab (and,
// in turn, the super-admin Challenges/Badges tabs) -- brand-purple for
// neighborhood-scoped, brand-green for app-wide, so the same color always
// means the same thing across every admin surface. Every challenge listed
// here is this neighborhood's own, so the pill always reads purple -- kept
// for visual consistency with the other three tabs rather than usefully
// distinguishing rows on this particular page.
function scopePillClass(neighborhoodId: string | null): string {
  return neighborhoodId ? "bg-brand-purple text-on-accent" : "bg-brand-green text-on-accent";
}

type State =
  | { status: "loading" }
  | { status: "ready"; challenges: ChallengeAdminItem[]; categories: CategoryOption[]; badges: BadgeAdminItem[] }
  | { status: "error"; message: string };

// datetime-local <-> ISO round-trip, mirroring the super-admin Challenges
// tab (admin/super/challenges/page.tsx) this page is a neighborhood-scoped
// sibling of.
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

// Neighborhood-admin Challenges tab (BACKLOG.md Ref 108, merged with Badges
// per user request): this neighborhood's own admins author challenges for
// their own neighborhood, with badge authoring folded directly into the
// same form -- every challenge is required to come with its own badge
// (name/description/icon, minted fresh alongside the challenge), rather
// than picking from an existing catalog. One combined UI, but still two
// separate rows saved server-side (a badge, then a challenge referencing
// it via badge_id) -- see createChallengeWithBadgeForNeighborhoodAdmin in
// the API. This is deliberately different from the super-admin Challenges
// tab, which keeps badge_id an optional pick from any existing badge and
// manages badges/challenges as two separate tools. App-wide challenges
// still only come from the super admin tab -- they aren't listed or
// creatable here, since they're not this neighborhood's to manage.
// Create/edit both open in a modal (AdminModal) rather than an inline card
// form -- the combined challenge+badge fields make for a long form, and a
// modal keeps the list underneath from jumping around while one's open.
export default function NeighborhoodAdminChallengesPage() {
  const { neighborhoodId } = useNeighborhoodAdmin();
  const [state, setState] = useState<State>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTargetMode, setNewTargetMode] = useState<"category" | "kind">("category");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newTargetKind, setNewTargetKind] = useState<"poi" | "any">("any");
  const [newTargetCount, setNewTargetCount] = useState("3");
  const [newTargetCountLive, setNewTargetCountLive] = useState(false);
  const [newPointsReward, setNewPointsReward] = useState("25");
  const [newStartsAt, setNewStartsAt] = useState(() => toInputValue(new Date().toISOString()));
  const [newEndsAt, setNewEndsAt] = useState("");
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeDescription, setNewBadgeDescription] = useState("");
  const [newBadgeIcon, setNewBadgeIcon] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetMode, setEditTargetMode] = useState<"category" | "kind">("category");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editTargetKind, setEditTargetKind] = useState<"poi" | "any">("any");
  const [editTargetCount, setEditTargetCount] = useState("");
  const [editTargetCountLive, setEditTargetCountLive] = useState(false);
  const [editPointsReward, setEditPointsReward] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editBadgeName, setEditBadgeName] = useState("");
  const [editBadgeDescription, setEditBadgeDescription] = useState("");
  const [editBadgeIcon, setEditBadgeIcon] = useState("");

  async function authedFetch(path: string, init?: RequestInit) {
    const token = await getAccessToken();
    return fetch(clientApiUrl(path), {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [challengesRes, categoriesRes, badgesRes] = await Promise.all([
        authedFetch(`/neighborhood-admin/neighborhoods/${neighborhoodId}/challenges`),
        authedFetch("/admin/categories"),
        authedFetch(`/neighborhood-admin/neighborhoods/${neighborhoodId}/badges`),
      ]);
      if (cancelled) return;
      if (!challengesRes.ok || !categoriesRes.ok || !badgesRes.ok) {
        setState({ status: "error", message: "Failed to load challenges" });
        return;
      }
      setState({
        status: "ready",
        challenges: await challengesRes.json(),
        categories: await categoriesRes.json(),
        badges: await badgesRes.json(),
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId]);

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

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setActionError(null);

    const res = await authedFetch(`/neighborhood-admin/neighborhoods/${neighborhoodId}/challenges`, {
      method: "POST",
      body: JSON.stringify({
        title: newTitle,
        description: newDescription || null,
        category_id: newTargetMode === "category" ? newCategoryId || null : null,
        target_kind: newTargetMode === "kind" ? newTargetKind : null,
        target_count: newTargetCountLive ? 1 : Number(newTargetCount),
        target_count_live: newTargetCountLive,
        points_reward: Number(newPointsReward),
        starts_at: fromInputValue(newStartsAt),
        ends_at: fromInputValue(newEndsAt),
        badge_name: newBadgeName,
        badge_description: newBadgeDescription || null,
        badge_icon: newBadgeIcon || null,
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
    setNewEndsAt("");
    setNewTargetCountLive(false);
    setNewBadgeName("");
    setNewBadgeDescription("");
    setNewBadgeIcon("");
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
    setEditEndsAt(toInputValue(challenge.ends_at));
    setEditBadgeName(challenge.badge?.name ?? "");
    setEditBadgeDescription(challenge.badge?.description ?? "");
    setEditBadgeIcon(challenge.badge?.icon ?? "");
  }

  async function handleEditSubmit(id: string) {
    setBusyId(id);
    setActionError(null);
    const res = await authedFetch(`/neighborhood-admin/neighborhoods/${neighborhoodId}/challenges/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: editTitle,
        description: editDescription || null,
        category_id: editTargetMode === "category" ? editCategoryId || null : null,
        target_kind: editTargetMode === "kind" ? editTargetKind : null,
        target_count: editTargetCountLive ? 1 : Number(editTargetCount),
        target_count_live: editTargetCountLive,
        points_reward: Number(editPointsReward),
        ends_at: fromInputValue(editEndsAt),
        badge_name: editBadgeName,
        badge_description: editBadgeDescription || null,
        badge_icon: editBadgeIcon || null,
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

  if (state.status === "loading") return null;
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  const { challenges, badges } = state;
  const categories = [...state.categories].sort((a, b) => a.name.localeCompare(b.name));
  // A badge could in principle exist without a matching challenge (e.g.
  // seeded by hand, or its challenge was deleted) -- shown read-only below
  // so nothing already on this neighborhood becomes invisible now that the
  // primary creation flow always pairs the two.
  const orphanBadges = badges.filter((b) => !challenges.some((c) => c.badge?.id === b.id));
  const editingChallenge = challenges.find((c) => c.id === editingId) ?? null;

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Challenges</h1>
          <p className="mt-1 text-sm text-muted">
            Challenges scoped to this neighborhood -- every challenge comes with its own badge, created together.
            App-wide challenges (managed by super admins) also show up for your members but aren&apos;t listed or
            editable here.
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
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.group_name ? `${c.group_name} · ${c.name}` : c.name}
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

          <h2 className="mt-2 text-xs font-extrabold tracking-wide text-muted uppercase">Badge</h2>
          <p className="text-xs text-muted">Every challenge comes with its own badge, created together as two linked rows.</p>
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
              handleEditSubmit(editingChallenge.id);
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
              placeholder="Description"
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
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.group_name ? `${c.group_name} · ${c.name}` : c.name}
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

            <h2 className="mt-2 text-xs font-extrabold tracking-wide text-muted uppercase">Badge</h2>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-lg">
                <BadgeIcon icon={editBadgeIcon || null} name={editBadgeName || "Preview"} />
              </span>
              <input
                value={editBadgeName}
                onChange={(e) => setEditBadgeName(e.target.value)}
                placeholder="Badge name"
                className="flex-1 rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
              />
            </div>
            <textarea
              value={editBadgeDescription}
              onChange={(e) => setEditBadgeDescription(e.target.value)}
              rows={2}
              placeholder="Badge description"
              className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
            />
            <select
              value={editBadgeIcon}
              onChange={(e) => setEditBadgeIcon(e.target.value)}
              className="rounded-md border border-border bg-card-alt px-3 py-2 text-foreground"
            >
              <option value="">No icon</option>
              {ICON_OPTIONS.map(([code, glyph]) => (
                <option key={code} value={code}>
                  {glyph} {code}
                </option>
              ))}
            </select>

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

      {challenges.length === 0 ? (
        <p className="text-sm text-muted">No challenges yet for this neighborhood.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {challenges.map((challenge) => (
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
                {challenge.has_completions ? (
                  <span
                    className="shrink-0 text-xs font-bold text-muted"
                    title="Locked -- someone has already completed this challenge, so it (and its badge) can no longer be edited"
                  >
                    Locked
                  </span>
                ) : (
                  <button
                    onClick={() => startEdit(challenge)}
                    className="shrink-0 text-xs font-bold text-brand-purple hover:text-brand-orange"
                  >
                    Edit
                  </button>
                )}
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
                {challenge.has_completions && (
                  <span className="rounded-full bg-card px-2 py-0.5" title="Someone has already completed this challenge">
                    🔒 Locked
                  </span>
                )}
              </p>
              {challenge.badge && (
                <p className="text-xs text-muted">
                  Badge: {challenge.badge.name}
                  {challenge.badge.description ? ` — ${challenge.badge.description}` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {orphanBadges.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
            Other badges ({orphanBadges.length})
          </h2>
          <p className="text-xs text-muted">Badges owned by this neighborhood with no matching challenge listed above.</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {orphanBadges.map((badge) => (
              <li key={badge.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-base">
                  <BadgeIcon icon={badge.icon} name={badge.name} />
                </span>
                <div className="min-w-0">
                  <span className="font-extrabold text-foreground">{badge.name}</span>
                  {badge.description && <p className="mt-0.5 text-body-text">{badge.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
