"use client";

import { useState } from "react";
import type { AppUser } from "@blockwise/types";
import { MushroomLogo } from "@blockwise/ui";
import { AccountMenu } from "../AccountMenu";
import { AdminSwitcher, type AdminSwitcherCurrent } from "../AdminSwitcher";
import packageJson from "../../../package.json";

export interface AdminShellTab {
  key: string;
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
  active: boolean;
  badge?: React.ReactNode;
}

interface AdminShellProps {
  switcherCurrent: AdminSwitcherCurrent;
  user: AppUser;
  tabs: AdminShellTab[];
  viewPublicHref?: string;
  onLogOut: () => void;
  children: React.ReactNode;
}

// Shared sidebar shell for the three standalone admin surfaces
// (admin/neighborhood/[neighborhoodSlug]/layout.tsx, admin/business/[venueId]/layout.tsx,
// admin/super/layout.tsx) -- extracted from what used to be near-identical
// copies of this same markup in each layout, as part of making the admin
// menu collapse into an off-canvas flyout on mobile (BACKLOG.md Ref 103)
// rather than fixing the same responsive behavior in three places.
//
// Below the md breakpoint the sidebar is a fixed-position off-canvas panel
// hidden by default (translate-x-full) and toggled by a hamburger button in
// the workspace header; at md and above it reverts to the original static
// w-64 layout regardless of toggle state.
export function AdminShell({ switcherCurrent, user, tabs, viewPublicHref, onLogOut, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-y-auto bg-nav px-3.5 pt-4.5 pb-4 text-nav-foreground transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <MushroomLogo size={26} capColor="var(--brand-orange)" stemClassName="text-nav-foreground" />
          <span className="font-heading text-xl font-extrabold text-nav-foreground">Spored</span>
          <span className="ml-auto rounded-full bg-nav-foreground/10 px-2 py-0.75 font-mono text-[10px] text-nav-muted">
            admin
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-nav-muted hover:bg-nav-foreground/8 md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 4 L16 16 M16 4 L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <AdminSwitcher current={switcherCurrent} user={user} />

        <div className="px-2.5 pb-2 font-mono text-[10px] tracking-wide text-nav-muted/80 uppercase">Manage</div>

        <nav className="flex flex-col gap-0.5">
          {tabs.map((tab) => (
            <a
              key={tab.key}
              href={tab.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-extrabold ${
                tab.active ? "bg-card text-foreground" : "text-nav-muted hover:bg-nav-foreground/8"
              }`}
            >
              <tab.icon className="shrink-0" />
              <span>{tab.label}</span>
              {tab.badge}
            </a>
          ))}
        </nav>

        <div className="flex-1" />

        {viewPublicHref && (
          <a
            href={viewPublicHref}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-bold text-nav-muted hover:bg-nav-foreground/8"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M8 4 L4 4 Q3 4 3 5 L3 16 Q3 17 4 17 L15 17 Q16 17 16 16 L16 12"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M11 3 L17 3 L17 9"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M17 3 L9.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            View public page
          </a>
        )}
        <a href="/changelog" className="block px-3 pt-2 font-mono text-[10px] text-nav-muted/60 hover:text-nav-muted">
          Spored v{packageJson.version} · BETA
        </a>
      </div>

      {/* ================= WORKSPACE ================= */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1460px] flex-col px-4 pt-4 pb-14 sm:px-6 md:px-9 md:pt-5.5 md:pb-18">
          <div className="mb-5.5 flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-card md:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2.5 5 L17.5 5 M2.5 10 L17.5 10 M2.5 15 L17.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="flex-1" />
            <AccountMenu user={user} tag="admin" onLogOut={onLogOut} />
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
