"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { key: "", label: "Profile card" },
  { key: "/neighborhood-card", label: "Neighborhood card" },
  { key: "/location-card", label: "Location card" },
  { key: "/place-list-item", label: "Venue row" },
];

// Left sidebar nav matching the admin area layout style -- each component
// section is its own route (dedicated URL, linkable/bookmarkable) rather than
// in-page tab state.
export function DevComponentsTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {TABS.map((tab) => {
        const href = `/dev/components${tab.key}`;
        const isActive = pathname === href;
        return (
          <a
            key={tab.key}
            href={href}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-extrabold ${
              isActive ? "bg-card text-foreground" : "text-nav-muted hover:bg-nav-foreground/8"
            }`}
          >
            <span>{tab.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
