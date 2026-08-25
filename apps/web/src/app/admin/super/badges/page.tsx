"use client";

import { useEffect, useMemo, useState } from "react";
import type { BadgeAdminItem, NeighborhoodSummary } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { AdminModal } from "../../AdminModal";
import { BADGE_ICONS, BadgeIcon } from "../../../BadgeIcon";

// Icon options for the create/edit forms below -- built from BadgeIcon.tsx's
// own glyph map so a new icon added there automatically shows up here too,
// rather than a free-text field an admin could mistype into rendering the
// generic fallback medal.
const ICON_OPTIONS = Object.entries(BADGE_ICONS).sort((a, b) => a[0].localeCompare(b[0]));

type State =
  | { status: "loading" }
  | { status: "ready"; badges: BadgeAdminItem[]; neighborhoods: NeighborhoodSummary[] }
  | { status: "error"; message: string };

const EARN_METHOD_LABEL: Record<string, string> = {
  rule: "Rule engine",
  challenge: "Challenge reward",
  manual: "One-off award",
};

// A badge's own neighborhood_id is authoritative when set; otherwise fall
// back to the (shared) neighborhood_name off its linked challenges for the
// "earned only via this neighborhood's challenges" case (badge.scope
// already resolved this server-side -- see badgeAdmin.ts's
// resolveBadgeAdminItem).
function scopeLabel(badge: BadgeAdminItem): string {
  if (badge.neighborhood_name) return badge.neighborhood_name;
  if (badge.scope === "neighborhood_specific") {
    return badge.challenges.find((c) => c.neighborhood_name)?.neighborhood_name ?? "Neighborhood-specific";
  }
  return "Global";
}

interface BadgeGroup {
  label: string;
  badges: BadgeAdminItem[];
}

const MISC_FAMILY = "__misc__";
const MISC_LABEL = "Miscellaneous";

// Badges whose codes don't share a numeric tier suffix but still form a
// real family -- the auto-detected coffee_explorer_1/5/10-style grouping
// below can't find these on its own. The three rank-reached badges (one per
// business/poi_rank_reached/neighborhood_rank_reached badge_rule) share a
// _mayor suffix in this database's actual badge.code values today
// (business_mayor/poi_mayor/neighborhood_mayor) rather than the
// _top_cap-suffixed codes the seed migration in supabase/migrations
// originally inserted (business_top_cap/poi_top_cap/neighborhood_top_cap,
// named "Business/Landmark/Neighborhood Top Cap") -- this table has drifted
// from that migration (renamed directly in the database at some point), so
// the keys here match what's actually live, not what the migration file
// would produce on a fresh apply.
const FAMILY_OVERRIDES: Record<string, { family: string; label: string }> = {
  business_mayor: { family: "top_cap", label: "Top Cap" },
  poi_mayor: { family: "top_cap", label: "Top Cap" },
  neighborhood_mayor: { family: "top_cap", label: "Top Cap" },
};

// Tiered badge families share a code prefix with a trailing tier number
// (coffee_explorer_1/5/10, level_1..10, day_tripper_5..50) -- grouping by
// that prefix and sorting each group by the tier number itself (not the
// code string) keeps tiers in 1, 2, 3, ..., 10, 11, 12 order instead of the
// 1, 10, 11, 12, 2, 3, ... order a plain alphabetical sort would produce. A
// code matching neither FAMILY_OVERRIDES nor a numeric tier suffix
// (back_for_seconds, founder, squalrus_connection aka "Everybody's
// Neighbor", "Early Sprout", ...) has no real family of its own -- these all
// land together in one shared Miscellaneous group instead of each becoming
// its own confusingly-labeled single-badge "family" (the label would
// otherwise be derived from the raw code, which doesn't always match the
// badge's actual display name).
function groupBadges(badges: BadgeAdminItem[]): BadgeGroup[] {
  const groups = new Map<string, { label: string; hasTiers: boolean; entries: { badge: BadgeAdminItem; tier: number }[] }>();
  for (const badge of badges) {
    const override = FAMILY_OVERRIDES[badge.code];
    const match = override ? null : badge.code.match(/^(.+)_(\d+)$/);
    const family = override ? override.family : match ? match[1] : MISC_FAMILY;
    const tier = match ? Number(match[2]) : 0;
    if (!groups.has(family)) {
      const label =
        override?.label ??
        (family === MISC_FAMILY
          ? MISC_LABEL
          : family
              .split("_")
              .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
              .join(" "));
      groups.set(family, { label, hasTiers: !!match, entries: [] });
    }
    groups.get(family)!.entries.push({ badge, tier });
  }
  return Array.from(groups.values())
    .map((g) => ({
      label: g.label,
      // Untiered groups (Miscellaneous, and any FAMILY_OVERRIDES family)
      // have no meaningful tier order -- sort those alphabetically by name.
      badges: g.hasTiers
        ? g.entries.sort((a, b) => a.tier - b.tier).map((e) => e.badge)
        : g.entries.map((e) => e.badge).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    // Miscellaneous sorts last regardless of alphabetical position.
    .sort((a, b) => (a.label === MISC_LABEL ? 1 : b.label === MISC_LABEL ? -1 : a.label.localeCompare(b.label)));
}

async function authedFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  return fetch(clientApiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
  });
}

// Super admin's Badges view (BACKLOG.md Ref 108, extended by a same-day
// follow-up) -- badge gained a direct, nullable neighborhood_id (some
// rule-driven badges, like the category_milestone "Explorer" families, are
// neighborhood-owned, not app-wide); scope shown here is that direct value
// when set, else derived from what earns the badge (a global rule or an
// app-wide challenge makes it app-wide; earned only via neighborhood-scoped
// challenges makes it neighborhood-specific). Create/edit only cover
// name/description/icon (+ neighborhood on create) -- the badge_rule
// engine's rule types (category milestones, rank-reached, etc.) aren't
// authorable here; a badge created here has no rule yet and exists to be
// picked as a challenge's badge_id on the Challenges tab.
export default function SuperAdminBadgesPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [newNeighborhoodId, setNewNeighborhoodId] = useState("");

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("");

  // "all" | "global" (app-wide) | a specific neighborhood_id -- options
  // beyond the first two are derived from the badges actually loaded (only
  // neighborhoods with at least one neighborhood-specific badge show up),
  // rather than fetching the full neighborhood list separately.
  const [scopeFilter, setScopeFilter] = useState("all");

  const neighborhoodOptions = useMemo(() => {
    const badges = state.status === "ready" ? state.badges : [];
    const byId = new Map<string, string>();
    for (const badge of badges) {
      for (const challenge of badge.challenges) {
        if (challenge.neighborhood_id) byId.set(challenge.neighborhood_id, challenge.neighborhood_name ?? challenge.neighborhood_id);
      }
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [badgesRes, neighborhoodsRes] = await Promise.all([
        authedFetch("/admin/badges"),
        authedFetch("/neighborhoods"),
      ]);
      if (cancelled) return;
      if (!badgesRes.ok || !neighborhoodsRes.ok) {
        setState({ status: "error", message: "Failed to load badges" });
        return;
      }
      setState({ status: "ready", badges: await badgesRes.json(), neighborhoods: await neighborhoodsRes.json() });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function setBadges(update: (prev: BadgeAdminItem[]) => BadgeAdminItem[]) {
    setState((prev) => (prev.status === "ready" ? { ...prev, badges: update(prev.badges) } : prev));
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setActionError(null);
    const res = await authedFetch("/admin/badges", {
      method: "POST",
      body: JSON.stringify({
        name: newName,
        description: newDescription || null,
        icon: newIcon || null,
        neighborhood_id: newNeighborhoodId || null,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to create badge");
      return;
    }
    const created: BadgeAdminItem = await res.json();
    setBadges((prev) => [created, ...prev]);
    setNewName("");
    setNewDescription("");
    setNewIcon("");
    setNewNeighborhoodId("");
    setCreateOpen(false);
  }

  function startEdit(badge: BadgeAdminItem) {
    setEditingId(badge.id);
    setEditName(badge.name);
    setEditDescription(badge.description ?? "");
    setEditIcon(badge.icon ?? "");
  }

  async function handleEditSubmit(id: string) {
    setBusyId(id);
    setActionError(null);
    const res = await authedFetch(`/admin/badges/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: editName, description: editDescription || null, icon: editIcon || null }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to update badge");
      return;
    }
    const updated: BadgeAdminItem = await res.json();
    setBadges((prev) => prev.map((b) => (b.id === id ? updated : b)));
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

  const { neighborhoods } = state;
  const appWide = state.badges.filter((b) => b.scope === "app_wide");
  const neighborhoodSpecific = state.badges.filter((b) => b.scope === "neighborhood_specific");
  const filteredNeighborhoodName = neighborhoodOptions.find((n) => n.id === scopeFilter)?.name ?? null;
  const scopedBadges =
    scopeFilter === "all"
      ? null
      : scopeFilter === "global"
        ? appWide
        : state.badges.filter((b) => b.challenges.some((c) => c.neighborhood_id === scopeFilter));

  function renderRow(badge: BadgeAdminItem) {
    return (
      <li key={badge.id} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-base">
              <BadgeIcon icon={badge.icon} name={badge.name} />
            </span>
            <div className="min-w-0">
              <span className="font-extrabold text-foreground">{badge.name}</span>
              {badge.description && <p className="mt-0.5 text-body-text">{badge.description}</p>}
            </div>
          </div>
          <button
            onClick={() => startEdit(badge)}
            className="shrink-0 text-xs font-bold text-brand-purple hover:text-brand-orange"
          >
            Edit
          </button>
        </div>
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
          <span
            className={`rounded-full px-2 py-0.5 ${
              badge.scope === "neighborhood_specific" ? "bg-brand-purple text-on-accent" : "bg-brand-green text-on-accent"
            }`}
          >
            {scopeLabel(badge)}
          </span>
          <span className="rounded-full border border-border bg-card px-2 py-0.5">{badge.code}</span>
          {badge.earned_via.map((method) => (
            <span key={method} className="rounded-full border border-border bg-card px-2 py-0.5">
              {EARN_METHOD_LABEL[method] ?? method}
            </span>
          ))}
        </p>
        {badge.challenges.length > 0 && (
          <p className="text-xs text-muted">
            Awarded by: {badge.challenges.map((c) => `${c.title} (${c.neighborhood_name ?? "App-wide"})`).join(", ")}
          </p>
        )}
      </li>
    );
  }

  function renderGrouped(list: BadgeAdminItem[]) {
    return groupBadges(list).map((group) => {
      const hasHeading = group.badges.length > 1 || group.label === MISC_LABEL;
      const badgeList = (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{group.badges.map(renderRow)}</ul>
      );
      if (!hasHeading) {
        return (
          <div key={group.label} className="flex flex-col gap-2">
            {badgeList}
          </div>
        );
      }
      // Collapsible via native <details> -- open by default so nothing
      // changes for anyone who doesn't interact, but a family like "Day
      // Tripper" can be closed to focus on the others.
      return (
        <details key={group.label} open className="group flex flex-col gap-2">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-muted uppercase [&::-webkit-details-marker]:hidden">
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className="shrink-0 transition-transform group-open:rotate-90"
              aria-hidden="true"
            >
              <path d="M2.5 1 7.5 5 2.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {group.label} ({group.badges.length})
          </summary>
          {badgeList}
        </details>
      );
    });
  }

  return (
    <div className="flex flex-col gap-5.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl font-extrabold">Badges</h1>
          <p className="mt-1 text-[15px] text-body-text">
            badge.neighborhood_id is set directly for badges owned by one neighborhood (e.g. an Explorer family), or
            derived from what earns the badge otherwise: a global rule or an app-wide challenge makes it app-wide;
            earned only via neighborhood-scoped challenges makes it neighborhood-specific.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent"
        >
          + New badge
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs font-extrabold text-muted">
        Scope
        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="rounded-md border border-border bg-card-alt px-3 py-1.5 font-normal text-foreground"
        >
          <option value="all">All ({state.badges.length})</option>
          <option value="global">Global ({appWide.length})</option>
          {neighborhoodOptions.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </label>

      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      <AdminModal open={createOpen} onClose={() => setCreateOpen(false)} title="New badge">
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2">
          <p className="text-xs text-muted">
            Creates a plain badge with no rule attached yet -- pick it as a challenge&apos;s reward on the Challenges
            tab, or wire it to a badge_rule directly in the database.
          </p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
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
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-lg">
              <BadgeIcon icon={newIcon || null} name={newName || "Preview"} />
            </span>
            <select
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
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
          <label className="text-xs font-extrabold text-muted">
            Scope
            <select
              value={newNeighborhoodId}
              onChange={(e) => setNewNeighborhoodId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card-alt px-3 py-2 font-normal text-foreground"
            >
              <option value="">App-wide</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </label>
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

      <AdminModal open={editingId !== null} onClose={() => setEditingId(null)} title="Edit badge">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingId) handleEditSubmit(editingId);
          }}
        >
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
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
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-brand-purple text-lg">
              <BadgeIcon icon={editIcon || null} name={editName || "Preview"} />
            </span>
            <select
              value={editIcon}
              onChange={(e) => setEditIcon(e.target.value)}
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
              disabled={busyId === editingId}
              className="rounded-md bg-brand-purple px-4 py-2 font-bold text-on-accent"
            >
              Save
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="px-2 py-2 font-bold text-muted">
              Cancel
            </button>
          </div>
        </form>
      </AdminModal>

      {scopedBadges ? (
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
            {scopeFilter === "global" ? "Global" : filteredNeighborhoodName} ({scopedBadges.length})
          </h2>
          {scopedBadges.length === 0 ? (
            <p className="text-sm text-muted">No badges in this scope.</p>
          ) : (
            renderGrouped(scopedBadges)
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
              Neighborhood-specific ({neighborhoodSpecific.length})
            </h2>
            {neighborhoodSpecific.length === 0 ? (
              <p className="text-sm text-muted">
                None yet -- a badge becomes neighborhood-specific once it&apos;s only awarded via neighborhood-scoped
                challenges.
              </p>
            ) : (
              renderGrouped(neighborhoodSpecific)
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">App-wide ({appWide.length})</h2>
            {renderGrouped(appWide)}
          </div>
        </>
      )}
    </div>
  );
}
