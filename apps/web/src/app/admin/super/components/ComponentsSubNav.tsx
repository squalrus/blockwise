"use client";

import { usePathname } from "next/navigation";

const GROUPS: { label: string | null; items: { key: string; label: string }[] }[] = [
  { label: null, items: [{ key: "", label: "Overview" }] },
  {
    label: "Summary cards",
    items: [
      { key: "/profile-card", label: "User" },
      { key: "/location-card", label: "Location" },
      { key: "/neighborhood-card", label: "Neighborhood" },
    ],
  },
  {
    label: "Components",
    items: [
      { key: "/collection-card", label: "Collection card" },
      { key: "/place-list-item", label: "Venue row" },
      { key: "/event-list-item", label: "Event row" },
    ],
  },
  {
    label: "Lists & sections",
    items: [
      { key: "/badges-section", label: "Badges" },
      { key: "/challenges-section", label: "Challenges" },
      { key: "/top-caps", label: "Top Caps" },
      { key: "/activity-feed", label: "Activity feed" },
    ],
  },
  {
    label: "Entities",
    items: [
      { key: "/entities/neighborhood", label: "Neighborhood" },
      { key: "/entities/business", label: "Business" },
      { key: "/entities/poi", label: "Point of interest" },
      { key: "/entities/user", label: "User" },
      { key: "/entities/event", label: "Event" },
    ],
  },
];

// Sub-nav for the component library (see layout.tsx) -- each component
// section is its own route (dedicated URL, linkable/bookmarkable) rather than
// in-page tab state. Grouped into Summary cards (ProfileSummaryCard/
// LocationSummaryCard/NeighborhoodSummaryCard side by side, since they're the
// same shape of component applied to three different entities), Components
// (a single reusable card/row in isolation, every visual state side by
// side), Lists & sections (composed list/section components with their own
// empty/paginated states, mostly from the public profile page), and Entities
// (the other groups organized by *component*; this one regroups the same
// pieces by *entity* -- every representation of one thing, e.g. a
// neighborhood, gathered on a single page).
export function ComponentsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-4">
      {GROUPS.map((group, groupIndex) => (
        <div key={group.label ?? `group-${groupIndex}`} className="flex flex-col gap-0.5">
          {group.label && (
            <div className="px-2.5 pb-2 font-mono text-[10px] tracking-wide text-muted/80 uppercase">{group.label}</div>
          )}
          {group.items.map((tab) => {
            const href = `/admin/super/components${tab.key}`;
            const isActive = pathname === href;
            return (
              <a
                key={tab.key}
                href={href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-extrabold ${
                  isActive ? "bg-card-alt text-foreground" : "text-muted hover:bg-card-alt/60"
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
