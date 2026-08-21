"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FeedbackSubmission, FeedbackSubmissionAdminView, FeedbackState } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "ready"; submissions: FeedbackSubmissionAdminView[] }
  | { status: "error"; message: string };

type TypeFilter = "all" | "bug" | "feature";

const ALL_STATES: FeedbackState[] = ["new", "in_progress", "done", "removed"];

// Resolved/dead states hidden by default -- triage should open on what still
// needs attention, not the full history of every submission ever made.
const DEFAULT_STATES: FeedbackState[] = ["new", "in_progress"];

const STATE_LABELS: Record<FeedbackState, string> = {
  new: "New",
  in_progress: "In progress",
  done: "Done",
  removed: "Removed",
};

const STATE_BADGE_CLASS: Record<FeedbackState, string> = {
  new: "bg-brand-orange/20 text-brand-orange",
  in_progress: "bg-brand-purple/20 text-brand-purple",
  done: "bg-brand-green/20 text-brand-green",
  removed: "bg-card-alt text-muted-strong",
};

// Dropdown checkbox list for filtering by multiple states at once (unlike a
// native <select>, which only allows one) -- mirrors AccountMenu.tsx's
// click-outside-to-close pattern.
function StateMultiSelect({
  selected,
  onChange,
}: {
  selected: Set<FeedbackState>;
  onChange: (next: Set<FeedbackState>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  function toggle(s: FeedbackState) {
    const next = new Set(selected);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange(next);
  }

  const label =
    selected.size === ALL_STATES.length
      ? "All states"
      : selected.size === 0
        ? "No states"
        : ALL_STATES.filter((s) => selected.has(s))
            .map((s) => STATE_LABELS[s])
            .join(", ");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex max-w-56 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
      >
        <span className="truncate">{label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" className="shrink-0 text-muted" aria-hidden="true">
          <path d="M1 1 L5 5 L9 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-2 w-44 rounded-lg border border-border bg-card py-2 text-foreground shadow-lg">
          {ALL_STATES.map((s) => (
            <label key={s} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-card-alt">
              <input type="checkbox" checked={selected.has(s)} onChange={() => toggle(s)} />
              {STATE_LABELS[s]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Feedback tab of the super admin shell -- triage list for POST /me/feedback
// submissions, gated to superAdminGate like the shell's other tabs (moved
// from adminGate alongside this UI, mirroring category-taxonomy's move).
// Search/sort/filter are all client-side over the one loaded list, same
// tradeoff as the Users tab. Signed-in/forbidden handling lives in
// layout.tsx, which is why this only tracks loading/ready/error.
export default function SuperAdminFeedbackPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stateFilter, setStateFilter] = useState<Set<FeedbackState>>(() => new Set(DEFAULT_STATES));
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/feedback"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load feedback" });
        return;
      }
      setState({ status: "ready", submissions: await res.json() });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function setSubmissions(update: (prev: FeedbackSubmissionAdminView[]) => FeedbackSubmissionAdminView[]) {
    setState((prev) => (prev.status === "ready" ? { ...prev, submissions: update(prev.submissions) } : prev));
  }

  async function handleStateChange(id: string, nextState: FeedbackState) {
    setBusyId(id);
    setActionError(null);
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/admin/feedback/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ state: nextState }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to update feedback");
      return;
    }
    // PATCH returns a bare FeedbackSubmission, not the admin-joined view GET
    // returns (no user_display_name/user_email) -- merge onto the existing
    // row rather than replacing it, so the submitter identity isn't lost.
    const updated: FeedbackSubmission = await res.json();
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  }

  const submissions = state.status === "ready" ? state.submissions : null;

  const filtered = useMemo(() => {
    if (!submissions) return null;
    const needle = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (!stateFilter.has(s.state)) return false;
      if (!needle) return true;
      return [s.comment, s.user_display_name, s.user_email].some((field) => field?.toLowerCase().includes(needle));
    });
  }, [submissions, search, typeFilter, stateFilter]);

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
        <h1 className="font-heading text-4xl font-extrabold">Feedback</h1>
        <p className="mt-1 text-[15px] text-body-text">Bug reports and feature requests submitted through the app.</p>
      </div>

      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search comment, name, or email"
          className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
        >
          <option value="all">All types</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature</option>
        </select>
        <StateMultiSelect selected={stateFilter} onChange={setStateFilter} />
      </div>

      <p className="text-xs font-bold text-muted">
        {filtered?.length ?? 0} of {submissions?.length ?? 0} submissions
      </p>

      <ul className="flex flex-col gap-2">
        {filtered?.map((submission) => {
          const isBusy = busyId === submission.id;
          return (
            <li
              key={submission.id}
              className="flex flex-col gap-2.5 rounded-2xl border-2 border-border/60 bg-card px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-heading text-[15px] font-bold">
                    {submission.user_display_name ?? submission.user_email ?? "Unknown user"}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {submission.user_email ?? "no email"} · {new Date(submission.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-border bg-card-alt px-2.25 py-0.5 text-[10px] font-extrabold text-muted-strong">
                    {submission.type === "bug" ? "Bug" : "Feature"}
                  </span>
                  <select
                    aria-label="Set state"
                    value={submission.state}
                    disabled={isBusy}
                    onChange={(e) => handleStateChange(submission.id, e.target.value as FeedbackState)}
                    className={`rounded-full border-0 px-2.25 py-0.5 text-[10px] font-extrabold disabled:opacity-60 ${STATE_BADGE_CLASS[submission.state]}`}
                  >
                    {(Object.keys(STATE_LABELS) as FeedbackState[]).map((s) => (
                      <option key={s} value={s}>
                        {STATE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[13px] leading-relaxed text-body-text whitespace-pre-wrap">{submission.comment}</p>
            </li>
          );
        })}
      </ul>

      {filtered?.length === 0 && <p className="text-sm text-muted">No feedback matches.</p>}
    </div>
  );
}
