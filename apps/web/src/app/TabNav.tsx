"use client";

import Link from "next/link";

export interface TabNavItem {
  key: string;
  label: string;
  // Optional pill/count shown after the label (BACKLOG.md Ref 98's Collection
  // tab unrevealed-count), mirroring AdminShellTab.badge in AdminShell.tsx --
  // absent for every other tab today, so most callers never set this.
  badge?: React.ReactNode;
}

// Shared secondary-nav tab bar (BACKLOG.md Ref 44/47, underline style since
// the Ref 101 redesign): a route-driven subnav, one page per tab (Account,
// Neighborhood, and Location profile pages all follow this shape -- each
// tab is its own route, `getHref` builds its URL) rather than in-page tab
// state. Horizontally scrollable (never wraps a narrow screen) and sticky
// right under the main nav, so the tab bar -- and the ability to switch
// sections -- stays reachable while scrolling a long section on mobile
// instead of scrolling out of reach with the rest of the page.
export function TabNav({
  items,
  activeKey,
  getHref,
}: {
  items: TabNavItem[];
  activeKey: string;
  getHref: (key: string) => string;
}) {
  return (
    <nav className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto border-b-2 border-border bg-background px-4 pb-0.5 text-sm sm:-mx-16 sm:px-16">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={getHref(item.key)}
            scroll={false}
            className={`flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-2.5 font-extrabold whitespace-nowrap ${
              active ? "border-brand-orange text-foreground" : "border-transparent text-muted"
            }`}
          >
            {item.label}
            {item.badge}
          </Link>
        );
      })}
    </nav>
  );
}
