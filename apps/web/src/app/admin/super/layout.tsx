"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { AppUser, FeedbackSubmissionAdminView } from "@blockwise/types";
import { getAccessToken, getCurrentUser, logOut } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MushroomLoader } from "@blockwise/ui";
import { AdminShell, type AdminShellTab } from "../AdminShell";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "forbidden" }
  | { status: "ready"; user: AppUser };

type TabKey = "overview" | "users" | "category-taxonomy" | "challenges" | "badges" | "feedback" | "monitoring" | "components";

const TABS: { key: TabKey; href: string; label: string; icon: (props: { className?: string }) => React.ReactNode }[] = [
  {
    key: "overview",
    href: "",
    label: "Overview",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" />
        <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.55" />
        <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "users",
    href: "/users",
    label: "Users",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <circle cx="7" cy="6.5" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M2 17 C2 13 4.2 11 7 11 C9.8 11 12 13 12 17"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="14.5" cy="7.5" r="2.3" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <path
          d="M12.6 17 C12.6 13.8 14 12 16 12 C18 12 18.5 13.6 18.5 15.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    ),
  },
  {
    key: "category-taxonomy",
    href: "/category-taxonomy",
    label: "Category taxonomy",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <path
          d="M2.5 2.5h7L17.5 10.5 10.5 17.5 2.5 9.5V2.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="6.3" cy="6.3" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "challenges",
    href: "/challenges",
    label: "Challenges",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <path
          d="M10 2.5 12.2 7 17 7.7 13.5 11 14.4 15.7 10 13.4 5.6 15.7 6.5 11 3 7.7 7.8 7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "badges",
    href: "/badges",
    label: "Badges",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <circle cx="10" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 12.5 5.5 18 10 15.5 14.5 18 13 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "feedback",
    href: "/feedback",
    label: "Feedback",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <path
          d="M2.5 4.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3.5V13.5H4.5a2 2 0 0 1-2-2v-7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "monitoring",
    href: "/monitoring",
    label: "Monitoring",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <path
          d="M2.5 14.5 6.5 8l3 4.5 3.5-7 4.5 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    key: "components",
    href: "/components",
    label: "Components",
    icon: ({ className }) => (
      <svg width="18" height="18" viewBox="0 0 20 20" className={className} aria-hidden="true">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="14.5" cy="5.5" r="3" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <path
          d="M2.5 14 L8.5 14 L8.5 17.5 L2.5 17.5 Z M11 15.75 L17.5 15.75"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
      </svg>
    ),
  },
];

// Super admin UI (BACKLOG.md), a third standalone sidebar shell alongside
// admin/neighborhood/[neighborhoodSlug]/layout.tsx and
// admin/business/[venueId]/layout.tsx -- reached by picking "Super admin
// mode" from AdminSwitcher's "Platform" group rather than a neighborhood or
// venue, since this scope is global (no slug/id to resolve). Gated
// client-side on AppUser.is_super_admin here; every route this shell's
// pages call is independently gated by superAdminGate server-side.
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: "loading" });
  const [newFeedbackCount, setNewFeedbackCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user: AppUser | null = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "signed_out" });
        return;
      }
      if (!user.is_super_admin) {
        setState({ status: "forbidden" });
        return;
      }
      setState({ status: "ready", user });

      const token = await getAccessToken();
      fetch(clientApiUrl("/admin/feedback"), { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((submissions: FeedbackSubmissionAdminView[] | null) => {
          if (!cancelled && submissions) {
            setNewFeedbackCount(submissions.filter((s) => s.state === "new").length);
          }
        });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <MushroomLoader size={88} />
      </div>
    );
  }

  if (state.status !== "ready") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 font-sans sm:p-16">
        <a href="/admin" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
          ← Admin
        </a>
        {state.status === "signed_out" && (
          <p className="text-sm text-muted">
            <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
              Log in
            </a>{" "}
            with a super admin account to view this.
          </p>
        )}
        {state.status === "forbidden" && (
          <p className="text-sm text-red-600 dark:text-red-400">This account isn&apos;t a super admin.</p>
        )}
      </div>
    );
  }

  const { user } = state;

  async function handleLogOut() {
    await logOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard reload: logOut() only clears the Supabase session + one cached-user variable, not every mounted component's own local state, so a client-side router.push() here could leave stale "still logged in" UI behind
    window.location.href = "/";
  }

  const shellTabs: AdminShellTab[] = TABS.map((tab) => {
    const href = `/admin/super${tab.href}`;
    // Sub-routes should keep their parent tab highlighted -- exact-match
    // only for Overview, whose own href is a strict prefix of every other
    // tab's (mirrors the neighborhood/business shells).
    const active = tab.href === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    const badge =
      tab.key === "feedback" && !!newFeedbackCount ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[11px] font-extrabold text-on-accent">
          {newFeedbackCount}
        </span>
      ) : undefined;
    return { key: tab.key, href, label: tab.label, icon: tab.icon, active, badge };
  });

  return (
    <AdminShell
      switcherCurrent={{ kind: "super", id: "platform", label: "Super admin", sublabel: "All neighborhoods & businesses" }}
      user={user}
      tabs={shellTabs}
      onLogOut={handleLogOut}
    >
      {children}
    </AdminShell>
  );
}
