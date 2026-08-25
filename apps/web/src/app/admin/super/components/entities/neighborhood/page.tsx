"use client";

import { MushroomLogo } from "@blockwise/ui";
import { EntityTile, EntityTypeChip } from "../../../../../EntityTile";
import { NeighborhoodCard } from "../../../../../neighborhoods/NeighborhoodsSection";
import { NeighborhoodSummaryCard } from "../../../../../neighborhoods/[slug]/NeighborhoodSummaryCard";
import { CollectionCard } from "../../../../../account/(tabs)/collection/page";
import { TopCapsSection } from "../../../../../profile/[username]/TopCapsSection";
import { COLLECTION_ENTRIES, ENTITY_NEIGHBORHOOD_SUMMARIES, NEIGHBORHOOD_CARDS } from "../../demoData";

const SPECIES_ENTRIES = COLLECTION_ENTRIES.filter((e) => e.style === "Neighborhood");

// Entity-first view of "neighborhood" (BACKLOG.md) -- every place the entity
// shows up as a UI element, gathered on one page instead of scattered across
// the Summary cards/Components/Lists & sections pages above, which are
// organized by *component* rather than by *entity*. business/poi/user/event
// each have their own sibling page under entities/ following this same
// shape.
export default function EntityNeighborhoodPage() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Neighborhood</h1>
        <p className="mt-1 text-sm text-muted">
          Every representation of a neighborhood across the app, side by side.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Identity tile</p>
        <p className="text-xs text-muted">
          EntityTile + EntityTypeChip -- the header mark on the summary card below, and the corner mark
          CollectionCard reuses on the collected-species card further down.
        </p>
        <div className="flex items-center gap-5">
          <EntityTile kind="neighborhood">
            <MushroomLogo size={38} shape="enoki" capColor="var(--brand-green)" stemClassName="text-muted-strong" />
          </EntityTile>
          <span className="relative h-9 w-9 rounded-full bg-card-alt">
            <EntityTypeChip kind="neighborhood" size={24} positionClassName="right-0 bottom-0" />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">List row</p>
        <p className="text-xs text-muted">NeighborhoodCard, as rendered on /neighborhoods.</p>
        <ul className="flex max-w-md flex-col gap-2">
          {ENTITY_NEIGHBORHOOD_SUMMARIES.map(({ neighborhood }) => (
            <NeighborhoodCard
              key={neighborhood.id}
              neighborhood={neighborhood}
              signedIn
              pending={false}
              onToggle={() => {}}
            />
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Summary card</p>
        <p className="text-xs text-muted">
          NeighborhoodSummaryCard, as rendered on /neighborhoods/[slug]. Every state lives under Summary cards →
          Neighborhood.
        </p>
        <NeighborhoodSummaryCard neighborhood={NEIGHBORHOOD_CARDS[0].neighborhood} />
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Collected species</p>
        <p className="text-xs text-muted">
          CollectionCard, as rendered on /account&apos;s collection tab once a neighborhood has been &quot;collected.&quot;
          Every quantity/name variant lives under Components → Collection card.
        </p>
        <div className="grid max-w-md grid-cols-3 gap-4">
          {SPECIES_ENTRIES.map(({ label, entry }) => (
            <div key={entry.id} className="flex flex-col gap-2">
              <p className="text-[10px] text-muted">{label}</p>
              <CollectionCard entry={entry} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Top Caps rank row</p>
        <p className="text-xs text-muted">TopCapsSection&apos;s neighborhood-kind row, as rendered on /profile/[username].</p>
        <div className="max-w-md">
          <TopCapsSection
            topCaps={[
              {
                kind: "neighborhood",
                id: "demo-sample-neighborhood",
                slug: "greenwood-sample",
                name: "Greenwood",
                rank: 1,
                visit_count: 22,
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
