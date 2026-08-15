"use client";

import { usePathname } from "next/navigation";

const GROUPS: { label: string | null; items: { key: string; label: string }[] }[] = [
  { label: null, items: [{ key: "", label: "Overview" }] },
  {
    label: "Components",
    items: [
      { key: "/profile-card", label: "Profile card" },
      { key: "/neighborhood-card", label: "Neighborhood card" },
      { key: "/location-card", label: "Location card" },
      { key: "/place-list-item", label: "Venue row" },
    ],
  },
  {
    label: "Sample pages",
    items: [
      { key: "/location-page", label: "Location page" },
      { key: "/poi-page", label: "POI page" },
      { key: "/neighborhood-page", label: "Neighborhood page" },
      { key: "/profile-page", label: "Profile page" },
    ],
  },
];

// Left sidebar nav matching the admin area layout style -- each component
// section is its own route (dedicated URL, linkable/bookmarkable) rather than
// in-page tab state. Grouped into Components (a single reusable card/row in
// isolation, every visual state side by side) vs. Sample pages (a full page
// composed of those same components, one realistic state) so the two kinds
// of review aren't mixed in one flat list.
export function DevComponentsTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {GROUPS.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`} className="flex flex-col gap-0.5">
          {group.label && (
            <div className="px-2.5 pb-2 font-mono text-[10px] tracking-wide text-nav-muted/80 uppercase">
              {group.label}
            </div>
          )}
          {group.items.map((tab) => {
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
        </div>
      ))}
    </nav>
  );
}
