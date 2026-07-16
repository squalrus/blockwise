"use client";

import Link from "next/link";

export interface TabNavItem {
  key: string;
  label: string;
}

// Shared secondary-nav pill bar (BACKLOG.md Ref 44/47): used both for a
// route-driven subnav (neighborhood profile's Today/Recent
// activity/etc., each tab its own page) and for in-page tab state (account
// page's Favorites/Check-ins/etc., one page swapping which section is
// visible) -- pass `getHref` for the former, `onSelect` for the latter.
// Horizontally scrollable (never wraps a narrow screen) and sticky right
// under the main nav, so the tab bar -- and the ability to switch sections
// -- stays reachable while scrolling a long section on mobile instead of
// scrolling out of reach with the rest of the page.
export function TabNav({
  items,
  activeKey,
  getHref,
  onSelect,
}: {
  items: TabNavItem[];
  activeKey: string;
  getHref?: (key: string) => string;
  onSelect?: (key: string) => void;
}) {
  return (
    <nav className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-background px-4 py-2 text-sm sm:-mx-16 sm:px-16">
      {items.map((item) => {
        const active = item.key === activeKey;
        const className = `shrink-0 rounded-full px-4 py-2 font-extrabold whitespace-nowrap ${
          active ? "bg-foreground text-on-accent" : "bg-card-alt text-muted"
        }`;

        if (getHref) {
          return (
            <Link key={item.key} href={getHref(item.key)} scroll={false} className={className}>
              {item.label}
            </Link>
          );
        }

        return (
          <button key={item.key} type="button" onClick={() => onSelect?.(item.key)} className={className}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
