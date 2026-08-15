import Link from "next/link";

const SECTIONS: { label: string; items: { href: string; label: string; description: string }[] }[] = [
  {
    label: "Components",
    items: [
      {
        href: "/dev/components/profile-card",
        label: "Profile card",
        description: "ProfileSummaryCard states, as rendered on /account.",
      },
      {
        href: "/dev/components/neighborhood-card",
        label: "Neighborhood card",
        description: "NeighborhoodSummaryCard states, as rendered on /neighborhoods/[slug].",
      },
      {
        href: "/dev/components/location-card",
        label: "Location card",
        description: "LocationSummaryCard states (business + POI), as rendered on /location/[id].",
      },
      {
        href: "/dev/components/place-list-item",
        label: "Venue row",
        description: "PlaceListItem + check-in slider states, as rendered on /checkin.",
      },
    ],
  },
  {
    label: "Sample pages",
    items: [
      {
        href: "/dev/components/location-page",
        label: "Location page",
        description: "A full sample business location page, as rendered on /location/[id].",
      },
      {
        href: "/dev/components/poi-page",
        label: "POI page",
        description: "A full sample point-of-interest page, as rendered on /location/[id].",
      },
      {
        href: "/dev/components/neighborhood-page",
        label: "Neighborhood page",
        description: "A full sample neighborhood profile page, as rendered on /neighborhoods/[slug].",
      },
      {
        href: "/dev/components/profile-page",
        label: "Profile page",
        description: "A full sample user profile page, as rendered on /profile/[username].",
      },
    ],
  },
];

// Root of the component library (see layout.tsx) -- an index rather than a
// demo of its own, so a specific section doesn't have to be reached by
// guessing at the sidebar. Mirrors the sidebar's own Components/Sample pages
// grouping.
export default function DevComponentsOverviewPage() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted">
          Internal reference only -- not linked from any nav. Pins components and full sample pages to specific
          states for review without a live backend.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.label} className="flex flex-col gap-2.5">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">{section.label}</h2>
          <div className="flex flex-col gap-2">
            {section.items.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl bg-card-alt px-4 py-3.5 hover:bg-card">
                <p className="text-sm font-extrabold text-foreground">{item.label}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
