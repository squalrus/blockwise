import Link from "next/link";

const SECTIONS: { label: string; items: { href: string; label: string; description: string }[] }[] = [
  {
    label: "Summary cards",
    items: [
      {
        href: "/admin/super/components/profile-card",
        label: "User",
        description: "ProfileSummaryCard states, as rendered on /account.",
      },
      {
        href: "/admin/super/components/location-card",
        label: "Location",
        description: "LocationSummaryCard states (business + POI), as rendered on /location/[id].",
      },
      {
        href: "/admin/super/components/neighborhood-card",
        label: "Neighborhood",
        description: "NeighborhoodSummaryCard states, as rendered on /neighborhoods/[slug].",
      },
    ],
  },
  {
    label: "Components",
    items: [
      {
        href: "/admin/super/components/collection-card",
        label: "Collection card",
        description: "CollectionCard states, as rendered on /account's collection tab.",
      },
      {
        href: "/admin/super/components/place-list-item",
        label: "Venue row",
        description: "PlaceListItem + check-in slider states, as rendered on /checkin.",
      },
      {
        href: "/admin/super/components/event-list-item",
        label: "Event row",
        description: "EventListItem + FollowEventButton states, as rendered on /location/[id]/events.",
      },
    ],
  },
  {
    label: "Lists & sections",
    items: [
      {
        href: "/admin/super/components/badges-section",
        label: "Badges",
        description: "BadgesSection states, as rendered on /profile/[username].",
      },
      {
        href: "/admin/super/components/challenges-section",
        label: "Challenges",
        description: "ChallengesSection states, as rendered on /profile/[username].",
      },
      {
        href: "/admin/super/components/top-caps",
        label: "Top Caps",
        description: "TopCapsSection states, as rendered on /profile/[username].",
      },
      {
        href: "/admin/super/components/activity-feed",
        label: "Activity feed",
        description: "ActivityFeed states, as rendered on /location/[id], /neighborhoods/[slug], and /account.",
      },
    ],
  },
  {
    label: "Entities",
    items: [
      {
        href: "/admin/super/components/entities/neighborhood",
        label: "Neighborhood",
        description: "Every representation of a neighborhood -- identity tile, list row, summary card, collected species, Top Caps row -- gathered on one page.",
      },
      {
        href: "/admin/super/components/entities/business",
        label: "Business",
        description: "Every representation of a claimed business location -- identity tile, list row, summary card, collected species, Top Caps row -- gathered on one page.",
      },
      {
        href: "/admin/super/components/entities/poi",
        label: "Point of interest",
        description: "Every representation of a POI -- identity tile, list row, summary card, collected species, Top Caps row -- gathered on one page.",
      },
      {
        href: "/admin/super/components/entities/user",
        label: "User",
        description: "Every representation of a user -- avatar, nav chip, summary card, Top Caps badge cluster, collected species, activity feed mention -- gathered on one page.",
      },
      {
        href: "/admin/super/components/entities/event",
        label: "Event",
        description: "Every representation of an event -- admin and public list rows, activity feed mention -- gathered on one page.",
      },
    ],
  },
];

// Root of the component library (see layout.tsx) -- an index rather than a
// demo of its own, so a specific section doesn't have to be reached by
// guessing at the sub-nav. Mirrors the sub-nav's own Summary cards/Components/
// Lists & sections/Entities grouping.
export default function ComponentsOverviewPage() {
  return (
    <section className="flex flex-col gap-8">
      <p className="text-sm text-muted">Pins components to specific states for review without a live backend.</p>

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
