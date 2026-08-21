"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppUserAdminView, MushroomShape, SpotShape } from "@blockwise/types";
import { MushroomLoader, MushroomMark, resolveMushroomConfig } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

// Column widths shared by the header row and every data row so they line up
// -- mushroom avatar, name/contact (grows), type, signed-up-via, roles
// (grows), push status, joined date, actions. There's no server-side signal
// for "has this account installed the PWA" (InstallPrompt.tsx's install
// state is client-local only, via matchMedia/localStorage -- never reported
// back), so that column isn't here; signed-up-via and push status are,
// since auth_provider and push_subscription rows are both real per-user
// server state.
// The trailing column is a fixed px width, not `auto` -- `auto` sizes to its
// own row's content, and the header row's last cell (empty) is narrower
// than a data row's ("Send test push" button). That mismatch left more
// leftover space for the two fr() columns to divide in the header than in
// each row, so every fixed column after them drifted further right in the
// header the closer it was to the end -- a fixed width keeps the track
// identical regardless of what's inside it.
const ROW_GRID = "grid-cols-[36px_minmax(160px,1.6fr)_84px_84px_minmax(120px,1fr)_84px_92px_128px]";

// auth_provider is Supabase's raw app_metadata.provider string -- "google"
// and "email" cover every provider this app currently offers, but an
// unrecognized value (a provider added later, or old data) still renders as
// something readable rather than a blank cell.
function authProviderLabel(provider: string | null): string {
  if (provider === "google") return "Google";
  if (provider === "email") return "Email";
  if (!provider) return "Unknown";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
// Matches each data row's own border-2 (px-4 is already identical) -- a
// header row with a plain px-4 and no border sits its grid columns 2px
// further left (and the row's fr columns get 4px more space to divide) than
// a bordered <li>'s, since border-box counts the border inside the box:
// enough drift for the header labels to visibly fall out of line with the
// columns below them.
const HEADER_ROW_CLASS = `grid ${ROW_GRID} items-center gap-3 border-2 border-transparent px-4 text-[10px] font-extrabold tracking-wide text-muted uppercase`;

// The account's real current mushroom -- a saved customizer choice when
// present, else the same hash-derived default Avatar.tsx falls back to.
// Mirrors that component's own narrowing of the plain-string
// shape/spotShape fields (server-validated already, so safe to trust here).
function resolveAdminMushroom(user: AppUserAdminView) {
  return resolveMushroomConfig(
    user.id,
    user.mushroom_customization
      ? {
          ...user.mushroom_customization,
          shape: user.mushroom_customization.shape as MushroomShape,
          spotShape: user.mushroom_customization.spotShape as SpotShape,
        }
      : null
  );
}

type State =
  | { status: "loading" }
  | { status: "ready"; users: AppUserAdminView[] }
  | { status: "error"; message: string };

type SortOption = "newest" | "oldest" | "name" | "email";

// Local to this page -- mirrors apps/api/src/pushSubscriptions's
// SendPushSummary shape, not worth sharing via @blockwise/types for one
// admin-only fetch response.
interface SendPushSummary {
  sent: number;
  pruned: number;
  failed: number;
}

type TestPushState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "done"; summary: SendPushSummary }
  | { status: "error"; message: string };

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name (A–Z)",
  email: "Email (A–Z)",
};

// Users tab of the super admin shell (BACKLOG.md), starting with a
// searchable, sortable list of every account on the platform -- signed-in/
// forbidden handling lives in layout.tsx, mirroring the neighborhood/
// business shells' tabs, which is why this only tracks loading/ready/error.
// Search and sort are both client-side filters over the one loaded list
// rather than server round trips -- the platform is small enough for now
// that loading everything once is simpler than a search API.
export default function SuperAdminUsersPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  // Only one row's test-push form open at a time, keyed by user id --
  // BACKLOG.md Ref 89's manual/test trigger, exposed here so it can target
  // any account rather than only the calling admin's own subscriptions.
  const [openTestPushUserId, setOpenTestPushUserId] = useState<string | null>(null);
  const [testPushTitle, setTestPushTitle] = useState("");
  const [testPushBody, setTestPushBody] = useState("");
  const [testPushState, setTestPushState] = useState<TestPushState>({ status: "idle" });

  function toggleTestPush(userId: string) {
    if (openTestPushUserId === userId) {
      setOpenTestPushUserId(null);
      return;
    }
    setOpenTestPushUserId(userId);
    setTestPushTitle("");
    setTestPushBody("");
    setTestPushState({ status: "idle" });
  }

  async function sendTestPush(userId: string) {
    if (!testPushTitle.trim() || !testPushBody.trim()) return;
    setTestPushState({ status: "sending" });

    const token = await getAccessToken();
    const res = await fetch(clientApiUrl("/admin/push-subscriptions/test-send"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, title: testPushTitle.trim(), body: testPushBody.trim() }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setTestPushState({ status: "error", message: payload?.error ?? "Failed to send" });
      return;
    }
    setTestPushState({ status: "done", summary: await res.json() });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/users"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load users" });
        return;
      }
      setState({ status: "ready", users: await res.json() });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const users = state.status === "ready" ? state.users : null;

  const filtered = useMemo(() => {
    if (!users) return null;
    const needle = search.trim().toLowerCase();
    const matched = needle
      ? users.filter((u) => [u.email, u.display_name, u.username].some((field) => field?.toLowerCase().includes(needle)))
      : users;

    // API already returns newest-first, but sorted explicitly here too so
    // switching back to "Newest first" after another sort doesn't rely on
    // remembering the original fetch order.
    const sorted = [...matched];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "oldest":
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
        break;
      case "name":
        sorted.sort((a, b) => (a.display_name ?? a.username ?? "").localeCompare(b.display_name ?? b.username ?? ""));
        break;
      case "email":
        sorted.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
        break;
    }
    return sorted;
  }, [users, search, sort]);

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Users</h1>
        <p className="mt-1 text-[15px] text-body-text">Every account on the platform.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, or username"
          className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
        >
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs font-bold text-muted">
        {filtered?.length ?? 0} of {users?.length ?? 0} users
      </p>

      <div className="overflow-x-auto">
        <div className="flex min-w-[880px] flex-col gap-2">
          <div className={HEADER_ROW_CLASS}>
            <span />
            <span>Account</span>
            <span>Type</span>
            <span>Via</span>
            <span>Roles</span>
            <span>Push</span>
            <span>Joined</span>
            <span />
          </div>

          <ul className="flex flex-col gap-2">
            {filtered?.map((user) => (
              <li key={user.id} className="flex flex-col gap-2.5 rounded-2xl border-2 border-border/60 bg-card px-4 py-3.5">
                <div className={`grid ${ROW_GRID} items-center gap-3`}>
                  <MushroomMark size={32} {...resolveAdminMushroom(user)} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-heading text-[15px] font-bold">
                      {user.display_name ?? user.username ?? user.email ?? "Unnamed account"}
                    </span>
                    <span className="truncate font-mono text-[11px] text-muted">
                      {user.email ?? "no email"}
                      {user.username && ` · @${user.username}`}
                    </span>
                  </div>
                  <span className="w-fit rounded-full border border-border bg-card-alt px-2.25 py-0.5 text-[10px] font-extrabold text-muted-strong">
                    {user.account_type}
                  </span>
                  <span className="font-mono text-[11px] text-muted">{authProviderLabel(user.auth_provider)}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {user.is_neighborhood_admin && (
                      <span className="rounded-full bg-brand-purple/20 px-2.25 py-0.5 text-[10px] font-extrabold text-brand-purple">
                        Neighborhood admin
                      </span>
                    )}
                    {user.is_super_admin && (
                      <span className="rounded-full bg-brand-orange/20 px-2.25 py-0.5 text-[10px] font-extrabold text-brand-orange">
                        Super admin
                      </span>
                    )}
                  </div>
                  <span
                    className={`w-fit rounded-full px-2.25 py-0.5 text-[10px] font-extrabold ${
                      user.has_push_enabled ? "bg-brand-green/20 text-brand-green" : "bg-card-alt text-muted"
                    }`}
                  >
                    {user.has_push_enabled ? "Enabled" : "Off"}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleTestPush(user.id)}
                    className="w-fit rounded-full border border-border px-2.25 py-0.5 text-[10px] font-extrabold text-foreground hover:bg-card-alt"
                  >
                    Send test push
                  </button>
                </div>

                {openTestPushUserId === user.id && (
                  <div className="flex flex-col gap-2 rounded-xl bg-card-alt px-3 py-3">
                    <input
                      value={testPushTitle}
                      onChange={(e) => setTestPushTitle(e.target.value)}
                      placeholder="Notification title"
                      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground"
                    />
                    <input
                      value={testPushBody}
                      onChange={(e) => setTestPushBody(e.target.value)}
                      placeholder="Notification body"
                      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={testPushState.status === "sending" || !testPushTitle.trim() || !testPushBody.trim()}
                        onClick={() => sendTestPush(user.id)}
                        className="rounded-full bg-brand-purple px-3 py-1 text-xs font-bold text-on-accent disabled:opacity-60"
                      >
                        {testPushState.status === "sending" ? "Sending…" : "Send"}
                      </button>
                      {testPushState.status === "done" && (
                        <span className="text-xs text-muted">
                          {testPushState.summary.sent > 0
                            ? `Sent to ${testPushState.summary.sent} device${testPushState.summary.sent === 1 ? "" : "s"}.`
                            : "This user has no active push subscriptions."}
                          {testPushState.summary.pruned > 0 && ` (${testPushState.summary.pruned} stale, removed)`}
                        </span>
                      )}
                      {testPushState.status === "error" && (
                        <span className="text-xs text-red-600 dark:text-red-400">{testPushState.message}</span>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {filtered?.length === 0 && <p className="text-sm text-muted">No users match.</p>}
    </div>
  );
}
