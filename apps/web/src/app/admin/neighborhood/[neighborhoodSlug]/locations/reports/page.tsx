"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CategoryOption,
  FeedbackState,
  FeedbackSubmissionAdminView,
  PlacesInvestigationReport,
} from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "../../NeighborhoodAdminContext";
import { InvestigationResults } from "../InvestigationResults";

type State =
  | { status: "loading" }
  | { status: "ready"; submissions: FeedbackSubmissionAdminView[] }
  | { status: "error"; message: string };

const ALL_STATES: FeedbackState[] = ["new", "in_progress", "done", "removed"];

// Resolved/dead states hidden by default -- triage should open on what still
// needs attention, mirrors the super admin Feedback tab's own default.
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

// Duplicated from the super admin Feedback tab's own StateMultiSelect
// (apps/web/src/app/admin/super/feedback/page.tsx) rather than shared --
// the two pages otherwise diverge (this one drops the type filter, adds
// per-row investigate), so the one small shared piece isn't worth a new
// shared module for.
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

type InvestigationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; report: PlacesInvestigationReport }
  | { status: "error"; message: string };

// One report row, with its own "Quick investigate" (BACKLOG.md Ref 96) --
// runs the same GET .../locations/investigate?query= lookup as the
// standalone Investigate page, seeded with this row's reported venue_name,
// so an admin can check Geoapify without leaving the triage list.
function MissingVenueFeedbackRow({
  submission,
  neighborhoodId,
  categories,
  busy,
  onStateChange,
}: {
  submission: FeedbackSubmissionAdminView;
  neighborhoodId: string;
  categories: CategoryOption[] | null;
  busy: boolean;
  onStateChange: (id: string, state: FeedbackState) => void;
}) {
  const [investigation, setInvestigation] = useState<InvestigationState>({ status: "idle" });
  // Forces InvestigationResults to remount per search -- see the same note
  // on locations/investigate/page.tsx.
  const [searchCount, setSearchCount] = useState(0);

  async function runInvestigate() {
    if (!submission.venue_name) return;
    setInvestigation({ status: "loading" });
    const token = await getAccessToken();
    const res = await fetch(
      clientApiUrl(
        `/neighborhood-admin/neighborhoods/${neighborhoodId}/locations/investigate?query=${encodeURIComponent(
          submission.venue_name
        )}`
      ),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setInvestigation({ status: "error", message: body.error ?? "Failed to investigate location" });
      return;
    }
    const report: PlacesInvestigationReport = await res.json();
    setSearchCount((c) => c + 1);
    setInvestigation({ status: "results", report });
  }

  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border-2 border-border/60 bg-card px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-heading text-[15px] font-bold">{submission.venue_name}</span>
          <span className="font-mono text-[11px] text-muted">
            {submission.user_display_name ?? submission.user_email ?? "Unknown user"} ·{" "}
            {new Date(submission.created_at).toLocaleString()}
          </span>
        </div>
        <select
          aria-label="Set state"
          value={submission.state}
          disabled={busy}
          onChange={(e) => onStateChange(submission.id, e.target.value as FeedbackState)}
          className={`rounded-full border-0 px-2.25 py-0.5 text-[10px] font-extrabold disabled:opacity-60 ${STATE_BADGE_CLASS[submission.state]}`}
        >
          {ALL_STATES.map((s) => (
            <option key={s} value={s}>
              {STATE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {submission.comment && (
        <p className="text-[13px] leading-relaxed text-body-text whitespace-pre-wrap">{submission.comment}</p>
      )}

      {investigation.status === "idle" && (
        <button
          type="button"
          onClick={runInvestigate}
          className="self-start rounded-md border border-border px-3 py-1 text-xs font-bold text-foreground hover:bg-card-alt"
        >
          Quick investigate
        </button>
      )}
      {investigation.status === "loading" && <p className="text-xs text-muted">Searching Geoapify…</p>}
      {investigation.status === "error" && (
        <p className="text-xs text-red-600 dark:text-red-400">{investigation.message}</p>
      )}
      {investigation.status === "results" && (
        <InvestigationResults
          key={searchCount}
          neighborhoodId={neighborhoodId}
          candidates={investigation.report.candidates}
          categories={categories}
          emptyMessage={`Geoapify returned nothing for "${submission.venue_name}".`}
        />
      )}
    </li>
  );
}

// Missing-venue feedback triage (BACKLOG.md Ref 80/96) -- /admin/feedback's
// sibling scoped to one neighborhood: submissions of feedback type
// "missing_venue", reported through the Send Feedback menu or the /checkin
// page's "Missing a venue?" row, both of which POST /me/feedback with this
// neighborhood's id. Mirrors the super admin Feedback tab's loading/search/
// state-filter shape (minus the type filter, since every row here is
// already the same type) plus the per-row Quick investigate above.
export default function MissingVenueFeedbackPage() {
  const { neighborhoodId, slug } = useNeighborhoodAdmin();
  const [state, setState] = useState<State>({ status: "loading" });
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<Set<FeedbackState>>(() => new Set(DEFAULT_STATES));
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const [feedbackRes, categoriesRes] = await Promise.all([
        fetch(clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/feedback`), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(clientApiUrl("/admin/categories"), { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (cancelled) return;
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (!feedbackRes.ok) {
        setState({ status: "error", message: "Failed to load reports" });
        return;
      }
      setState({ status: "ready", submissions: await feedbackRes.json() });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId]);

  function setSubmissions(update: (prev: FeedbackSubmissionAdminView[]) => FeedbackSubmissionAdminView[]) {
    setState((prev) => (prev.status === "ready" ? { ...prev, submissions: update(prev.submissions) } : prev));
  }

  async function handleStateChange(id: string, nextState: FeedbackState) {
    setBusyId(id);
    setActionError(null);
    const token = await getAccessToken();
    const res = await fetch(clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/feedback/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ state: nextState }),
    });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setActionError(body?.error ?? "Failed to update report");
      return;
    }
    const updated: FeedbackSubmissionAdminView = await res.json();
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  }

  const submissions = state.status === "ready" ? state.submissions : null;

  const filtered = useMemo(() => {
    if (!submissions) return null;
    const needle = search.trim().toLowerCase();
    return submissions.filter((s) => {
      if (!stateFilter.has(s.state)) return false;
      if (!needle) return true;
      return [s.venue_name, s.comment, s.user_display_name, s.user_email].some((field) =>
        field?.toLowerCase().includes(needle)
      );
    });
  }, [submissions, search, stateFilter]);

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
      <a
        href={`/admin/neighborhood/${slug}/locations`}
        className="text-sm font-bold text-brand-purple hover:text-brand-orange"
      >
        ← Locations
      </a>
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Reported venues</h1>
        <p className="mt-1 text-[15px] text-body-text">
          Missing-venue reports from neighbors, submitted through Send Feedback or the check-in page.
        </p>
      </div>

      {actionError && <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venue, notes, name, or email"
          className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.25 text-[13px] text-foreground"
        />
        <StateMultiSelect selected={stateFilter} onChange={setStateFilter} />
      </div>

      <p className="text-xs font-bold text-muted">
        {filtered?.length ?? 0} of {submissions?.length ?? 0} reports
      </p>

      <ul className="flex flex-col gap-2">
        {filtered?.map((submission) => (
          <MissingVenueFeedbackRow
            key={submission.id}
            submission={submission}
            neighborhoodId={neighborhoodId}
            categories={categories}
            busy={busyId === submission.id}
            onStateChange={handleStateChange}
          />
        ))}
      </ul>

      {filtered?.length === 0 && <p className="text-sm text-muted">No reports match.</p>}
    </div>
  );
}
