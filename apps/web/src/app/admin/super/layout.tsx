"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { AppUser, FeedbackSubmissionAdminView } from "@blockwise/types";
import { getAccessToken, getCurrentUser, logOut } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MushroomLoader, MushroomLogo } from "@blockwise/ui";
import { AccountMenu } from "../../AccountMenu";
import { AdminSwitcher } from "../../AdminSwitcher";
import packageJson from "../../../../package.json";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "forbidden" }
  | { status: "ready"; user: AppUser };

type TabKey = "overview" | "users" | "category-taxonomy" | "feedback";

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

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    window.location.href = "/";
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* ================= SIDEBAR ================= */}
      <div className="flex w-64 shrink-0 flex-col bg-nav px-3.5 pt-4.5 pb-4 text-nav-foreground">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <MushroomLogo size={26} capColor="var(--brand-orange)" stemClassName="text-nav-foreground" />
          <span className="font-heading text-xl font-extrabold text-nav-foreground">Spored</span>
          <span className="ml-auto rounded-full bg-nav-foreground/10 px-2 py-0.75 font-mono text-[10px] text-nav-muted">
            admin
          </span>
        </div>

        <AdminSwitcher current={{ kind: "super", id: "platform", label: "Super admin", sublabel: "All neighborhoods & businesses" }} user={user} />

        <div className="px-2.5 pb-2 font-mono text-[10px] tracking-wide text-nav-muted/80 uppercase">Manage</div>

        <nav className="flex flex-col gap-0.5">
          {TABS.map((tab) => {
            const href = `/admin/super${tab.href}`;
            // Sub-routes should keep their parent tab highlighted -- exact-
            // match only for Overview, whose own href is a strict prefix of
            // every other tab's (mirrors the neighborhood/business shells).
            const isActive = tab.href === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <a
                key={tab.key}
                href={href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-extrabold ${
                  isActive ? "bg-card text-foreground" : "text-nav-muted hover:bg-nav-foreground/8"
                }`}
              >
                <tab.icon className="shrink-0" />
                <span>{tab.label}</span>
                {tab.key === "feedback" && !!newFeedbackCount && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[11px] font-extrabold text-on-accent">
                    {newFeedbackCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="flex-1" />

        <a href="/changelog" className="block px-3 pt-2 font-mono text-[10px] text-nav-muted/60 hover:text-nav-muted">
          Spored v{packageJson.version} · BETA
        </a>
      </div>

      {/* ================= WORKSPACE ================= */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1460px] flex-col px-9 pt-5.5 pb-18">
          <div className="mb-5.5 flex items-center gap-3.5">
            <div className="flex-1" />
            <AccountMenu user={user} tag="admin" onLogOut={handleLogOut} />
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
