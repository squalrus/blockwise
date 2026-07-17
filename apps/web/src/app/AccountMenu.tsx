"use client";

import { useEffect, useRef, useState } from "react";
import type { AppUser, NeighborhoodMembership } from "@blockwise/types";
import { Avatar } from "./Avatar";

// Shared account pill + dropdown: the pill itself is the menu trigger (no
// separate hamburger button) -- clicking it opens the same account/settings/
// log-out menu that used to live behind AccountNav's hamburger icon. Theme
// switching lives on /account/settings rather than here.
// Used both by the main site nav (AccountNav.tsx) and the standalone
// neighborhood-admin/business-admin sidebar shells
// (admin/neighborhood/[slug]/layout.tsx, admin/business/[venueId]/layout.tsx),
// which have their own chrome and previously had no account menu at all --
// just a plain link to /account with no way to reach Settings or Log out
// without leaving the admin shell.
export function AccountMenu({
  user,
  homeNeighborhood,
  showAdminLink,
  tag,
  onLogOut,
}: {
  user: AppUser;
  homeNeighborhood?: NeighborhoodMembership | null;
  showAdminLink?: boolean;
  tag?: string;
  onLogOut: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-full bg-card-alt py-1 pr-3 pl-1 text-foreground hover:bg-card"
      >
        <Avatar
          avatarUrl={user.avatar_url}
          avatarStyle={user.avatar_style}
          mushroomCustomization={user.mushroom_customization}
          seed={user.id}
          label={user.display_name ?? "My account"}
          size={22}
        />
        <span className="text-[13px] font-extrabold">{user.display_name ?? "Account"}</span>
        {tag && <span className="font-mono text-[10px] text-muted">{tag}</span>}
        <svg width="10" height="6" viewBox="0 0 10 6" className="shrink-0 text-muted" aria-hidden="true">
          <path d="M1 1 L5 5 L9 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-card py-2 text-foreground shadow-lg">
          {homeNeighborhood && (
            <a
              href={`/neighborhoods/${homeNeighborhood.slug}`}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-card-alt"
            >
              {homeNeighborhood.name}
            </a>
          )}
          <a href="/account" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-sm hover:bg-card-alt">
            My account
          </a>
          <a
            href="/account/settings"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-card-alt"
          >
            Settings
          </a>
          {showAdminLink && (
            <a href="/admin" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-sm hover:bg-card-alt">
              Admin
            </a>
          )}
          <a
            href="/changelog"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-card-alt"
          >
            What&apos;s new
          </a>

          <div className="my-2 border-t border-border" />
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onLogOut();
            }}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-card-alt"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
