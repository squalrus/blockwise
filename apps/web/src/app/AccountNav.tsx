"use client";

import { useEffect, useRef, useState } from "react";
import type { AppUser, NeighborhoodMembership } from "@blockwise/types";
import { getAccessToken, getCurrentUser, logOut } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MushroomLogo } from "@blockwise/ui";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; user: AppUser; homeNeighborhood: NeighborhoodMembership | null };

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function CheckinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function AccountNav() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "signed_out" });
        return;
      }

      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/neighborhoods"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      const neighborhoods: NeighborhoodMembership[] = res.ok ? await res.json() : [];
      setState({
        status: "signed_in",
        user,
        homeNeighborhood: neighborhoods.find((n) => n.is_primary) ?? null,
      });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  async function handleLogOut() {
    await logOut();
    setState({ status: "signed_out" });
  }

  return (
    <nav className="relative flex items-center gap-4 bg-nav px-6 py-3 text-sm">
      <a
        href={state.status === "signed_in" && state.homeNeighborhood ? `/neighborhoods/${state.homeNeighborhood.slug}` : "/"}
        className="flex items-center gap-2 font-heading font-extrabold text-nav-foreground"
      >
        <MushroomLogo size={22} capColor="var(--brand-orange)" stemClassName="text-nav-foreground" />
        Spored
      </a>

      <div className="ml-auto flex items-center gap-2" ref={menuRef}>
        {state.status === "signed_in" && (
          <a
            href="/checkin"
            className="flex items-center gap-2 rounded-full bg-card-alt py-1 pr-3.5 pl-1 text-foreground hover:bg-card"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand-orange text-white">
              <CheckinIcon />
            </span>
            <span className="text-[13px] font-extrabold">Check In</span>
          </a>
        )}

        {state.status === "signed_in" && (
          <AccountMenu
            user={state.user}
            homeNeighborhood={state.homeNeighborhood}
            showAdminLink={state.user.account_type === "business" || state.user.is_neighborhood_admin}
            onLogOut={handleLogOut}
          />
        )}

        {state.status === "signed_out" && (
          <>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-label="Menu"
              className="flex items-center justify-center rounded-md p-1 text-nav-foreground hover:text-nav-muted"
            >
              <HamburgerIcon open={isMenuOpen} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-6 top-full z-10 mt-2 w-56 rounded-lg border border-border bg-card py-2 text-foreground shadow-lg">
                <a href="/login" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 hover:bg-card-alt">
                  Log in
                </a>
                <a href="/signup" onClick={() => setIsMenuOpen(false)} className="block px-4 py-2 hover:bg-card-alt">
                  Sign up
                </a>

                <div className="my-2 border-t border-border" />

                <div className="flex items-center justify-between gap-3 px-4 py-1.5">
                  <span className="text-xs font-extrabold tracking-wide text-muted uppercase">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
