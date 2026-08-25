import { MushroomLogo } from "@blockwise/ui";
import { EntityTile, EntityTypeChip } from "../../../../../EntityTile";
import { PlaceListItem, pinColorFor, shapeFor } from "../../../../../PlaceListItem";
import { LocationSummaryCard } from "../../../../../location/[id]/LocationSummaryCard";
import { CollectionCard } from "../../../../../account/(tabs)/collection/page";
import { TopCapsSection } from "../../../../../profile/[username]/TopCapsSection";
import { COLLECTION_ENTRIES, LOCATION_CARDS } from "../../demoData";

const POI_LOCATION = LOCATION_CARDS[2].location;
const SPECIES_ENTRIES = COLLECTION_ENTRIES.filter((e) => e.style === "Checkin -- point of interest");

// Entity-first view of "point of interest" -- see
// entities/neighborhood/page.tsx for the pattern this follows.
export default function EntityPoiPage() {
  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Point of interest</h1>
        <p className="mt-1 text-sm text-muted">Every representation of a POI (an unclaimable landmark) across the app, side by side.</p>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Identity tile</p>
        <p className="text-xs text-muted">
          EntityTile + EntityTypeChip -- the header mark on the summary card below, and the corner mark
          CollectionCard reuses on the collected-species card further down. Same shapeFor/pinColorFor mark as its
          list row below, just wrapped in the purple POI ring instead of business&apos;s amber one.
        </p>
        <div className="flex items-center gap-5">
          <EntityTile kind="poi">
            <MushroomLogo
              size={38}
              shape={shapeFor(POI_LOCATION.id)}
              capColor={pinColorFor(POI_LOCATION.id)}
              stemClassName="text-muted-strong"
            />
          </EntityTile>
          <span className="relative h-9 w-9 rounded-full bg-card-alt">
            <EntityTypeChip kind="poi" size={24} positionClassName="right-0 bottom-0" />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">List row</p>
        <p className="text-xs text-muted">
          PlaceListItem, as rendered on /checkin and every neighborhood POIs tab. Not tinted by kind (unlike the
          identity tile) -- every venue/POI list in the app renders through this one row.
        </p>
        <div className="max-w-md">
          <PlaceListItem
            href={`/location/${POI_LOCATION.id}`}
            id={POI_LOCATION.id}
            name={POI_LOCATION.name}
            subtitle={POI_LOCATION.description ?? POI_LOCATION.address ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Summary card</p>
        <p className="text-xs text-muted">
          LocationSummaryCard, as rendered on /location/[id]. Every state (business + POI) lives under Summary
          cards → Location.
        </p>
        <LocationSummaryCard location={POI_LOCATION} />
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-extrabold tracking-wide text-muted uppercase">Collected species</p>
        <p className="text-xs text-muted">
          CollectionCard, as rendered on /account&apos;s collection tab once a POI has been checked into. Every
          quantity/name variant lives under Components → Collection card.
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
        <p className="text-xs text-muted">
          TopCapsSection&apos;s venue-kind row, as rendered on /profile/[username]. ProfileTopCap doesn&apos;t carry a
          business/POI distinction -- this reads identically on the business entity page.
        </p>
        <div className="max-w-md">
          <TopCapsSection
            topCaps={[{ kind: "venue", id: POI_LOCATION.id, name: POI_LOCATION.name, rank: 2, visit_count: 9 }]}
          />
        </div>
      </div>
    </section>
  );
}
