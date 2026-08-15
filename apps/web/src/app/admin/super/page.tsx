"use client";

import { useEffect, useState } from "react";
import type { AppUserAdminView, FeedbackSubmissionAdminView } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { StatTile, MushroomIcon } from "../../StatTile";

type State =
  | { status: "loading" }
  | { status: "ready"; users: AppUserAdminView[]; feedback: FeedbackSubmissionAdminView[] }
  | { status: "error"; message: string };

// Overview tab of the super admin shell (BACKLOG.md) -- signed-in/forbidden
// handling lives in layout.tsx, mirroring the neighborhood/business shells'
// Overview tabs, which is why this only tracks loading/ready/error. Reuses
// GET /admin/users and GET /admin/feedback (the same calls the Users and
// Feedback tabs make) for its stat tiles rather than adding a dedicated
// summary endpoint -- the platform is small enough that loading both lists
// in full is cheap either way.
export default function SuperAdminOverviewPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const authHeaders = { Authorization: `Bearer ${token}` };
      const [usersRes, feedbackRes] = await Promise.all([
        fetch(clientApiUrl("/admin/users"), { headers: authHeaders }),
        fetch(clientApiUrl("/admin/feedback"), { headers: authHeaders }),
      ]);
      if (cancelled) return;
      if (!usersRes.ok || !feedbackRes.ok) {
        setState({ status: "error", message: "Failed to load platform stats" });
        return;
      }
      setState({ status: "ready", users: await usersRes.json(), feedback: await feedbackRes.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const { users, feedback } = state;
  const businessAccounts = users.filter((u) => u.account_type === "business").length;
  const neighborhoodAdmins = users.filter((u) => u.is_neighborhood_admin).length;
  const superAdmins = users.filter((u) => u.is_super_admin).length;
  const feedbackNeedsTriage = feedback.filter((f) => f.state === "new").length;
  // Resolved/dead submissions clutter a preview meant for "what needs a
  // look" -- full history (including done/removed) is still one click away
  // via the Feedback tab's own filter.
  const recentFeedback = feedback.filter((f) => f.state !== "done" && f.state !== "removed");

  return (
    <div className="flex flex-col gap-5.5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">Super admin</h1>
        <p className="mt-1 text-[15px] text-body-text">Platform-wide tools, not scoped to any one neighborhood or business.</p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatTile icon={<MushroomIcon color="var(--brand-orange)" />} label="Users" value={users.length} color="var(--brand-orange)" />
        <StatTile icon={<MushroomIcon color="var(--brand-green)" />} label="Business accounts" value={businessAccounts} color="var(--brand-green)" />
        <StatTile icon={<MushroomIcon color="var(--brand-purple)" />} label="Neighborhood admins" value={neighborhoodAdmins} color="var(--brand-purple)" />
        <StatTile icon={<MushroomIcon color="var(--brand-amber)" />} label="Super admins" value={superAdmins} color="var(--brand-amber)" />
        <StatTile icon={<MushroomIcon color="var(--brand-purple)" />} label="Feedback submissions" value={feedback.length} color="var(--brand-purple)" />
        <StatTile icon={<MushroomIcon color="var(--brand-orange)" />} label="Needs triage" value={feedbackNeedsTriage} color="var(--brand-orange)" />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-2.5 rounded-3xl border border-border bg-card p-5.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-[17px] font-extrabold">Recent feedback</h2>
            <a href="/admin/super/feedback" className="text-xs font-bold text-brand-purple hover:text-brand-orange">
              View all →
            </a>
          </div>
          {recentFeedback.length === 0 ? (
            <p className="text-sm text-muted">Nothing needs a look right now.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentFeedback.slice(0, 5).map((submission) => (
                <li key={submission.id} className="flex items-center justify-between gap-3 rounded-xl bg-card-alt px-3.5 py-2.5">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] text-foreground">{submission.comment}</span>
                    <span className="font-mono text-[11px] text-muted">
                      {submission.user_display_name ?? submission.user_email ?? "Unknown user"} ·{" "}
                      {new Date(submission.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full border border-border bg-card px-2.25 py-0.5 text-[10px] font-extrabold text-muted-strong">
                    {submission.type === "bug" ? "Bug" : "Feature"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-nav p-5.5 text-nav-foreground">
          <div className="flex items-center gap-2.5">
            <MushroomIcon color="var(--brand-amber)" />
            <h2 className="font-heading text-[17px] font-extrabold">More on the way</h2>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-nav-muted">
            This is the first cut of the super admin UI -- browse every account under the{" "}
            <a href="/admin/super/users" className="font-bold text-brand-amber hover:underline">
              Users
            </a>{" "}
            tab, manage the global category taxonomy under{" "}
            <a href="/admin/super/category-taxonomy" className="font-bold text-brand-amber hover:underline">
              Category taxonomy
            </a>
            , or triage bug reports and feature requests under{" "}
            <a href="/admin/super/feedback" className="font-bold text-brand-amber hover:underline">
              Feedback
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
